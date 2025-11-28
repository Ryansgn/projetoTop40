const DEV = import.meta.env && import.meta.env.DEV;

const API_BASE = DEV
  ? '' // Vite proxy
  : 'https://projetotop40.free.nf/public';
 
/* =======================
   HELPERS
   ======================= */
function buildURL(path, params = {}) {
  // garante que sempre começamos com / e aplicamos API_BASE
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE || '';
  const sp = new URLSearchParams(params);

  // anti-cache para dev/PWA
  if (!sp.has('t')) sp.set('t', Date.now());

  const query = sp.toString() ? `?${sp.toString()}` : '';

  // quando API_BASE é absoluto (https://...), monta URL completa
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}${p}${query}`;
  }

  // quando API_BASE é vazio (dev), usamos rota relativa e o proxy cuida
  return `${p}${query}`;
}

// Helper: faz fetch e tenta parsear JSON sem quebrar
async function fetchJSON(url, init = {}) {
  const r = await fetch(url, {
    cache: 'no-store',
    headers: { ...(init.headers || {}) },
    ...init,
  });
  const text = await r.text().catch(() => null);
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { r, text, data };
}

// Normaliza e-mails para evitar duplicidade por caixa/espaço
function sanitizeEmail(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s || null;
}

/* =======================
   AUTH
   ======================= */
export async function login(email, senha) {
  const url = buildURL('/api/login');

  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });

  // Se HTTP não OK ou backend devolveu ok:false
  if (!r.ok || data?.ok === false) {
    return {
      ok: false,
      httpStatus: r.status,
      error: data?.error || 'http_error',
      message: data?.message || text || 'Erro HTTP'
    };
  }

  // Esperado: { ok:true, id, nome, role }
  return data ?? {
    ok: false,
    error: 'invalid_json',
    message: 'Resposta não é JSON'
  };
}


/* =======================
   ALUNO - Criação
   ======================= */
// =======================
// ALUNO - Criação
// =======================
export async function createAluno(payload) {
  const url = buildURL('/api/alunos');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    // 🔎 Detecta erro de e-mail duplicado mesmo quando vem como SQL cru
    const raw = (data?.message || text || '').toString();
    const isDup = /duplicate\s+entry|1062|uq[_-]?aluno[_-]?email/i.test(raw);

    return {
      ok: false,
      httpStatus: r.status,
      error: isDup ? 'email_dup' : (data?.error || 'http_error'),
      // mensagem amigável para o formulário
      message: isDup
        ? 'Este e-mail já está cadastrado no sistema.'
        : (data?.message || raw || 'Erro HTTP'),
      fields: data?.fields
    };
  }

  return data ?? { ok:false, error:'invalid_json', message:'Resposta não é JSON' };
}


export async function createInfoSaude(payload) {
  const url = buildURL('/api/alunos/saude');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    return {
      ok: false,
      httpStatus: r.status,
      error: data?.error || 'http_error',
      message: data?.message || text || 'Erro HTTP'
    };
  }
  return data ?? { ok:false, error:'invalid_json', message:'Resposta não é JSON' };
}

/* =======================
   ALUNO - Stats / Listagem
   ======================= */
export async function getAlunoStats() {
  const url = buildURL('/api/alunos/stats');
  const { r, text, data } = await fetchJSON(url);
  if (!r.ok) {
    return { ok:false, httpStatus:r.status, message: data?.message || text || 'Erro HTTP' };
  }
  return data ?? { ok:false, message:'Resposta não é JSON' };
}

// Filtros: q (texto), by (nome|cpf|telefone|rg), mode (starts|contains)
export async function listAlunos(q = "", by = "nome", mode = "starts") {
  const url = buildURL('/api/alunos', { q, by, mode });
  const { r, text, data } = await fetchJSON(url);

  if (!r.ok || data?.ok === false) {
    throw new Error(data?.message || text || 'Falha ao listar alunos');
  }
  return data; // { ok:true, items:[...], count:n }
}

/* =======================
   ALUNO - Leitura / Perfil
   ======================= */
export async function getAlunoPerfil(idAluno) {
  const url = buildURL('/api/alunos', { id: String(idAluno) });
  const { r, data, text } = await fetchJSON(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!r.ok) throw new Error(data?.error || text || `GET /api/alunos falhou: ${r.status}`);
  return data;
}

export async function getAlunoById(id) {
  const url = buildURL('/api/alunos', { id: String(id) });
  const { r, text, data } = await fetchJSON(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!r.ok) {
    return { ok:false, httpStatus:r.status, error:data?.error||'http_error', message:data?.message||text||'Erro HTTP' };
  }
  return data ?? { ok:false, error:'invalid_json', message:'Resposta não é JSON' };
}

/* =======================
   ALUNO - Update (Pessoais)
   ======================= */
export async function updateAlunoPersonal(id, payload) {
  const url = buildURL('/api/alunos');

  // normaliza o e-mail, se vier
  const norm = {
    action: 'update_personal',
    id,
    ...payload,
    ...(payload.email != null ? { email: sanitizeEmail(payload.email) } : {})
  };

  const { r, text, data } = await fetchJSON(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(norm),
  });

  if (!r.ok) {
    const err = data?.error || 'http_error';
    const isDup = r.status === 409 && (err === 'email_dup' || /email/i.test(data?.message || ''));
    return { 
      ok:false, 
      httpStatus:r.status, 
      error: isDup ? 'email_dup' : err, 
      message: isDup ? 'E-mail já cadastrado.' : (data?.message||text||'Erro HTTP') 
    };
  }
  return data ?? { ok:false, error:'invalid_json', message:'Resposta não é JSON' };
}

/* =======================
   AGENDAMENTOS
   ======================= */
export async function getSlots(date, alunoId, turno) {
  const url = buildURL('/api/agendamento', {
    date,
    alunoId,
    turno, // MANHA | TARDE | NOITE
  });
  const { r, data, text } = await fetchJSON(url, { credentials: 'include' });
  if (!r.ok) throw new Error(data?.message || text || 'Erro ao buscar slots');
  return data;
}

export async function reservarAgendamento({ alunoId, date, slot, tipoTreino }) {
  const url = buildURL('/api/agendamento');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action:'reservar', alunoId, date, slot, tipoTreino })
  });
  if (!r.ok) return { ok:false, httpStatus:r.status, error:data?.error || 'http_error', message:data?.message || text };
  return data;
}

export async function cancelarAgendamento({ idReserva, alunoId }) {
  const url = buildURL('/api/agendamento');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action:'cancelar', idReserva, alunoId })
  });
  if (!r.ok) return { ok:false, httpStatus:r.status, error:data?.error || 'http_error', message:data?.message || text };
  return data;
}

/* =======================
   ENDEREÇO (GET/PUT)
   ======================= */
export async function getAlunoEndereco(id) {
  const url = buildURL('/api/alunos', { id: String(id) });
  const { r, text, data } = await fetchJSON(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!r.ok) return { ok:false, httpStatus:r.status, message: data?.message || text || 'Erro HTTP' };
  return data; // espera { ok:true, endereco: {...}, ... }
}

export async function updateAlunoEndereco(id, payload) {
  const url = buildURL('/api/alunos');
  const { r, text, data } = await fetchJSON(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_address',
      id,
      ...payload, // { UF, CEP, Logradouro, Numero, Bairro }
    }),
  });
  if (!r.ok) {
    return { ok:false, httpStatus:r.status, error:data?.error||'http_error', message:data?.message||text||'Erro HTTP' };
  }
  return data ?? { ok:false, error:'invalid_json', message:'Resposta não é JSON' };
}

/* =======================
   CEP LOOKUP (BrasilAPI)
   ======================= */
export async function fetchCepInfo(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return { ok: false, error: 'invalid_cep' };

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data?.message || 'cep_not_found', data };
    }

    // Campos padrão da BrasilAPI v2
    return {
      ok: true,
      cep: data.cep,
      uf: data.state || '',
      cidade: data.city || '',
      bairro: data.neighborhood || '',
      logradouro: data.street || '',
      raw: data,
    };
  } catch (e) {
    return { ok: false, error: 'network_error', message: String(e) };
  }
}


/* =======================
   SAÚDE (PUT completo em /api/alunos/saude)
   ======================= */
export async function updateAlunoSaude(idAluno, payload) {
  const norm = {
    idAluno,
    Peso_Alu:       payload.Peso_Alu ?? payload.peso ?? null,
    Altura_Alu:     payload.Altura_Alu ?? payload.altura ?? null,
    Restricoes_Alu: payload.Restricoes_Alu ?? payload.restricoes ?? null,
    Objetivo_Alu:   payload.Objetivo_Alu ?? payload.objetivo ?? null,
    Cirurgia_Alu:   payload.Cirurgia_Alu,
    Cirurgia_Desc:  payload.Cirurgia_Desc,
    Pressao_Alu:    payload.Pressao_Alu,
    Pressao_Desc:   payload.Pressao_Desc,
    Cardio_Alu:     payload.Cardio_Alu,
    Cardio_Desc:    payload.Cardio_Desc,
    Remedio_Alu:    payload.Remedio_Alu,
    Remedio_Desc:   payload.Remedio_Desc,
  };

  const url = buildURL('/api/alunos/saude');
  const { r, text, data } = await fetchJSON(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(norm),
  });

  if (!r.ok) {
    return { ok:false, httpStatus:r.status, error:data?.error||'http_error', message:data?.message||text||'Erro HTTP' };
  }
  return data ?? { ok:false, error:'invalid_json', message:'Resposta não é JSON' };
}

/* =======================
   TREINOS (com planos nomeados)
   ======================= */
export async function listExerciciosCatalogo(q = '', tipo = '') {
  const url = buildURL('/api/treinos', { catalogo:'1', q, tipo });
  const { r, text, data } = await fetchJSON(url);
  if (!r.ok) throw new Error(data?.message || 'http_error');
  return data ?? { ok:false, items:[] };
}

export async function listPlanosDoAluno(alunoId, tipo = '') {
  const url = buildURL('/api/treinos', { listar:'1', alunoId:String(alunoId), tipo });
  const { r, text, data } = await fetchJSON(url);
  if (!r.ok) throw new Error(data?.message || 'http_error');
  return data ?? { ok:false, plans:[] };
}

export async function getPlanoDoAluno(alunoId, tipo, planoId = null) {
  const params = { alunoId: String(alunoId), tipo };
  if (planoId) params.planoId = String(planoId);
  const url = buildURL('/api/treinos', params);
  const { r, text, data } = await fetchJSON(url);
  if (!r.ok) {
    console.error("Erro getPlanoDoAluno", r.status, text);
    return { ok: false, error: data?.error || 'http_error', message: data?.message || text };
  }
  return data ?? { ok: false, error: 'invalid_json', message: 'Resposta não é JSON' };
}


export async function createPlano(alunoId, tipo, nome) {
  const url = buildURL('/api/treinos');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action:'create_plan', alunoId, tipo, nome })
  });
  if (!r.ok) throw new Error(data?.message || 'http_error');
  return data;
}

export async function renamePlano(planoId, nome) {
  const url = buildURL('/api/treinos');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action:'rename_plan', planoId, nome })
  });
  if (!r.ok) throw new Error(data?.message || 'http_error');
  return data;
}

export async function addExercicioAoPlano({ alunoId, tipo, planoId, exercicioId }) {
  const url = buildURL('/api/treinos');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action:'add', alunoId, tipo, planoId, exercicioId })
  });
  if (!r.ok) throw new Error(data?.message || 'http_error');
  return data;
}

export async function updateExercicioDoPlano({ alunoId, tipo, planoId, exercicioId, series, repeticoes }) {
  const url = buildURL('/api/treinos');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action:'update', alunoId, tipo, planoId, exercicioId, series, repeticoes })
  });
  if (!r.ok) throw new Error(data?.message || 'http_error');
  return data;
}

export async function removeExercicioDoPlano({ alunoId, tipo, planoId, exercicioId }) {
  const url = buildURL('/api/treinos');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action:'remove', alunoId, tipo, planoId, exercicioId })
  });
  if (!r.ok) throw new Error(data?.message || 'http_error');
  return data;
}

// ==== TREINOS: PRÉVIAS PARA CARDS (último plano de cada aluno) ====
export async function listTreinoPreviews() {
  const url = buildURL('/api/treinos', { previews:'1' });
  const { r, text, data } = await fetchJSON(url);
  if (!r.ok) throw new Error(data?.message || 'http_error');
  return data ?? { ok:false, data:[] };
}

/* =======================
   FICHA DE TREINO (ALUNO)
   ======================= */
export async function getAlunoPlanosTreino(idAluno) {
  const url = buildURL('/api/aluno_treino', { action:'planos', idAluno:String(idAluno) });
  const { r, data, text } = await fetchJSON(url);
  if (!r.ok) {
    return { ok:false, httpStatus:r.status, error:data?.error || 'http_error', message:data?.message || text || 'Erro HTTP' };
  }
  return data ?? { ok:false, error:'invalid_json' };
}

export async function getExerciciosDoPlano(idPlano) {
  const url = buildURL('/api/aluno_treino', { action:'exercicios', idPlano:String(idPlano) });
  const { r, data, text } = await fetchJSON(url);
  if (!r.ok) {
    return { ok:false, httpStatus:r.status, error:data?.error || 'http_error', message:data?.message || text || 'Erro HTTP' };
  }
  return data ?? { ok:false, error:'invalid_json' };
}

export async function updateCargaExercicio(idExercicio, carga) {
  const url = buildURL('/api/aluno_treino', { action: 'update_carga' });
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idExercicio, carga })
  });

  if (!r.ok) {
    return { ok: false, error: data?.error || text || 'Erro HTTP' };
  }
  return data ?? { ok: false, error: 'invalid_json' };
}

export async function toggleRestricao(idAluno) {
  // usa o mesmo builder das outras rotas e evita cache
  const url = buildURL('/api/restricao');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idAluno }),
  });
  if (!r.ok) return { ok:false, httpStatus:r.status, error: data?.error || text || 'http_error' };
  return data || { ok:false };
}

export async function uploadFotoAluno(idAluno, file) {
  const form = new FormData();
  form.append('idAluno', String(idAluno));
  form.append('foto', file);

  const url = buildURL('/api/upload_foto_aluno.php');

  const r = await fetch(url, {
    method: 'POST',
    body: form
  });

  const text = await r.text().catch(() => null);
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}

  if (!r.ok) {
    return { ok:false, httpStatus:r.status, error:data?.error || 'http_error', message:data?.message || text || 'Erro HTTP' };
  }
  return data || { ok:false, error:'invalid_json' };
}

/* =======================
   TREINOS - EXCLUIR PLANO (alinhado ao treinos.php)
   ======================= */
export async function deletePlano(planoId, alunoId, tipo) {
  const url = buildURL('/api/treinos');
  const { r, text, data } = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete_plan',
      planoId,
      alunoId,
      tipo, // 'SUPERIORES' | 'INFERIORES'
    }),
  });
  if (!r.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || text || 'http_error');
  }
  return data; // { ok: true, deleted: 1 }
}

export async function alterarSenha({ email, role = 'ALUNO', senhaAtual, novaSenha }) {
  const url = buildURL('/api/alterar_senha');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role, senhaAtual, novaSenha }),
  });

  // tenta ler o JSON mesmo em 4xx/5xx
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }

  if (!res.ok) {
    // padroniza objeto de erro para o componente tratar
    return { ok: false, status: res.status, ...(data || {}) };
  }
  // sucesso esperado: { ok: true, message: 'senha_alterada' }
  return data || { ok: true };
}

export async function updateAlunoCredenciais({ idAluno, email, senha }) {
  const payload = { idAluno };

  if (typeof email === "string") {
    payload.email = email.trim();
  }

  if (typeof senha === "string" && senha.trim() !== "") {
    payload.senha = senha.trim();
  }

  const url = buildURL('/api/aluno_update_credenciais.php');

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("Resposta inválida do servidor.");
  }

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || "Erro ao atualizar credenciais.");
  }

  return data;
}

export async function getAlunoSaude(idAluno) {
  const url = buildURL("/api/alunos", { id: idAluno });
  return fetchJSON(url);
}

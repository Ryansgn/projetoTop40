// src/pages/AdminMontarTreino.jsx 
import { useEffect, useMemo, useState } from "react";
import {
  listAlunos,
  listExerciciosCatalogo,
  listPlanosDoAluno,
  getPlanoDoAluno,
  createPlano,
  renamePlano,
  addExercicioAoPlano,
  updateExercicioDoPlano,
  removeExercicioDoPlano,
  listTreinoPreviews,
  deletePlano,
  getAlunoSaude, // novo
} from "../api";

import "../styles/admin/index.css";
import "../styles/admin/montar-treino.css";

const BY_LABEL = { nome: "Nome", cpf: "CPF", telefone: "Telefone", rg: "RG" };
const AUTO_RETURN_AFTER_CREATE = false;
const MAX_PREVIEW_EX = 4; // quantos exercícios mostrar no preview do catálogo

// normaliza string para comparação: tudo minúsculo e sem acento
const normalize = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// grupos de exercícios para filtro
const TIPOS_EX_SUP = [
  { value: "peito", label: "Peito" },
  { value: "costas", label: "Costas" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "ombros", label: "Ombros" },
];

const TIPOS_EX_INF = [
  { value: "quadriceps", label: "Quadríceps" },
  { value: "posterior", label: "Posterior de coxa" },
  { value: "gluteos", label: "Glúteos" },
  { value: "panturrilha", label: "Panturrilha" },
];

// 🔹 palavras-chave que cada filtro deve enxergar
const KEYWORDS_BY_FILTER = {
  peito: ["peito", "peitoral"],
  costas: ["costas", "dorso"],
  biceps: ["biceps", "bíceps"],
  triceps: ["triceps", "tríceps"],
  ombros: ["ombro", "ombros", "deltoide"],

  quadriceps: ["quadriceps", "quadríceps"],
  posterior: ["posterior", "posterior de coxa", "isquiotibiais"],
  gluteos: ["gluteo", "gluteos", "glúteo", "glúteos"],

  // tratamento especial pra panturrilha/gêmeos
  panturrilha: [
    "panturrilha",
    "panturrilhas",
    "gemeos",
    "gêmeos",
    "soleo",
    "sóleo",
    "gastrocnemio",
    "gastrocnêmio",
  ],
};

/* normaliza URL/rota de foto */
function photoURL(f) {
  if (!f) return null;
  const s = String(f);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return s.startsWith("/") ? s : `/${s}`;
}

export default function AdminMontarTreino({ onBack }) {
  // mensagens
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // controle de criação/remoção
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // prévias do último plano por aluno
  const [prevMap, setPrevMap] = useState({});
  const [loadingPrev, setLoadingPrev] = useState(true);

  // ===== Busca de aluno
  const [q, setQ] = useState("");
  const [by, setBy] = useState("nome");
  const [showFilter, setShowFilter] = useState(false);
  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  // Seleção
  const [aluno, setAluno] = useState(null);
  const alunoId = aluno?.Id_Aluno ?? aluno?.id ?? aluno?.idAluno;
  const alunoNome = aluno?.Nome_Alu ?? aluno?.nome ?? "Aluno";
  const fotoAlunoSelecionado = aluno
    ? photoURL(aluno.Foto_Alu ?? aluno.foto ?? aluno.fotoUrl)
    : null;

  // modal de informações pessoais / saúde
  const [showSaudeModal, setShowSaudeModal] = useState(false);
  const [saudeLoading, setSaudeLoading] = useState(false);
  const [saudeErro, setSaudeErro] = useState("");
  const [saudeDados, setSaudeDados] = useState(null);

  // Tabs tipo
  const [tipo, setTipo] = useState("SUPERIORES"); // SUPERIORES | INFERIORES

  // Catálogo
  const [qEx, setQEx] = useState("");
  const [catalogo, setCatalogo] = useState([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [showAllExercicios, setShowAllExercicios] = useState(false);

  // filtro por tipo de exercício (peito, costas, quadríceps, etc.)
  const [tipoExFiltro, setTipoExFiltro] = useState("todos");
  const [showExFilter, setShowExFilter] = useState(false);

  // Planos do aluno
  const [planos, setPlanos] = useState([]);
  const [planoId, setPlanoId] = useState(null);
  const [planoNome, setPlanoNome] = useState("");

  // controle “sujo” x “salvo”
  const [lastSavedNome, setLastSavedNome] = useState("");

  // Itens do plano ativo
  const [itens, setItens] = useState([]);
  const [loadingPlano, setLoadingPlano] = useState(false);

  // form de novo plano (botão +)
  const [showNewForm, setShowNewForm] = useState(false);

  // controla qual plano está “expandido” (null = mostra todos)
  const [expandedPlanId, setExpandedPlanId] = useState(null);

  // alterações locais
  const [dirtyMap, setDirtyMap] = useState({});
  function markDirty(exercicioId) {
    setDirtyMap((prev) => ({ ...prev, [exercicioId]: true }));
  }
  function clearDirty() {
    setDirtyMap({});
  }
  const hasDirty = Object.keys(dirtyMap).length > 0;

  // ===== Prévias para os cards
  async function loadPreviews() {
    setLoadingPrev(true);
    try {
      const resp = await listTreinoPreviews();
      const arr = Array.isArray(resp?.data) ? resp.data : [];
      const map = {};
      for (const p of arr) map[p.Id_Aluno] = p;
      setPrevMap(map);
    } finally {
      setLoadingPrev(false);
    }
  }
  useEffect(() => {
    loadPreviews();
    const h = () => loadPreviews();
    window.addEventListener("treinoCriado", h);
    return () => window.removeEventListener("treinoCriado", h);
  }, []);

  // Carrega alunos (debounce)
  useEffect(() => {
    if (aluno) return;
    let alive = true;
    const t = setTimeout(async () => {
      setLoadingAlunos(true);
      try {
        const data = await listAlunos(q, by);
        if (alive) setAlunos(data.items || []);
      } catch {
        if (alive) setAlunos([]);
      } finally {
        if (alive) setLoadingAlunos(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, by, aluno]);

  // Após escolher aluno/tipo
  useEffect(() => {
    if (!alunoId) return;
    (async () => {
      await refreshPlanos();
      await refreshCatalogo();
      setPlanoId(null);
      setPlanoNome("");
      setLastSavedNome("");
      setItens([]);
      clearDirty();
      setShowNewForm(false);
      setExpandedPlanId(null); // reset listagem
      setShowAllExercicios(false); // volta pro preview curto do catálogo
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunoId, tipo]);

  // sempre que trocar SUPERIORES <-> INFERIORES, reseta o filtro de tipo
  useEffect(() => {
    setTipoExFiltro("todos");
  }, [tipo]);

  // sempre que trocar o tipo de filtro (Peito, Costas, Panturrilha...), volta pro preview curto
  useEffect(() => {
    setShowAllExercicios(false);
  }, [tipoExFiltro]);

  // Catálogo
  async function refreshCatalogo() {
    setLoadingCat(true);
    try {
      const d = await listExerciciosCatalogo(qEx, tipo);
      setCatalogo(d.items || []);
    } finally {
      setLoadingCat(false);
    }
  }
  useEffect(() => {
    if (!alunoId) return;
    const t = setTimeout(refreshCatalogo, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qEx]);

  // Listar planos do aluno
  async function refreshPlanos() {
    const d = await listPlanosDoAluno(alunoId, tipo);
    setPlanos(d.plans || []);
  }

  // Carregar um plano específico
  async function loadPlano(targetPlanoId = null) {
    setLoadingPlano(true);
    try {
      const d = await getPlanoDoAluno(alunoId, tipo, targetPlanoId || null);
      setPlanoId(d.planoId);
      setPlanoNome(d.nomePlano || "");
      setLastSavedNome(d.nomePlano || "");
      setItens(d.items || []);
      clearDirty();
      await refreshPlanos();
      setShowNewForm(false);
      setExpandedPlanId(targetPlanoId || d.planoId);
    } finally {
      setLoadingPlano(false);
    }
  }

  // Criar novo plano (via botão +)
  async function handleCreatePlano() {
    setOkMsg("");
    const nomeTrim = (planoNome || "").trim();
    if (!nomeTrim) {
      setErrMsg("Informe o nome do plano.");
      return;
    }
    setCreating(true);
    try {
      const d = await createPlano(alunoId, tipo, nomeTrim);
      await loadPlano(d.planoId);
      await refreshPlanos();
      window.dispatchEvent(new Event("treinoCriado"));
      setOkMsg("Plano criado com sucesso!");
      setLastSavedNome(nomeTrim);
      if (AUTO_RETURN_AFTER_CREATE) {
        setAluno(null);
        setItens([]);
        setPlanoId(null);
        setPlanoNome("");
        setLastSavedNome("");
        clearDirty();
      }
    } catch (e) {
      setErrMsg(e?.message || "Erro ao criar plano");
    } finally {
      setCreating(false);
    }
  }

  // Renomear plano
  async function handleRenamePlano() {
    const nome = (planoNome || "").trim();
    if (!nome || !planoId) return;
    await renamePlano(planoId, nome);
    await refreshPlanos();
    setLastSavedNome(nome);
    setOkMsg("Nome atualizado!");
    setTimeout(() => setOkMsg(""), 1500);
  }

  // Excluir plano atual
  async function handleDeletePlano() {
    if (!planoId) return;
    await handleDeletePlanoById(planoId, lastSavedNome || planoNome || "este plano");
  }

  // ABRIR modal de informações pessoais / saúde
// ABRIR modal de informações pessoais / saúde
async function handleOpenSaudeModal() {
  if (!alunoId) return;

  setShowSaudeModal(true);
  setSaudeLoading(true);
  setSaudeErro("");
  setSaudeDados(null);

  try {
    const raw = await getAlunoSaude(alunoId);

    // raw pode ser:
    // - { data, r, text } (se você usou fetchJSON direto)
    // - ou já o JSON do PHP ({ ok, aluno, endereco, saude })
    const payload = raw?.data ?? raw;

    if (!payload || payload.ok === false) {
      throw new Error(payload?.message || "Erro ao carregar informações.");
    }

    const saude = payload.saude ?? payload.Saude ?? null;
    setSaudeDados(saude || {});
  } catch (err) {
    console.error(err);
    setSaudeErro("Não foi possível carregar as informações de saúde do aluno.");
  } finally {
    setSaudeLoading(false);
  }
}


  // FECHAR modal
  function handleCloseSaudeModal() {
    setShowSaudeModal(false);
  }

  // Excluir por ID (botão no card)
  async function handleDeletePlanoById(id, nome) {
    const ok = window.confirm(
      `Tem certeza que deseja excluir "${nome}"? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;
    setDeleting(true);
    setErrMsg("");
    setOkMsg("");
    try {
      await deletePlano(id, alunoId, tipo);
      if (planoId === id) {
        setPlanoId(null);
        setPlanoNome("");
        setLastSavedNome("");
        setItens([]);
        clearDirty();
      }
      await refreshPlanos();
      await loadPreviews();
      setOkMsg("Plano excluído.");
      if (expandedPlanId === id) setExpandedPlanId(null);
    } catch (e) {
      setErrMsg(e?.message || "Erro ao excluir plano");
    } finally {
      setDeleting(false);
    }
  }

  // Ações itens
  const addEx = async (exCat) => {
    if (!planoId) return;
    await addExercicioAoPlano({ alunoId, tipo, planoId, exercicioId: exCat.ID_Exercicios });
    await loadPlano(planoId);
  };
  const upd = async (exRow, patch) => {
    if (!planoId) return;
    const series = patch.Series ?? exRow.Series ?? 0;
    const repeticoes = patch.Repeticoes ?? exRow.Repeticoes ?? 0;
    await updateExercicioDoPlano({
      alunoId,
      tipo,
      planoId,
      exercicioId: exRow.ID_Exercicios,
      series,
      repeticoes,
    });
    await loadPlano(planoId);
  };
  const rm = async (exRow) => {
    if (!planoId) return;
    await removeExercicioDoPlano({ alunoId, tipo, planoId, exercicioId: exRow.ID_Exercicios });
    await loadPlano(planoId);
  };

  const trimmed = (s) => (s || "").trim();
  const isNew = !planoId;
  const nameChanged = trimmed(planoNome) !== trimmed(lastSavedNome);
  const canShowSave =
    (isNew && trimmed(planoNome).length > 0) || (!isNew && nameChanged);
  const canEditPlan = Boolean(planoId);

  // lista de tipos conforme aba atual
  const tiposEx = tipo === "SUPERIORES" ? TIPOS_EX_SUP : TIPOS_EX_INF;

  // catálogo filtrado pelo tipo (peito, costas, quadríceps etc.)
  const catalogoFiltrado = useMemo(() => {
    // quando o filtro é "todos", não filtra nada, devolve a lista inteira
    if (tipoExFiltro === "todos") return catalogo;

    // pega as palavras-chave configuradas pro filtro atual
    const keywords = (KEYWORDS_BY_FILTER[tipoExFiltro] || [tipoExFiltro]).map(
      normalize
    );

    return catalogo.filter((ex) => {
      const objetivo = normalize(ex.Objetivo_Exe);
      const tipoCampo = normalize(ex.Tipo_Exe || ex.Grupo_Exe);
      const nome = normalize(ex.Nome_Exe);

      const haystack = `${objetivo} ${tipoCampo} ${nome}`;

      // se QUALQUER palavra-chave estiver contida, aceita
      return keywords.some((kw) => haystack.includes(kw));
    });
  }, [catalogo, tipoExFiltro]);

  // decide o que realmente aparece na tela (máx. 4 se não clicou em "Ver mais")
  const listaVisivelCatalogo = useMemo(() => {
    // Sem filtro: comportamento antigo
    if (tipoExFiltro === "todos") {
      return showAllExercicios
        ? catalogoFiltrado
        : catalogoFiltrado.slice(0, MAX_PREVIEW_EX);
    }

    // Com filtro (Peito, Costas, Panturrilha...):
    // - se o resultado tiver até 4, mostra tudo
    // - se tiver mais de 4, aplica o "Ver mais / Ver menos"
    if (!showAllExercicios && catalogoFiltrado.length > MAX_PREVIEW_EX) {
      return catalogoFiltrado.slice(0, MAX_PREVIEW_EX);
    }

    return catalogoFiltrado;
  }, [catalogoFiltrado, showAllExercicios, tipoExFiltro]);

  // ===== NOVO: comportamento da seta de voltar =====
  function handleBackClick() {
    // Se houver aluno selecionado, apenas volta para a lista de alunos
    if (aluno) {
      setAluno(null);
      setPlanos([]);
      setPlanoId(null);
      setPlanoNome("");
      setLastSavedNome("");
      setItens([]);
      clearDirty();
      setShowNewForm(false);
      setExpandedPlanId(null);
      setTipo("SUPERIORES"); // opcional: reseta o tipo também
      return;
    }

    // Se não tiver aluno selecionado, volta para a home do admin
    if (onBack) {
      onBack();
    }
  }

  return (
    <section className="adm-alunos mtreino">
      {/* HEADER */}
      <header className="adm-alunos-header mt-header">
        <button
          className="mt-back"
          onClick={handleBackClick}
          aria-label="Voltar"
          title="Voltar"
        >
          ←
        </button>
        <h2 className="mt-h2">MONTAR TREINO</h2>
        <div className="mt-flex-spacer" />
      </header>

      {/* mensagens globais */}
      {okMsg && <div className="mt-alert mt-alert--ok">{okMsg}</div>}
      {errMsg && <div className="mt-alert mt-alert--err">{errMsg}</div>}

      {/* === ESTADO 1: Buscar aluno === */}
      {!aluno && (
        <>
          <div className="adm-searchbar mt-searchbar">
            <div className="adm-search mt-search">
              <span className="by-chip">{BY_LABEL[by] ?? "Nome"}</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Pesquisar por ${BY_LABEL[by] ?? "Nome"}`}
              />
              <button aria-label="Buscar">🔍</button>
            </div>
            <div className="adm-filter">
              <button
                className="adm-filter-btn"
                onClick={() => setShowFilter(true)}
                aria-haspopup="dialog"
                aria-expanded={showFilter}
                title="Filtros"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="adm-alunos-list">
            {loadingAlunos && <p className="adm-loading">Carregando...</p>}
            {!loadingAlunos && alunos.length === 0 && (
              <p className="adm-empty">Nenhum aluno encontrado.</p>
            )}
            {!loadingAlunos &&
              alunos.map((a) => {
                const id = a.Id_Aluno ?? a.id ?? a.idAluno;
                const nome = a.Nome_Alu ?? a.nome ?? "Aluno";
                const cpf = a.CPF_Alu ?? a.cpf ?? "-";
                const data = a.DataNasc_Alu ?? a.DataNasc ?? null;
                const dt = data ? new Date(data).toLocaleDateString() : "-";
                const pv = prevMap[id];
                const foto =
                  photoURL(a.Foto_Alu ?? a.foto ?? a.fotoUrl) ||
                  "https://via.placeholder.com/80x80.png?text=Foto";

                return (
                  <div key={id} className="adm-aluno-card mt-aluno-card">
                    <img
                      src={foto}
                      alt={`Foto de ${nome}`}
                      className="adm-aluno-foto"
                    />
                    <div className="adm-aluno-info">
                      <h3 className="mt-h3-clean">{nome}</h3>
                      <p className="mt-p-tight">Data Nasc.: {dt}</p>
                      <p className="mt-p-tight">CPF: {cpf}</p>
                      {loadingPrev ? (
                        <div className="mt-muted">Carregando plano…</div>
                      ) : pv ? (
                        <div className="mt-prev">
                          <div className="mt-prev-cap">Último plano:</div>
                          <div className="mt-prev-name">{pv.Nome_Plano}</div>
                        </div>
                      ) : (
                        <div className="mt-muted">Sem plano recente</div>
                      )}
                    </div>
                    <div className="adm-aluno-acoes">
                      <button
                        className="btn-editar"
                        onClick={() => setAluno(a)}
                      >
                        Selecionar
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Modal de filtro (ALUNOS) */}
          {showFilter && (
            <div
              className="filter-modal-overlay"
              onClick={(e) => {
                if (e.target.classList.contains("filter-modal-overlay"))
                  setShowFilter(false);
              }}
            >
              <div
                className="filter-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="filtroTitulo"
              >
                <header className="filter-modal__header">
                  <h3 id="filtroTitulo">Filtro de busca</h3>
                  <button
                    className="filter-modal__close"
                    onClick={() => setShowFilter(false)}
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                </header>
                <div className="filter-modal__body">
                  <label className="filter-field">
                    <span>Campo</span>
                    <select
                      value={by}
                      onChange={(e) => {
                        setBy(e.target.value);
                        setShowFilter(false);
                      }}
                    >
                      <option value="nome">Nome</option>
                      <option value="cpf">CPF</option>
                      <option value="telefone">Telefone</option>
                      <option value="rg">RG</option>
                    </select>
                  </label>
                  <p className="filter-hint">
                    A busca usa sempre <strong>“contém”</strong>.
                  </p>
                </div>
                <footer className="filter-modal__footer">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowFilter(false)}
                  >
                    Fechar
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => setShowFilter(false)}
                  >
                    Aplicar
                  </button>
                </footer>
              </div>
            </div>
          )}
        </>
      )}

      {/* === ESTADO 2: Aluno selecionado === */}
      {aluno && (
        <>
          {/* Card do aluno + abas tipo */}
          <div className="mt-aluno-banner">
            <div className="mt-circle">
              {fotoAlunoSelecionado ? (
                <img
                  src={fotoAlunoSelecionado}
                  alt={`Foto de ${alunoNome}`}
                  className="mt-circle-img"
                />
              ) : (
                "🟢"
              )}
            </div>
            <div className="mt-flex1">
              <div className="mt-aluno-nome">{alunoNome}</div>
              <div className="mt-aluno-doc">
                CPF: {aluno.CPF_Alu ?? aluno.cpf ?? "-"}
              </div>
            </div>

            {/* pills tipo */}
            <div className="mt-pills">
              {/* SUPERIORES primeiro */}
              <button
                className={`btn-secondary mt-pill ${
                  tipo === "SUPERIORES" ? "is-active" : ""
                }`}
                onClick={() => setTipo("SUPERIORES")}
              >
                Superiores ▴
              </button>

              {/* INFERIORES depois */}
              <button
                className={`btn-secondary mt-pill ${
                  tipo === "INFERIORES" ? "is-active" : ""
                }`}
                onClick={() => setTipo("INFERIORES")}
              >
                Inferiores ▾
              </button>
            </div>
          </div>

          {/* LISTA DE PLANOS em cards */}
          <div className="mt-plan-list">
            {planos
              .filter(
                (p) => expandedPlanId == null || expandedPlanId === p.ID_Plano
              )
              .map((p) => (
                <div key={p.ID_Plano} className="mt-plan-card">
                  <div className="mt-plan-header">
                    <div className="mt-plan-name">
                      {p.Nome_Plano || "Sem nome"}{" "}
                    </div>
                    <button
                      className="btn-editar"
                      onClick={() => {
                        setExpandedPlanId(p.ID_Plano);
                        loadPlano(p.ID_Plano);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-restringir"
                      onClick={() =>
                        handleDeletePlanoById(
                          p.ID_Plano,
                          p.Nome_Plano || "este plano"
                        )
                      }
                      disabled={deleting}
                    >
                      {deleting ? "..." : "Remover"}
                    </button>
                  </div>

                  <div className="mt-plan-duration">
                    <div className="mt-plan-time">1h30min</div>
                    <div className="mt-plan-label">Duração</div>
                  </div>
                </div>
              ))}

            {/* Botão + Adicionar (novo plano) */}
            {expandedPlanId == null && (
              <div className="mt-add-wrapper">
                {!showNewForm ? (
                  <button
                    className="btn-editar mt-round"
                    onClick={() => {
                      setShowNewForm(true);
                      setPlanoId(null);
                      setPlanoNome("");
                      setLastSavedNome("");
                    }}
                  >
                    ＋ Adicionar
                  </button>
                ) : (
                  <div className="mt-new-form">
                    <div className="mt-new-title">Novo plano</div>
                    <div className="mt-new-row">
                      <input
                        value={planoNome}
                        onChange={(e) => setPlanoNome(e.target.value)}
                        placeholder="Nome do plano (ex.: Costas e bíceps)"
                        className="mt-input"
                      />
                      <button
                        className="btn-primary"
                        onClick={handleCreatePlano}
                        disabled={creating || !trimmed(planoNome)}
                      >
                        {creating ? "Criando..." : "Criar"}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setShowNewForm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* === ESTADO 3: Editando um plano (após clicar em Editar) === */}
          {expandedPlanId != null && canEditPlan && (
            <>
              {/* LINHA 1: nome do plano + excluir */}
              <div className="mt-edit-row1">
                <input
                  value={planoNome}
                  onChange={(e) => setPlanoNome(e.target.value)}
                  placeholder="Nome do plano"
                  className="mt-name-input"
                />
                {planoId && (
                  <>
                    <button
                      className="btn-primary"
                      onClick={handleRenamePlano}
                      disabled={!nameChanged}
                    >
                      Salvar nome
                    </button>

                    {/* NOVO BOTÃO: Informações pessoais */}
                    <button
                      type="button"
                      className="mt-btn-ghost"
                      onClick={handleOpenSaudeModal}
                    >
                      Informações pessoais
                    </button>

                    <button
                      className="btn-danger"
                      onClick={handleDeletePlano}
                      disabled={deleting}
                    >
                      {deleting ? "Excluindo..." : "Excluir plano"}
                    </button>
                  </>
                )}
              </div>

              {/* LINHA 2: BARRA DE PESQUISA + FILTRO (igual layout dos alunos) */}
              <div className="adm-searchbar mt-searchbar2">
                <div className="adm-search mt-search-wide">
                  <input
                    value={qEx}
                    onChange={(e) => setQEx(e.target.value)}
                    placeholder="Buscar exercício (ex.: Supino, Remada...)"
                  />
                  <button aria-label="Buscar">🔍</button>
                </div>
                <div className="adm-filter">
                  <button
                    className="adm-filter-btn"
                    onClick={() => setShowExFilter(true)}
                    aria-haspopup="dialog"
                    aria-expanded={showExFilter}
                    title="Filtrar por tipo"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal de filtro (EXERCÍCIOS) */}
              {showExFilter && (
                <div
                  className="filter-modal-overlay"
                  onClick={(e) => {
                    if (e.target.classList.contains("filter-modal-overlay"))
                      setShowExFilter(false);
                  }}
                >
                  <div
                    className="filter-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="filtroExTitulo"
                  >
                    <header className="filter-modal__header">
                      <h3 id="filtroExTitulo">Filtrar exercícios</h3>
                      <button
                        className="filter-modal__close"
                        onClick={() => setShowExFilter(false)}
                        aria-label="Fechar"
                      >
                        ×
                      </button>
                    </header>
                    <div className="filter-modal__body">
                      <label className="filter-field">
                        <span>Grupo muscular</span>
                        <select
                          value={tipoExFiltro}
                          onChange={(e) => setTipoExFiltro(e.target.value)}
                        >
                          <option value="todos">Todos</option>
                          {tiposEx.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="filter-hint">
                        Mostra apenas exercícios desse grupo.
                      </p>
                    </div>
                    <footer className="filter-modal__footer">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setTipoExFiltro("todos");
                          setShowExFilter(false);
                        }}
                      >
                        Limpar
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => setShowExFilter(false)}
                      >
                        Aplicar
                      </button>
                    </footer>
                  </div>
                </div>
              )}

              <div className="adm-a-cards mt-catalog">
                {loadingCat && (
                  <p className="adm-loading">Carregando exercícios...</p>
                )}
                {!loadingCat &&
                  listaVisivelCatalogo.map((ex) => {
                    const ja = itens.some((i) => i.Nome_Exe === ex.Nome_Exe);
                    return (
                      <div key={ex.ID_Exercicios} className="adm-a-card">
                        <div className="adm-a-left">
                          <div className="mt-ex-nome">{ex.Nome_Exe}</div>
                          <div className="adm-a-cap">
                            {ex.Objetivo_Exe || ""}
                          </div>
                        </div>
                        <div className="adm-a-right">
                          {!ja ? (
                            <button
                              className="btn-editar"
                              onClick={() => addEx(ex)}
                            >
                              ＋ Adicionar
                            </button>
                          ) : (
                            <span className="adm-a-badge">Adicionado</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Botões Ver mais / Ver menos */}
              {!loadingCat && catalogoFiltrado.length > MAX_PREVIEW_EX && (
                <div className="mt-ex-more">
                  {!showAllExercicios ? (
                    <button
                      type="button"
                      className="btn-primary mt-more-btn"
                      onClick={() => setShowAllExercicios(true)}
                    >
                      Ver mais exercícios
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary mt-more-btn"
                      onClick={() => {
                        setShowAllExercicios(false);
                        try {
                          document
                            .querySelector(".mt-catalog")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        } catch {}
                      }}
                    >
                      Ver menos
                    </button>
                  )}
                </div>
              )}

              {/* Adicionados — layout do protótipo */}
              <div className="adm-g-section mt-adc mt-added">
                <div className="adm-g-header">
                  <h4>Adicionados:</h4>
                </div>

                {loadingPlano && (
                  <p className="adm-loading">Carregando plano...</p>
                )}
                {!loadingPlano && itens.length === 0 && (
                  <p className="adm-empty">Nenhum exercício adicionado.</p>
                )}

                {!loadingPlano &&
                  itens.map((ex, idx) => (
                    <div key={ex.ID_Exercicios} className="mt-item-card">
                      {/* topo: nome + remover */}
                      <div className="mt-item-top">
                        <div className="mt-item-name">{ex.Nome_Exe}</div>
                        <button
                          className="btn-restringir"
                          onClick={() => rm(ex)}
                        >
                          <span className="mt-item-minus">–</span> Remover
                        </button>
                      </div>

                      {/* linha de métricas */}
                      <div className="mt-metrics">
                        {/* Séries */}
                        <div className="mt-metric">
                          <div className="mt-metric-value">
                            <input
                              type="number"
                              min="0"
                              value={ex.Series === 0 ? "" : ex.Series}
                              onChange={(e) => {
                                // remove zeros à esquerda
                                const raw = e.target.value.replace(
                                  /^0+(?=\d)/,
                                  ""
                                );
                                const nova = raw === "" ? 0 : Number(raw);
                                setItens((prev) =>
                                  prev.map((i, k) =>
                                    k === idx ? { ...i, Series: nova } : i
                                  )
                                );
                                markDirty(ex.ID_Exercicios);
                              }}
                              className="mt-metric-input"
                            />
                          </div>
                          <div className="mt-metric-label">
                            <span>Séries</span>
                            <span title="editar">✎</span>
                          </div>
                        </div>

                        {/* Repetições */}
                        <div className="mt-metric">
                          <div className="mt-metric-value">
                            <input
                              type="number"
                              min="0"
                              value={
                                ex.Repeticoes === 0 ? "" : ex.Repeticoes
                              }
                              onChange={(e) => {
                                const raw = e.target.value.replace(
                                  /^0+(?=\d)/,
                                  ""
                                );
                                const nova = raw === "" ? 0 : Number(raw);
                                setItens((prev) =>
                                  prev.map((i, k) =>
                                    k === idx
                                      ? { ...i, Repeticoes: nova }
                                      : i
                                  )
                                );
                                markDirty(ex.ID_Exercicios);
                              }}
                              className="mt-metric-input"
                            />
                          </div>
                          <div className="mt-metric-label">
                            <span>Repetições</span>
                            <span title="editar">✎</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Ações abaixo da lista */}
                <div className="mt-bottom-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!hasDirty}
                    onClick={async () => {
                      try {
                        setOkMsg("");
                        setErrMsg("");
                        for (const ex of itens) {
                          if (!dirtyMap[ex.ID_Exercicios]) continue;
                          await updateExercicioDoPlano({
                            alunoId,
                            tipo,
                            planoId,
                            exercicioId: ex.ID_Exercicios,
                            series: Number(ex.Series || 0),
                            repeticoes: Number(ex.Repeticoes || 0),
                          });
                        }
                        await refreshPlanos();
                        clearDirty();
                        setOkMsg("Alterações salvas!");
                        setTimeout(() => setOkMsg(""), 1500);

                        setExpandedPlanId(null);
                        setPlanoId(null);
                        setItens([]);
                      } catch (e) {
                        setErrMsg(
                          e?.message || "Erro ao salvar alterações"
                        );
                      }
                    }}
                  >
                    Salvar alterações
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* MODAL de informações pessoais / saúde */}
      {showSaudeModal && (
        <div className="mt-saude-overlay" onClick={handleCloseSaudeModal}>
          <div
            className="mt-saude-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-saude-header">
              <h3>Informações pessoais</h3>
              <span className="mt-saude-aluno-nome">{alunoNome}</span>
            </div>

            {saudeLoading && <p>Carregando informações...</p>}
            {saudeErro && <p className="mt-saude-erro">{saudeErro}</p>}

                          {saudeLoading && <p>Carregando informações...</p>}
            {saudeErro && <p className="mt-saude-erro">{saudeErro}</p>}

                       {!saudeLoading && !saudeErro && saudeDados && (
              <>
                {/* OBJETIVO EM DESTAQUE (FULL WIDTH) */}
                <div className="mt-saude-objetivo">
                  <span className="mt-saude-label">Objetivo principal</span>
                  <span className="mt-saude-value">
                    {saudeDados.Objetivo_Alu ?? "—"}
                  </span>
                </div>

                {/* GRADE 2x3 — 3 CAMPOS DE CADA LADO */}
                <div className="mt-saude-grid">
                  <div className="mt-saude-item">
                    <span className="mt-saude-label">Já fez cirurgias?</span>
                    <span className="mt-saude-value">
                      {saudeDados.Cirurgia_Alu ?? "—"}
                    </span>
                  </div>

                  <div className="mt-saude-item">
                    <span className="mt-saude-label">Possui pressão alta/baixa?</span>
                    <span className="mt-saude-value">
                      {saudeDados.Pressao_Desc ||
                        saudeDados.Pressao_Alu ||
                        "—"}
                    </span>
                  </div>

                  <div className="mt-saude-item">
                    <span className="mt-saude-label">Descrição da cirurgia</span>
                    <span className="mt-saude-value">
                      {saudeDados.Cirurgia_Desc ?? "—"}
                    </span>
                  </div>

                  {/* 🔹 DIABETES */}
                  <div className="mt-saude-item">
                    <span className="mt-saude-label">Possui diabetes?</span>
                    <span className="mt-saude-value">
                      {saudeDados.Diabetes_Desc ||
                        saudeDados.Diabetes_Alu ||
                        "—"}
                    </span>
                  </div>

                  <div className="mt-saude-item">
                    <span className="mt-saude-label">Problemas cardiovasculares?</span>
                    <span className="mt-saude-value">
                      {saudeDados.Cardio_Desc ||
                        saudeDados.Cardio_Alu ||
                        "—"}
                    </span>
                  </div>

                  <div className="mt-saude-item">
                    <span className="mt-saude-label">Toma remédio controlado?</span>
                    <span className="mt-saude-value">
                      {saudeDados.Remedio_Desc ||
                        saudeDados.Remedio_Alu ||
                        "—"}
                    </span>
                  </div>

                  {/* FULL WIDTH EMBAIXO */}
                  <div className="mt-saude-item mt-saude-item-full">
                    <span className="mt-saude-label">
                      Observações / Restrições
                    </span>
                    <span className="mt-saude-value">
                      {saudeDados.Restricoes_Alu ?? "—"}
                    </span>
                  </div>
                </div>
              </>
            )}


            <div className="mt-saude-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseSaudeModal}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

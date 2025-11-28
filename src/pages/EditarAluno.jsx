import { useEffect, useMemo, useState } from "react";
import {
  getAlunoById,
  getAlunoEndereco,       // fallback só para ENDEREÇO (se precisar)
  updateAlunoPersonal,
  updateAlunoEndereco,
  updateAlunoSaude,
} from "../api";
import "../styles/edicao.css";      // CSS separado

// util p/ pegar primeiro campo existente
const pick = (obj, keys, def = "") => {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return def;
};

export default function EditarAluno({ alunoId, onClose, onSaved }) {
  const [step, setStep] = useState(1); // 1-Pessoais | 2-Endereço | 3-Saúde | 4-Restrições
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // —— PESSOAIS
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [genero, setGenero] = useState("Não informar"); // sem “Selecione”
  const [dataNasc, setDataNasc] = useState("");

  // —— ENDEREÇO
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState(""); // NOVO
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("SP");

  // —— SAÚDE
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");

  // —— RESTRIÇÕES / OBSERVAÇÕES
  const [objetivo, setObjetivo] = useState(""); // opcional
  const [cirurgiasYN, setCirurgiasYN] = useState("NÃO");
  const [cirurgias, setCirurgias] = useState("");
  const [pressaoYN, setPressaoYN] = useState("NÃO");
  const [pressao, setPressao] = useState("");
  const [cardioYN, setCardioYN] = useState("NÃO");
  const [cardio, setCardio] = useState("");

  // ✅ NOVO: diabetes
  const [diabetesYN, setDiabetesYN] = useState("NÃO");
  const [diabetes, setDiabetes] = useState("");

  const [remedioYN, setRemedioYN] = useState("NÃO");
  const [remedio, setRemedio] = useState("");
  const [restricoes, setRestricoes] = useState(""); // observações livres

  // foto de exibição
  const [foto, setFoto] = useState("");
  function resolveFotoPath(path) {
    if (!path || typeof path !== "string" || !path.trim()) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const isDev = window.location.port === "5173";
    return (isDev ? "http://localhost/tcc_backend_min/public" : "") + path;
  }
  const fotoResolved = useMemo(() => resolveFotoPath(foto), [foto]);

  // carregar aluno + endereco + saude (lendo do TOPO da resposta)
  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      setErr("");
      try {
        const r = await getAlunoById(alunoId);
        if (!alive) return;

        // pode vir { ok, aluno, endereco, saude } ou { ok, data:{...} } ou afins
        const a = r?.aluno || r?.data?.aluno || r || {};

        // pessoais
        setNome(a.Nome_Alu ?? a.nome ?? "");
        setTel(a.Tel_Alu ?? a.telefone ?? a.tel ?? "");
        setEmail(a.Email_Alu ?? a.email ?? "");
        setCpf(a.CPF_Alu ?? a.cpf ?? "");
        setRg(a.RG_Alu ?? a.rg ?? "");
        setGenero((a.Genero_Alu ?? a.genero ?? "Não informar") || "Não informar");
        setDataNasc((a.DataNasc_Alu ?? a.DataNasc ?? "").slice(0, 10));

        // ENDEREÇO: primeiro do topo da resposta; se não vier, tenta dentro de 'a'; se não, fallback API
        let end = r?.endereco ?? a.endereco ?? a.Endereco ?? null;
        if (!end || (Object.keys(end).length === 0)) {
          try {
            const re = await getAlunoEndereco(alunoId);
            if (re?.ok && re.endereco) end = re.endereco;
          } catch {}
        }

        setCep(pick(end, ["CEP", "cep"], ""));
        setLogradouro(pick(end, ["Logradouro", "logradouro"], ""));
        setNumero(String(pick(end, ["Numero", "numero"], "")));
        setComplemento(pick(end, ["Complemento", "complemento"], "")); // NOVO
        setBairro(pick(end, ["Bairro", "bairro"], ""));
        setCidade(pick(end, ["Cidade", "cidade"], ""));
        setUf(pick(end, ["UF", "uf"], uf || "SP"));

        // SAÚDE: primeiro do topo; se não vier, tenta dentro de 'a'
        let sd = r?.saude ?? a.saude ?? a.Saude ?? null;
        sd = sd || {};
        setPeso(sd.Peso_Alu ?? sd.peso ?? "");
        setAltura(sd.Altura_Alu ?? sd.altura ?? "");
        setObjetivo(sd.Objetivo_Alu ?? sd.objetivo ?? "");

        setCirurgiasYN(((sd.Cirurgia_Alu ?? "NÃO") + "").toUpperCase() === "SIM" ? "SIM" : "NÃO");
        setCirurgias(sd.Cirurgia_Desc ?? "");

        setPressaoYN(((sd.Pressao_Alu ?? "NÃO") + "").toUpperCase() === "SIM" ? "SIM" : "NÃO");
        setPressao(sd.Pressao_Desc ?? "");

        setCardioYN(((sd.Cardio_Alu ?? "NÃO") + "").toUpperCase() === "SIM" ? "SIM" : "NÃO");
        setCardio(sd.Cardio_Desc ?? "");

        // ✅ carrega diabetes, se existir
        setDiabetesYN(((sd.Diabetes_Alu ?? "NÃO") + "").toUpperCase() === "SIM" ? "SIM" : "NÃO");
        setDiabetes(sd.Diabetes_Desc ?? "");

        setRemedioYN(((sd.Remedio_Alu ?? "NÃO") + "").toUpperCase() === "SIM" ? "SIM" : "NÃO");
        setRemedio(sd.Remedio_Desc ?? "");

        setRestricoes(sd.Restricoes_Alu ?? sd.restricoes ?? "");

        setFoto(a.Foto_Alu ?? a.foto ?? "");
      } catch (e) {
        setErr(String(e?.message || e) || "Falha ao carregar aluno");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [alunoId]);

  function toISO(d) {
    if (!d) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const m = d.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
  }

  async function salvar() {
    setBusy(true);
    setErr("");
    setOk("");

    try {
      // — PESSOAIS
      const p = await updateAlunoPersonal(alunoId, {
        nome,
        telefone: tel,
        cpf,
        rg,
        email,
        genero,
        dataNasc: toISO(dataNasc),
      });
      if (p?.ok === false) throw new Error(p.message || "Erro ao salvar dados pessoais");

      // — ENDEREÇO (Numero -> Number) + Complemento
      const e = await updateAlunoEndereco(alunoId, {
        CEP: cep,
        Logradouro: logradouro,
        Numero: Number(numero || 0),
        Complemento: complemento,        // NOVO
        Bairro: bairro,
        Cidade: cidade,
        UF: uf,
      });
      if (e?.ok === false) throw new Error(e.message || "Erro ao salvar endereço");

      // — SAÚDE + RESTRIÇÕES (+ DIABETES)
      const s = await updateAlunoSaude(alunoId, {
        Peso_Alu: String(peso || "").replace(",", "."),
        Altura_Alu: String(altura || "").replace(",", "."),
        Objetivo_Alu: objetivo || "",

        Cirurgia_Alu: cirurgiasYN,
        Cirurgia_Desc: cirurgiasYN === "SIM" ? (cirurgias || "") : "",

        Pressao_Alu: pressaoYN,
        Pressao_Desc: pressaoYN === "SIM" ? (pressao || "") : "",

        Cardio_Alu: cardioYN,
        Cardio_Desc: cardioYN === "SIM" ? (cardio || "") : "",

        // ✅ envia diabetes também
        Diabetes_Alu: diabetesYN,
        Diabetes_Desc: diabetesYN === "SIM" ? (diabetes || "") : "",

        Remedio_Alu: remedioYN,
        Remedio_Desc: remedioYN === "SIM" ? (remedio || "") : "",

        Restricoes_Alu: restricoes || "",
      });
      if (s?.ok === false) throw new Error(s.message || "Erro ao salvar saúde");

      setOk("Alterações salvas com sucesso!");
      onSaved?.();
      setTimeout(() => setOk(""), 1500);
    } catch (e) {
      setErr(String(e?.message || e) || "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  /* —————————— UI —————————— */
  return (
    <div className="ea4-escape">
      <div className="ea4">
        <header className="ea4-head">
          {/* você pode ter botões de fechar / voltar aqui se quiser */}
        </header>

        {/* avatar / nome */}
        <div className="ea4-id">
          <img
            className="ea4-avatar"
            src={fotoResolved || "/img/avatar-placeholder.svg"}
            alt="Foto do aluno"
            onError={(ev)=>{ev.currentTarget.src="/img/avatar-placeholder.svg"}}
          />
          <div className="ea4-name" title={nome}>{nome || "Aluno"}</div>
        </div>

        {/* CARD */}
        <div className="ea4-card">
          {/* —— STEP 1: PESSOAIS —— */}
          {step === 1 && (
            <div className="ea4-form">
              <label>Nome completo:</label>
              <input value={nome} onChange={(e)=>setNome(e.target.value)} />

              <label>Telefone:</label>
              <input value={tel} onChange={(e)=>setTel(e.target.value)} placeholder="(11) 99999-9999" />

              <label>E-mail:</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@exemplo.com" />

              <label>CPF:</label>
              <input value={cpf} onChange={(e)=>setCpf(e.target.value)} placeholder="000.000.000-00" />

              <label>Identidade (RG):</label>
              <input value={rg} onChange={(e)=>setRg(e.target.value)} placeholder="00.000.000-0" />

              <label>Gênero:</label>
              <select value={genero} onChange={(e)=>setGenero(e.target.value)}>
                <option>Masculino</option>
                <option>Feminino</option>
                <option>Não informar</option>
              </select>

              <label>Data de nascimento:</label>
              <input type="date" value={dataNasc} onChange={(e)=>setDataNasc(e.target.value)} />
            </div>
          )}

          {/* —— STEP 2: ENDEREÇO —— */}
          {step === 2 && (
            <div className="ea4-form">
              <label>CEP:</label>
              <input value={cep} onChange={(e)=>setCep(e.target.value)} placeholder="00000-000" />

              <label>Endereço (Logradouro):</label>
              <input value={logradouro} onChange={(e)=>setLogradouro(e.target.value)} placeholder="Rua / Avenida" />

              <label>Número:</label>
              <input type="number" value={numero} onChange={(e)=>setNumero(e.target.value)} placeholder="0" />

              <label>Complemento:</label>
              <input
                value={complemento}
                onChange={(e)=>setComplemento(e.target.value)}
                placeholder="Apto, bloco, casa, etc. (opcional)"
              />

              <label>Bairro:</label>
              <input value={bairro} onChange={(e)=>setBairro(e.target.value)} />

              <label>Cidade:</label>
              <input value={cidade} onChange={(e)=>setCidade(e.target.value)} />

              <label>Estado (UF):</label>
              <select value={uf} onChange={(e)=>setUf(e.target.value)}>
                {[
                  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
                ].map((u)=> <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {/* —— STEP 3: SAÚDE —— */}
          {step === 3 && (
            <div className="ea4-form">
              <label>Peso (kg):</label>
              <input value={peso} onChange={(e)=>setPeso(e.target.value)} placeholder="75,00" />

              <label>Altura (m):</label>
              <input value={altura} onChange={(e)=>setAltura(e.target.value)} placeholder="1,70" />
            </div>
          )}

          {/* —— STEP 4: RESTRIÇÕES —— */}
          {step === 4 && (
            <div className="ea4-form">
              <label>Objetivo:</label>
              <select value={objetivo} onChange={(e)=>setObjetivo(e.target.value)}>
                <option value="">—</option>
                <option>GANHAR MÚSCULOS</option>
                <option>PERDER PESO</option>
                <option>ESPORTES</option>
                <option>GANHAR FORÇA</option>
              </select>

              <label>Já fez cirurgias?</label>
              <select value={cirurgiasYN} onChange={(e)=>setCirurgiasYN(e.target.value)}>
                <option value="NÃO">Não</option>
                <option value="SIM">Sim</option>
              </select>
              {cirurgiasYN === "SIM" && (
                <>
                  <label>Descreva:</label>
                  <input value={cirurgias} onChange={(e)=>setCirurgias(e.target.value)} />
                </>
              )}

              <label>Possui pressão alta/baixa?</label>
              <select value={pressaoYN} onChange={(e)=>setPressaoYN(e.target.value)}>
                <option value="NÃO">Não</option>
                <option value="SIM">Sim</option>
              </select>
              {pressaoYN === "SIM" && (
                <>
                  <label>Descreva:</label>
                  <input value={pressao} onChange={(e)=>setPressao(e.target.value)} />
                </>
              )}

              <label>Problemas cardiovasculares?</label>
              <select value={cardioYN} onChange={(e)=>setCardioYN(e.target.value)}>
                <option value="NÃO">Não</option>
                <option value="SIM">Sim</option>
              </select>
              {cardioYN === "SIM" && (
                <>
                  <label>Descreva:</label>
                  <input value={cardio} onChange={(e)=>setCardio(e.target.value)} />
                </>
              )}

              {/* ✅ NOVO BLOCO: DIABETES */}
              <label>Possui diabetes?</label>
              <select value={diabetesYN} onChange={(e)=>setDiabetesYN(e.target.value)}>
                <option value="NÃO">Não</option>
                <option value="SIM">Sim</option>
              </select>
              {diabetesYN === "SIM" && (
                <>
                  <label>Descreva:</label>
                  <input
                    value={diabetes}
                    onChange={(e)=>setDiabetes(e.target.value)}
                    placeholder="Tipo, controle, uso de insulina etc."
                  />
                </>
              )}

              <label>Toma remédio controlado?</label>
              <select value={remedioYN} onChange={(e)=>setRemedioYN(e.target.value)}>
                <option value="NÃO">Não</option>
                <option value="SIM">Sim</option>
              </select>
              {remedioYN === "SIM" && (
                <>
                  <label>Qual?</label>
                  <input value={remedio} onChange={(e)=>setRemedio(e.target.value)} />
                </>
              )}

              <label>Observações / Restrições:</label>
              <input
                value={restricoes}
                onChange={(e)=>setRestricoes(e.target.value)}
                placeholder="—"
              />
            </div>
          )}

          {err && <p className="ea4-error">{err}</p>}
          {ok && <p className="ea4-ok">{ok}</p>}

          <div className="ea4-actions">
            {step > 1 ? (
              <button className="btn-secondary" onClick={()=>setStep(step-1)}>← Voltar</button>
            ) : (
              <button className="btn-secondary" onClick={onClose}>← Sair</button>
            )}
            {step < 4 ? (
              <button className="btn-primary" onClick={()=>setStep(step+1)}>Próximo →</button>
            ) : (
              <button className="btn-primary" onClick={salvar} disabled={busy}>
                {busy ? "Salvando..." : "Salvar alterações"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

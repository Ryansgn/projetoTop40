import { useEffect, useMemo, useState } from "react";
import { getAlunoPerfil, alterarSenha } from "../api";
import "../styles/aluno/index.css";

/* >>> helpers para foto/iniciais (iguais ao que você já tinha) */
function photoURL(f) {
  if (!f) return null;
  const s = String(f);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return s.startsWith("/") ? s : `/${s}`;
}
function Initials({ name, className = "aln-avatar initials" }) {
  const initials = (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return <div className={className}>{initials || "?"}</div>;
}

export default function AlunoPerfil({ user, onBack }) {
  const idAluno = user?.idAluno || user?.id || user?.aluno?.idAluno;

  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState(null);
  const [saude, setSaude] = useState(null);
  const [err, setErr] = useState("");

  // e-mail editável
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailOk, setEmailOk] = useState("");
  const [emailErr, setEmailErr] = useState("");

  // “página” de alterar senha
  const [changingPwd, setChangingPwd] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novaSenhaConfirm, setNovaSenhaConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdOk, setPwdOk] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  // helpers -------------------------------------------------
  const pick = (obj, keys) => {
    for (const k of keys) if (obj && obj[k] != null && obj[k] !== "") return obj[k];
    return undefined;
  };

  const normalizeSaude = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    return {
      Peso_Alu:       pick(raw, ["Peso_Alu", "peso", "Peso", "peso_alu", "pesoAlu"]),
      Altura_Alu:     pick(raw, ["Altura_Alu", "altura", "Altura", "altura_alu", "alturaAlu"]),
      Objetivo_Alu:   pick(raw, ["Objetivo_Alu", "objetivo", "Objetivo", "objetivo_alu", "objetivoAlu"]),
      Restricoes_Alu: pick(raw, ["Restricoes_Alu", "restricoes", "observacoes", "Observacoes"]),
    };
  };

  const fmt = {
    data: (iso) => {
      if (!iso) return "";
      const s = String(iso);
      const [y, m, d] = s.substring(0, 10).split("-");
      return y && m && d ? `${d}/${m}/${y}` : "";
    },
    peso: (n) =>
      n == null || n === "" ? "—" : `${Number(n).toFixed(2).replace(".", ",")} kg`,
    altura: (n) => {
      if (n == null || n === "") return "—";
      const v = Number(n);
      const m = v > 3 ? v / 100 : v; // aceita 172 ou 1.72
      return `${m.toFixed(2).replace(".", ",")} m`;
    },
    text: (v) => (v && String(v).trim() !== "" ? String(v) : "—"),
  };

  const imc = useMemo(() => {
    if (!saude) return null;
    const p = parseFloat(String(saude.Peso_Alu ?? "").replace(",", "."));
    let a = parseFloat(String(saude.Altura_Alu ?? "").replace(",", "."));
    if (!p || !a) return null;
    if (a > 3) a = a / 100;
    const v = p / (a * a);
    return isFinite(v) ? Math.round(v * 100) / 100 : null;
  }, [saude]);

  // load ----------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        if (!idAluno) {
          setErr("Sem ID do aluno.");
          return;
        }

        const res = await getAlunoPerfil(idAluno);
        if (!alive) return;

        if (!res?.ok) {
          setErr(res?.message || "Perfil não encontrado.");
          return;
        }

        setAluno(res.aluno || null);
        const rawSaude =
          res.saude || res.perfil || res.infoSaude || res.Saude || null;
        setSaude(normalizeSaude(rawSaude));
      } catch (e) {
        console.error(e);
        if (alive) setErr("Falha ao carregar perfil");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [idAluno]);

  // sincroniza e-mail quando carregar aluno
  useEffect(() => {
    if (aluno) {
      setEmail(aluno.Email_Alu || "");
    }
  }, [aluno]);

  const emailDirty = email !== (aluno?.Email_Alu || "");

  // salvar e-mail -------------------------------------------
  async function handleSalvarEmail() {
    if (!idAluno || !emailDirty || savingEmail) return;

    setSavingEmail(true);
    setEmailOk("");
    setEmailErr("");

    try {
      const res = await fetch("/api/aluno_update_credenciais.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idAluno, email }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {}

      if (!res.ok || data?.ok === false) {
        throw new Error(
          data?.error || data?.message || "Não foi possível atualizar o e-mail."
        );
      }

      setAluno((prev) => (prev ? { ...prev, Email_Alu: email } : prev));
      setEmailOk("E-mail atualizado com sucesso!");
    } catch (e) {
      setEmailErr(e.message || "Erro ao atualizar o e-mail.");
    } finally {
      setSavingEmail(false);
    }
  }

  // salvar nova senha ---------------------------------------
  async function handleSalvarSenha() {
    if (!aluno?.Email_Alu) {
      setPwdErr("E-mail do aluno não encontrado.");
      return;
    }
    if (!senhaAtual || !novaSenha || !novaSenhaConfirm) {
      setPwdErr("Preencha a senha atual, a nova senha e a confirmação.");
      return;
    }

    // validação de força (mesma regra do backend)
    const hasUpper  = /[A-Z]/.test(novaSenha);
    const hasLower  = /[a-z]/.test(novaSenha);
    const hasDigit  = /[0-9]/.test(novaSenha);
    const hasSymbol = /[^A-Za-z0-9]/.test(novaSenha);

    if (novaSenha.length < 8 || !hasUpper || !hasLower || !hasDigit || !hasSymbol) {
      setPwdErr("A nova senha não atende aos requisitos de segurança.");
      return;
    }

    if (novaSenha !== novaSenhaConfirm) {
      setPwdErr("As senhas não coincidem.");
      return;
    }

    if (novaSenha === senhaAtual) {
      setPwdErr("A nova senha não pode ser igual à senha atual.");
      return;
    }

    setPwdSaving(true);
    setPwdOk("");
    setPwdErr("");

    try {
      const res = await alterarSenha({
        email: aluno.Email_Alu,
        role: "ALUNO",
        senhaAtual,
        novaSenha,
      });

      if (!res?.ok) {
        // trata erros específicos do backend
        if (res.error === "email_nao_encontrado") {
          setPwdErr("E-mail não encontrado.");
        } else if (res.error === "senha_atual_incorreta") {
          setPwdErr("A senha atual está incorreta.");
        } else if (res.error === "senha_fraca") {
          setPwdErr("A nova senha não atende aos requisitos de segurança.");
        } else if (res.error === "mesma_senha") {
          setPwdErr("A nova senha não pode ser igual à senha atual.");
        } else {
          setPwdErr(res.message || res.error || "Não foi possível alterar a senha.");
        }
        return;
      }

      setPwdOk(res?.message || "Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setNovaSenhaConfirm("");

      // depois de um tempinho volta para o perfil
      setTimeout(() => {
        setChangingPwd(false);
        setPwdOk("");
      }, 1000);
    } catch (e) {
      console.error(e);
      setPwdErr(e.message || "Erro ao alterar a senha.");
    } finally {
      setPwdSaving(false);
    }
  }

  // telas de loading/erro -----------------------------------
  if (loading) return <div className="aln-card">Carregando perfil…</div>;
  if (err) return <div className="aln-card">{err}</div>;
  if (!aluno) return <div className="aln-card">Perfil não encontrado.</div>;

  const nome = aluno?.Nome_Alu || "Aluno";
  const foto = photoURL(aluno?.Foto_Alu);

  /* ====== VIEW: ALTERAR SENHA ====== */
  if (changingPwd) {
    // checklist para exibir (recalcula em tempo real)
    const senhaChecks = {
      minLength: novaSenha.length >= 8,
      upper: /[A-Z]/.test(novaSenha),
      lower: /[a-z]/.test(novaSenha),
      number: /[0-9]/.test(novaSenha),
      symbol: /[^A-Za-z0-9]/.test(novaSenha),
    };

    const senhaAtendeRequisitos =
      senhaChecks.minLength &&
      senhaChecks.upper &&
      senhaChecks.lower &&
      senhaChecks.number &&
      senhaChecks.symbol;

    const senhasConferem =
      novaSenha && novaSenhaConfirm && novaSenha === novaSenhaConfirm;

    return (
      <div className="aln-perfil">
        <div className="aln-perfil-header">
          <button
            className="aln-back"
            onClick={() => {
              setChangingPwd(false);
              setSenhaAtual("");
              setNovaSenha("");
              setNovaSenhaConfirm("");
              setPwdErr("");
              setPwdOk("");
            }}
            aria-label="Voltar"
          >
            ←
          </button>
          <h1>ALTERAR SENHA</h1>
        </div>

        <section className="aln-card aln-perfil-bloco">
          <div className="aln-field">
            <label>E-mail:</label>
            <div className="aln-read">{aluno.Email_Alu}</div>
          </div>

          <div className="aln-field">
            <label>Senha atual:</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="Digite sua senha atual"
            />
          </div>

          <div className="aln-field">
            <label>Nova senha:</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Digite a nova senha"
            />
          </div>

          {/* CHECKLIST DINÂMICO */}
          <div className="pwd-checklist" style={{ marginTop: "-4px" }}>
            <p className="pwd-title">A nova senha precisa ter:</p>
            <ul>
              <li className={senhaChecks.minLength ? "ok" : ""}>
                mínimo de 8 caracteres
              </li>
              <li className={senhaChecks.upper ? "ok" : ""}>
                pelo menos 1 letra maiúscula (A–Z)
              </li>
              <li className={senhaChecks.lower ? "ok" : ""}>
                pelo menos 1 letra minúscula (a–z)
              </li>
              <li className={senhaChecks.number ? "ok" : ""}>
                pelo menos 1 número (0–9)
              </li>
              <li className={senhaChecks.symbol ? "ok" : ""}>
                pelo menos 1 símbolo (! @ # $ % ...)
              </li>
            </ul>
          </div>

          <div className="aln-field">
            <label>Confirmar nova senha:</label>
            <input
              type="password"
              value={novaSenhaConfirm}
              onChange={(e) => setNovaSenhaConfirm(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>

          {novaSenhaConfirm && (
            <div
              className={
                senhasConferem
                  ? "aln-alert aln-alert--ok"
                  : "aln-alert aln-alert--err"
              }
            >
              {senhasConferem
                ? "✔ As senhas conferem!"
                : "As senhas não são iguais."}
            </div>
          )}

          {pwdErr && <div className="aln-alert aln-alert--err">{pwdErr}</div>}
          {pwdOk && <div className="aln-alert aln-alert--ok">{pwdOk}</div>}

          <div className="aln-actions">
            <button
              type="button"
              className="aln-btn-primary"
              onClick={handleSalvarSenha}
              disabled={pwdSaving}
            >
              {pwdSaving ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* ====== VIEW: PERFIL NORMAL ====== */
  return (
    <div className="aln-perfil">
      <div className="aln-perfil-header">
        <button className="aln-back" onClick={onBack} aria-label="Voltar">
          ←
        </button>
        <h1>PERFIL</h1>
      </div>

      <section className="aln-card aln-perfil-bloco">
        {foto ? (
          <img className="aln-avatar" src={foto} alt={`Foto de ${nome}`} />
        ) : (
          <Initials name={nome} />
        )}

        <div className="aln-perfil-nome">
          <strong>{fmt.text(aluno.Nome_Alu)}</strong>
        </div>

        <h2 className="aln-section-title">DADOS PESSOAIS</h2>

        {/* E-mail editável */}
        <div className="aln-field">
          <label>E-mail:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailOk("");
              setEmailErr("");
            }}
            placeholder="Seu e-mail"
          />
        </div>

        <div className="aln-field aln-field--password">
          <label>Senha:</label>
          <div className="aln-input-icon">
            <input type="password" value="********" disabled />
            <button
              type="button"
              className="aln-input-icon-btn"
              onClick={() => {
                setChangingPwd(true);
                setSenhaAtual("");
                setNovaSenha("");
                setNovaSenhaConfirm("");
                setPwdErr("");
                setPwdOk("");
              }}
              aria-label="Alterar senha"
              title="Alterar senha"
            >
              <span className="aln-input-icon-pencil">✎</span>
            </button>
          </div>
        </div>

        <div className="aln-field">
          <label>Gênero:</label>
          <div className="aln-read">{fmt.text(aluno.Genero_Alu)}</div>
        </div>

        <div className="aln-field">
          <label>Data de nascimento:</label>
          <div className="aln-read">{fmt.data(aluno.DataNasc_Alu)}</div>
        </div>

        <div className="aln-field">
          <label>Peso:</label>
          <div className="aln-read">{fmt.peso(saude?.Peso_Alu)}</div>
        </div>

        <div className="aln-field">
          <label>Altura:</label>
          <div className="aln-read">{fmt.altura(saude?.Altura_Alu)}</div>
        </div>

        {/* feedback do e-mail */}
        {emailErr && <div className="aln-alert aln-alert--err">{emailErr}</div>}
        {emailOk && <div className="aln-alert aln-alert--ok">{emailOk}</div>}

        {/* botão de salvar e-mail */}
        {emailDirty && (
          <div className="aln-actions">
            <button
              type="button"
              className="aln-btn-primary"
              onClick={handleSalvarEmail}
              disabled={savingEmail}
            >
              {savingEmail ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </section>

      <section className="aln-card aln-perfil-bloco">
        <div className="aln-field">
          <label>Objetivo:</label>
          <div className="aln-read">{fmt.text(saude?.Objetivo_Alu)}</div>
        </div>

        <div className="aln-field">
          <label>Restrições:</label>
          <div className="aln-read">{fmt.text(saude?.Restricoes_Alu)}</div>
        </div>
      </section>
    </div>
  );
}

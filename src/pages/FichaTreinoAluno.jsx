// src/pages/FichaTreinoAluno.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAlunoPlanosTreino,
  getPlanoDoAluno,
  getExerciciosDoPlano,
  updateCargaExercicio,   // <-- salva a carga no backend

} from "../api";
import "../styles/aluno/index.css";

/* >>> helper de formatação de duração (alteração mínima) <<< */
function fmtDur(totalMin) {
  const t = Math.max(0, Math.round(Number(totalMin) || 0));
  if (t < 60) {
    const mm = String(t).padStart(2, "0");
    return { compact: `${mm}:00`, long: `${t} min` };
  }
  const h = Math.floor(t / 60);
  const m = t % 60;
  return { compact: `${h}:${String(m).padStart(2, "0")}`, long: `${h} h ${String(m).padStart(2, "0")} min` };
}

/** Util: pega id do aluno sem depender do shape exato do objeto user */
function useIdAluno(user) {
  return useMemo(() => {
    return (
      user?.Id_Aluno ??
      user?.idAluno ??
      user?.aluno?.Id_Aluno ??
      user?.aluno?.idAluno ??
      user?.id ??
      null
    );
  }, [user]);
}

/** Debounce simples por exercício (evita spammar o backend a cada keypress) */
function useDebouncers() {
  const timers = useRef({});
  function debounce(key, fn, delay = 500) {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, delay);
  }
  return debounce;
}

/** >>> Helper: aceita ID puro (“fG_03xSzT2s”) ou URLs do YouTube e extrai o ID */
function ytIdFrom(input) {
  if (!input) return null;
  const s = String(input).trim();

  // já é um ID de 11 chars?
  if (/^[\w-]{11}$/.test(s)) return s;

  // tenta padrões comuns de URL
  const m1 = s.match(/[?&]v=([\w-]{11})/);        // ...watch?v=ID
  if (m1) return m1[1];
  const m2 = s.match(/youtu\.be\/([\w-]{11})/);   // youtu.be/ID
  if (m2) return m2[1];
  const m3 = s.match(/embed\/([\w-]{11})/);       // /embed/ID
  if (m3) return m3[1];

  return null;
}

/** Componente principal — Nomes e estados exclusivos */
export default function FichaTreinoAluno({ user, onBack, onFinishTraining }) {
  const idAluno = useIdAluno(user);
  const [tabFicha, setTabFicha] = useState("SUPERIORES"); // "SUPERIORES" | "INFERIORES"
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [planos, setPlanos] = useState([]);

  // Controle de “páginas”
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'detail'
  const [selectedPlano, setSelectedPlano] = useState(null); // plano selecionado

  // Exercícios por plano: { [idPlano]: Exercicios[] }
  const [mapExercicios, setMapExercicios] = useState({});

  // Estados de salvamento de carga: { [idExercicio]: 'idle'|'saving'|'saved'|'error' }
  const [saveState, setSaveState] = useState({});
  const [expandVideo, setExpandVideo] = useState({}); // { [idExercicio]: boolean }

  const debounce = useDebouncers();

  /** Carrega os planos do aluno */
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await getAlunoPlanosTreino(idAluno);
        if (!alive) return;
        if (!res?.ok) throw new Error(res?.message || res?.error || "Erro ao listar planos");
        setPlanos(Array.isArray(res.planos) ? res.planos : []);
      } catch (e) {
        setErr(e.message || "Falha ao carregar planos");
      } finally {
        setLoading(false);
      }
    }
    if (idAluno) load();
    return () => { alive = false; };
  }, [idAluno]);

  /** Filtra por aba (Meta) */
  const planosFiltrados = useMemo(() => {
    return planos.filter(p => (p.Meta || "").toUpperCase() === tabFicha);
  }, [planos, tabFicha]);

/** Abre o “detalhe” do plano (nova página) e carrega exercícios */
async function abrirPlano(plano) {
  setSelectedPlano(plano);
  setViewMode("detail");

  // ⚙️ Tenta primeiro a rota antiga
  let res = await getExerciciosDoPlano(plano.ID_Plano);

  // ⚙️ Se não vier nada (sem exercícios ou erro), tenta a nova rota /api/treinos
  if (!res?.ok || !Array.isArray(res.exercicios) || res.exercicios.length === 0) {
    try {
      res = await getPlanoDoAluno(idAluno, plano.Meta || tabFicha, plano.ID_Plano);
    } catch (e) {
      console.error("Fallback getPlanoDoAluno falhou:", e);
    }
  }

  if (res?.ok) {
    const arr = (res.exercicios || []).map(e => ({
      ...e,
      Carga: e.Carga == null ? 0 : e.Carga,
    }));
    setMapExercicios(prev => ({ ...prev, [plano.ID_Plano]: arr }));
  } else {
    setErr(res?.message || res?.error || "Erro ao carregar exercícios");
  }
}

  function voltarDaPagina() {
    if (viewMode === "detail") {
      setViewMode("list");
      setSelectedPlano(null);
      return;
    }
    onBack?.();
  }

  function finalizarTreino() {
    // pega duração do plano selecionado (ou 90 min fallback)
    const durMin = Number(selectedPlano?.duracao_min) || 90;
    // notifica o pai (AlunoDashboard) para atualizar o resumo semanal
    onFinishTraining?.(durMin);

    alert("Treino finalizado! Bom trabalho 💪");
    setViewMode("list");
    setSelectedPlano(null);
  }

  /** Handler de edição de carga (otimista + debounce de salvamento) */
  function onChangeCarga(idPlano, idExercicio, value) {
    const carga = Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0; // aceita decimal com ponto

    setMapExercicios(prev => {
      const list = (prev[idPlano] || []).map(ex =>
        ex.ID_Exercicios === idExercicio ? { ...ex, Carga: carga } : ex
      );
      return { ...prev, [idPlano]: list };
    });

    setSaveState(prev => ({ ...prev, [idExercicio]: "saving" }));
    debounce(`carga-${idExercicio}`, async () => {
      const r = await updateCargaExercicio(idExercicio, carga);
      if (r?.ok !== false) {
        setSaveState(prev => ({ ...prev, [idExercicio]: "saved" }));
        setTimeout(() => {
          setSaveState(prev => ({ ...prev, [idExercicio]: "idle" }));
        }, 1500);
      } else {
        setSaveState(prev => ({ ...prev, [idExercicio]: "error" }));
      }
    }, 600);
  }

  // ============================================================
  // RENDERIZAÇÃO
  // ============================================================

  // Cabeçalho comum
  const Header = (
  <div className="ficha-header">
    <button className="ft-back" onClick={voltarDaPagina} aria-label="Voltar">←</button>
    <h1>FICHA DE TREINO</h1>
  </div>
);

  // Clique nas abas: se estiver em detalhe, volta pra lista na aba escolhida
  function onTabClick(tab) {
    setTabFicha(tab);
    if (viewMode === "detail") {
      setViewMode("list");
      setSelectedPlano(null);
      // opcional: rolar para o topo da lista
      setTimeout(() => {
        document.querySelector(".ft-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }

  // Abas
  const Tabs = (
    <div className="ft-tabs">
      <button
        className={tabFicha === "SUPERIORES" ? "active" : ""}
        onClick={() => onTabClick("SUPERIORES")}
      >Superiores</button>
      <button
        className={tabFicha === "INFERIORES" ? "active" : ""}
        onClick={() => onTabClick("INFERIORES")}
      >Inferiores</button>
    </div>
  );

  // ---------- LISTA DE PLANOS (página 1) ----------
  if (viewMode === "list") {
    return (
      <div className="ft">
        {Header}
        {Tabs}

        {loading && <div className="ft-state">Carregando planos...</div>}
        {err && <div className="ft-err">{err}</div>}
        {!loading && !err && planosFiltrados.length === 0 && (
          <div className="ft-state">Nenhum plano cadastrado para esta categoria.</div>
        )}

        <div className="ft-list">
          {planosFiltrados.map(plano => {
            const durMin = Number(plano.duracao_min) || 90; // fallback para 1h30
            const d = fmtDur(durMin);                        // <<< aqui
            const duracaoTxt = d.compact;

            return (
              <section key={plano.ID_Plano} id={`plano-${plano.ID_Plano}`} className="ft-card">
                <div className="ft-card-top">
                  <div className="ft-card-title">
                    <strong>{plano.Nome_Plano || "Plano sem nome"}</strong>
                  </div>
                  <div className="ft-card-dur">
                    <b title={d.long} aria-label={d.long}>{duracaoTxt}</b>
                    <span>Duração</span>
                  </div>
                </div>

                <div className="ft-card-actions">
                  {/* ====== BOTÃO INICIAR (estilo do protótipo) ====== */}
                  <button className="ft-iniciar" onClick={() => abrirPlano(plano)}>
                    <span className="ft-iniciar-ico" aria-hidden>
                      {/* Ícone relógio circular */}
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="ft-iniciar-txt">INICIAR</span>
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- DETALHE DO PLANO (página 2) ----------
  const plano = selectedPlano;
  const exs = plano ? (mapExercicios[plano.ID_Plano] || []) : [];

  return (
    <div className="ft">
      {Header}
      {Tabs}

      {!plano && <div className="ft-state">Selecione um plano para iniciar.</div>}

      {plano && (
        <>
          <section className="ft-card">
            <div className="ft-card-top">
              <div className="ft-card-title">
                <strong>{plano.Nome_Plano || "Plano sem nome"}</strong>
              </div>
              <div className="ft-card-dur">
                <b>{(() => {
                  const durMin = Number(plano.duracao_min) || 90;
                  const d = fmtDur(durMin);                  // <<< aqui
                  return <span title={d.long} aria-label={d.long}>{d.compact}</span>;
                })()}</b>
                <span>Duração</span>
              </div>
            </div>
          </section>

          <div className="ft-exercises">
            {exs.length === 0 && (
              <div className="ft-state">Este plano ainda não possui exercícios.</div>
            )}

            {exs.map(ex => {
              const expanded = !!expandVideo[ex.ID_Exercicios];
              const state = saveState[ex.ID_Exercicios] || "idle";
              const saving = state === "saving";
              const saved  = state === "saved";
              const error  = state === "error";

              return (
                <article key={ex.ID_Exercicios} className={`ft-exe ${expanded ? "open" : ""}`}>
                  <div className="ft-exe-head">
                    <h3>{ex.Nome_Exe}</h3>
                    <div className="ft-exe-video">
                      <button
                        className="ft-btn small"
                        onClick={() =>
                          setExpandVideo(prev => ({
                            ...prev,
                            [ex.ID_Exercicios]: !prev[ex.ID_Exercicios],
                          }))
                        }
                      >
                        {expanded ? "Fechar" : "Assistir vídeo"} ▾
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="ft-exe-media" style={{ borderRadius: 12, overflow: "hidden", background: "#000" }}>
                      {(() => {
                        const id = ytIdFrom(ex.Video_YT);
                        if (!id) {
                          return (
                            <div style={{ padding: 16, color: "#666", background: "#fafafa" }}>
                              Nenhum vídeo disponível para este exercício.
                            </div>
                          );
                        }
                        return (
                        <iframe
  className="ft-video-embed"
  title={`Vídeo do exercício ${ex.Nome_Exe}`}
  src={`https://www.youtube.com/embed/${id}`}
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowFullScreen
/>
                        );
                      })()}
                    </div>
                  )}

                  <div className="ft-exe-grid">
                    <div><b>{ex.Series ?? 0}</b><span>Séries</span></div>
                    <div><b>{ex.Repeticoes ?? 0}</b><span>Repetições</span></div>

                    {/* CARGA EDITÁVEL */}
                    <div>
                      <b>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          className="ft-carga-input"
                          value={ex.Carga ?? 0}
                          onChange={(e) =>
                            onChangeCarga(plano.ID_Plano, ex.ID_Exercicios, e.target.value)
                          }
                          aria-label={`Carga do exercício ${ex.Nome_Exe}`}
                        />
                      </b>
                      <span>
                        Carga
                        {saving && " • salvando..."}
                        {saved && " • salvo"}
                        {error && " • erro!"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}

            {exs.length > 0 && (
              <div className="ft-finish">
                <button className="ft-btn finish" onClick={finalizarTreino}>
                  ✅ FINALIZAR TREINO
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";  
import CadastrarAluno from "./CadastrarAluno";
import EditarAluno from "./EditarAluno";
import AdminAgendamentos from "./AdminAgendamentos";
import AdminMontarTreino from "./AdminMontarTreino";
import Acessibilidades from "./Acessibilidades"; // ⬅️ NOVO
import "../styles/admin/index.css";

import { getAlunoStats, listAlunos, toggleRestricao } from "../api";

export default function AdminDashboard({ user, onLogout }) {
  // estado do drawer
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("home");

  // ⬇️ NOVO: controla se a janela de confirmação de logout aparece
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ⬇️ NOVO: estado do carrossel da HOME
  const [homeSlide, setHomeSlide] = useState(0);

  // ⬇️ NOVO: slides do carrossel (troque as imagens depois pelas da Top40 se quiser)
  const slides = [
    {
      id: 0,
      tag: "Visão geral",
      title: "Organize a lotação da academia",
      text:
        "Acompanhe os horários mais cheios e distribua melhor os alunos ao longo da semana.",
      cta: "Ir para agendamentos",
      view: "agendamentos",
      image:
        "https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      id: 1,
      tag: "Cadastro",
      title: "Cadastre novos alunos em poucos cliques",
      text:
        "Use o formulário completo para registrar endereço, saúde e foto do aluno.",
      cta: "Cadastrar aluno",
      view: "cadastro",
      image:
        "https://images.pexels.com/photos/3823063/pexels-photo-3823063.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      id: 2,
      tag: "Treinos",
      title: "Monte treinos personalizados",
      text:
        "Crie planos de treino por grupo muscular e acompanhe a evolução dos alunos.",
      cta: "Ir para montar treino",
      view: "treinos",
      image:
        "https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
  ];

  // ⬇️ NOVO: autoplay do carrossel a cada 7 segundos
  useEffect(() => {
    const id = setInterval(() => {
      setHomeSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(id);
    // slides.length é fixo, então tá suave
  }, []);

  function doLogout() {
    // em vez de sair direto, abre o modal
    setShowLogoutConfirm(true);
  }

  function handleConfirmLogout() {
    // esconde o modal (por estética, antes do reload)
    setShowLogoutConfirm(false);
    try {
      onLogout?.();
    } finally {
      setTimeout(() => window.location.reload(), 0);
    }
  }

  function handleCancelLogout() {
    setShowLogoutConfirm(false);
  }

  const [stats, setStats] = useState({ cadastrados: 0, ativos: 0, restritos: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // ---------- ALUNOS ----------
  const BY_LABEL = { nome: "Nome", cpf: "CPF", telefone: "Telefone", rg: "RG" };
  const [q, setQ] = useState("");
  const [by, setBy] = useState("nome");
  const [showFilter, setShowFilter] = useState(false);

  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [errAlunos, setErrAlunos] = useState("");

  const [alunosView, setAlunosView] = useState("list"); // 'list' | 'edit'
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  const [toast, setToast] = useState("");
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ====== CONFIRMAÇÃO DE RESTRIÇÃO ======
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState("restringir"); // 'restringir' | 'liberar'
  const [alvo, setAlvo] = useState(null); // { id, nome, cpf, dt, restrito, foto }
  const [busyRestr, setBusyRestr] = useState(false);

  // ✅ helper para resolver a URL da foto (evita flashes e 404 no dev)
  function resolveFotoPath(foto) {
    if (!foto || typeof foto !== "string" || !foto.trim()) return null;

    // se já for http/https, devolve direto
    if (/^https?:\/\//i.test(foto)) return foto;

    // se for relativo, no dev prefixa o backend local
    const isDev = window.location.port === "5173";
    if (isDev) {
      const DEV_BACKEND = "http://localhost/tcc_backend_min/public";
      return DEV_BACKEND + foto;
    }

    // em produção assume que o backend já devolve caminho absolute/raiz correto
    return foto;
  }

  // ✅ fallback único para imagens (evita loop no onError)
  function fallbackOnce(e) {
    const img = e.currentTarget;
    if (img.dataset.fallback === "1") return;
    img.src = "/img/avatar-placeholder.svg";
    img.dataset.fallback = "1";
  }

  async function handleToggleRestricao(idAluno, nomeAluno) {
    try {
      const resp = await toggleRestricao(idAluno);
      if (resp.ok) {
        const restrito = resp.restrito ? 1 : 0;

        // atualiza lista em memória (tanto para Id_Aluno quanto idAluno)
        setAlunos(alunos.map(a =>
          (a.Id_Aluno === idAluno || a.idAluno === idAluno)
            ? { ...a, restrito, Restrito: restrito }
            : a
        ));

        showToast(
          restrito
            ? `🔴 O acesso de ${nomeAluno} foi restrito.`
            : `🟢 O acesso de ${nomeAluno} foi liberado.`
        );
      } else {
        showToast("⚠️ Erro ao atualizar restrição.");
      }
    } catch (e) {
      console.error(e);
      showToast("⚠️ Falha ao comunicar com o servidor.");
    }
  }

  function abrirConfirmacao(a) {
    const id = a.Id_Aluno ?? a.idAluno ?? a.id;
    const nome = a.Nome_Alu ?? a.nome ?? "Aluno";
    const cpf = a.CPF_Alu ?? a.cpf ?? "-";
    const data = a.DataNasc_Alu ?? a.DataNasc ?? null;
    const dt = data ? new Date(data).toLocaleDateString() : "-";
    const restrito = a.restrito ?? a.Restrito ?? 0;

    const fotoResolved = resolveFotoPath(a.Foto_Alu || a.foto || "");

    setAlvo({
      id,
      nome,
      cpf,
      dt,
      restrito: Number(restrito) ? 1 : 0,
      foto: fotoResolved || null,
    });
    setConfirmMode(Number(restrito) ? "liberar" : "restringir");
    setConfirmOpen(true);
  }

  async function confirmarAcaoRestricao() {
    if (!alvo) return;
    setBusyRestr(true);
    await handleToggleRestricao(alvo.id, alvo.nome);
    setBusyRestr(false);
    setConfirmOpen(false);
  }

  // stats inicial
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getAlunoStats();
        if (mounted && data) {
          setStats({
            cadastrados: Number(data.cadastrados ?? 0),
            ativos: Number(data.ativos ?? 0),
            restritos: Number(data.restritos ?? 0),
          });
        }
      } finally {
        if (mounted) setLoadingStats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // refresh periódico de stats
  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const data = await getAlunoStats();
        if (!mounted) return;
        setStats({
          cadastrados: Number(data?.cadastrados ?? 0),
          ativos: Number(data?.ativos ?? 0),
          restritos: Number(data?.restritos ?? 0),
        });
      } catch {
        // silencioso
      }
    }

    const handler = () => {
      refresh();
    };
    window.addEventListener("alunoCadastrado", handler);

    const id = setInterval(refresh, 5000);
    return () => {
      mounted = false;
      window.removeEventListener("alunoCadastrado", handler);
      clearInterval(id);
    };
  }, []);

  // entrar em "alunos" sempre na lista
  useEffect(() => {
    if (view === "alunos") {
      setAlunosView("list");
      setAlunoSelecionado(null);
    }
  }, [view]);

  // carregar lista
  useEffect(() => {
    if (view !== "alunos" || alunosView !== "list") return;

    let alive = true;
    const t = setTimeout(async () => {
      setLoadingAlunos(true);
      setErrAlunos("");
      try {
        const data = await listAlunos(q, by);
        if (alive) setAlunos(data.items || []);
      } catch (e) {
        console.error(e);
        if (alive) {
          setAlunos([]);
          setErrAlunos("Falha ao listar alunos");
        }
      } finally {
        if (alive) setLoadingAlunos(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [view, alunosView, q, by]);

  const goCadastro = () => {
    setView("cadastro");
    setOpen(false);
  };
  const goAlunos = () => {
    setView("alunos");
    setOpen(false);
  };

  const goHome = () => {
    setView("home");
    setOpen(false);
    setAlunosView("list");
    setAlunoSelecionado(null);
  };

  return (
    <div className="adm">
      {/* HEADER */}
      <header className="adm-header">
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="menu">
          <span /><span /><span />
        </button>
        <div className="logo">
          <img src="/logoescrita.png" alt="Top40 Logo" />
        </div>
      </header>

      {/* MAIN */}
      <main className="adm-main">
        {view === "home" && (
          <>
            <h1 className="headline">BEM-VINDO AO PAINEL ADMINISTRATIVO!</h1>
            <p className="subhead">
              Aqui você gerencia cadastros, acessos e dados da academia de forma prática.
            </p>

            {/* === CARROSSEL HOME === */}
            <div className="banner">
              <div
                className="admin-carousel"
                aria-label="Destaques do painel administrativo"
              >
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`admin-slide${
                      index === homeSlide ? " is-active" : ""
                    }`}
                  >
                    <div className="banner-image-wrapper">
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="banner-image"
                        loading="lazy"
                      />
                    </div>

                    <div className="banner-content">
                      <span className="banner-tag">{slide.tag}</span>
                      <h2 className="banner-title">{slide.title}</h2>
                      <p className="banner-text">{slide.text}</p>

                      <div className="banner-actions">
                        <button
                          type="button"
                          className="banner-cta"
                          onClick={() => {
                            if (slide.view === "agendamentos") {
                              setView("agendamentos");
                            } else if (slide.view === "cadastro") {
                              setView("cadastro");
                            } else if (slide.view === "treinos") {
                              setView("treinos");
                            }
                            setOpen(false);
                          }}
                        >
                          {slide.cta}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="admin-dots" aria-label="Navegação entre slides">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      className={`admin-dot${
                        index === homeSlide ? " is-active" : ""
                      }`}
                      onClick={() => setHomeSlide(index)}
                      aria-label={`Ir para slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* === FIM DO CARROSSEL === */}

            <section className="card-stats" role="region" aria-label="Quantidade de alunos">
              <h2>QUANTIDADE DE ALUNOS</h2>
              <div className="stats-grid">
                <div className="stat">
                  <div className="num neutro">{stats.cadastrados}</div>
                  <div className="legend">Cadastrados</div>
                </div>
                <div className="stat">
                  <div className="num ativo">{stats.ativos}</div>
                  <div className="legend">Ativos</div>
                </div>
                <div className="stat">
                  <div className="num restrito">{stats.restritos}</div>
                  <div className="legend">Restritos</div>
                </div>
              </div>
            </section>
          </>
        )}

        {view === "treinos" && <AdminMontarTreino onBack={() => setView("home")} />}
        {view === "agendamentos" && <AdminAgendamentos onBack={() => setView("home")} />}

        {view === "alunos" && (
          <section className="adm-alunos">
            {alunosView === "edit" && alunoSelecionado != null ? (
              <>
                <header className="adm-alunos-header">
                  <button
                    className="adm-back"
                    onClick={() => setAlunosView("list")}
                    aria-label="Voltar"
                  >
                    ←
                  </button>
                  <h2>EDITAR ALUNO</h2>
                </header>

                <EditarAluno
                  alunoId={alunoSelecionado}
                  onClose={() => setAlunosView("list")}
                  onSaved={() => {
                    setAlunosView("list");
                    setAlunoSelecionado(null);
                  }}
                />
              </>
            ) : (
              <>
                <header className="adm-alunos-header">
                  <button
                    className="adm-back"
                    onClick={() => setView("home")}
                    aria-label="Voltar"
                  >
                    ←
                  </button>
                  <h2>ALUNOS</h2>
                </header>

                {/* BUSCA + FILTRO */}
                <div className="adm-searchbar">
                  <div className="adm-search">
                    <span
                      className="by-chip"
                      title="Campo de busca ativo"
                    >
                      {BY_LABEL[by] ?? "Nome"}
                    </span>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={`Pesquisar por ${BY_LABEL[by] ?? "Nome"}`}
                      aria-label={`Pesquisar por ${BY_LABEL[by] ?? "Nome"}`}
                    />
                    <button aria-label="Buscar">🔍</button>
                  </div>

                  <div className="adm-filter">
                    <button
                      className="adm-filter-btn"
                      aria-haspopup="dialog"
                      aria-expanded={showFilter}
                      onClick={() => setShowFilter(true)}
                      title="Filtros"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"></path>
                      </svg>
                    </button>

                    {showFilter && (
                      <div
                        className="filter-modal-overlay"
                        onClick={(e) => {
                          if (e.target.classList.contains("filter-modal-overlay")) {
                            setShowFilter(false);
                          }
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
                  </div>
                </div>

                {/* LISTA */}
                <div className="adm-alunos-list">
                  {loadingAlunos && <p className="adm-loading">Carregando...</p>}
                  {!loadingAlunos && errAlunos && (
                    <p className="adm-empty" style={{ color: "#b42318" }}>
                      {errAlunos}
                    </p>
                  )}
                  {!loadingAlunos && !errAlunos && alunos.length === 0 && (
                    <p className="adm-empty">Nenhum aluno encontrado.</p>
                  )}

                  {!loadingAlunos &&
                    !errAlunos &&
                    alunos.map((a) => {
                      const id = a.Id_Aluno ?? a.idAluno ?? a.id;
                      const nome = a.Nome_Alu ?? a.nome ?? "Aluno";
                      const cpf = a.CPF_Alu ?? a.cpf ?? "-";
                      const data = a.DataNasc_Alu ?? a.DataNasc ?? null;
                      const dt = data ? new Date(data).toLocaleDateString() : "-";
                      const restrito = a.restrito ?? a.Restrito ?? 0;

                      const fotoResolved = resolveFotoPath(a.Foto_Alu || a.foto || "");
                      const fallbackLocal = (e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallback === "1") return;
                        img.src = "/img/avatar-placeholder.svg";
                        img.dataset.fallback = "1";
                      };

                      return (
                        <div key={id ?? Math.random()} className="adm-aluno-card">
                          <img
                            src={fotoResolved || "/img/avatar-placeholder.svg"}
                            alt={`Foto de ${nome}`}
                            className="adm-aluno-foto"
                            onError={fallbackLocal}
                          />
                          <div className="adm-aluno-info">
                            <h3>{nome}</h3>
                            <p>Data Nasc.: {dt}</p>
                            <p>CPF: {cpf}</p>
                          </div>
                          <div className="adm-aluno-acoes">
                            <button
                              className="btn-editar"
                              onClick={() => {
                                setAlunoSelecionado(id);
                                setAlunosView("edit");
                              }}
                            >
                              Editar informações
                            </button>

                            {Number(restrito) ? (
                              <button
                                className="btn-liberar"
                                onClick={() => abrirConfirmacao({ ...a, Id_Aluno: id })}
                              >
                                🔒 Retirar restrição
                              </button>
                            ) : (
                              <button
                                className="btn-restringir"
                                onClick={() => abrirConfirmacao({ ...a, Id_Aluno: id })}
                              >
                                Restringir acesso
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </section>
        )}

        {view === "cadastro" && (
          <section>
            <CadastrarAluno
              user={user}
              onClose={() => setView("home")}
              onOpenDrawer={() => setOpen(true)}
            />
          </section>
        )}

        {/* 🔹 NOVO: VIEW DE ACESSIBILIDADE NO ADMIN */}
        {view === "acessibilidade" && (
          <section className="adm-acess">
            <Acessibilidades onBack={() => setView("home")} />
          </section>
        )}
      </main>

      {/* DRAWER */}
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-top">
          <button
            className="back"
            onClick={() => setOpen(false)}
            aria-label="fechar menu"
          >
            ←
          </button>
        </div>

        <nav className="drawer-nav">
          <button className="item" type="button" onClick={goHome}>
            <svg viewBox="0 0 24 24" className="aln-ico" aria-hidden>
              <path
                d="M3 11.5l9-7 9 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M6 10v9h12v-9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>HOME</span>
          </button>

          <button className="item" type="button" onClick={goCadastro}>
            <i className="ico user" />
            <span>CADASTRAR ALUNO</span>
          </button>

          <button
            className="item"
            type="button"
            onClick={() => {
              setView("treinos");
              setOpen(false);
            }}
          >
            <i className="ico plan" />
            <span>MONTAR TREINO</span>
          </button>

          <button
            className="item"
            type="button"
            onClick={() => {
              setView("agendamentos");
              setOpen(false);
            }}
          >
            <i className="ico calendar" />
            <span>AGENDAMENTOS</span>
          </button>

          <button className="item" type="button" onClick={goAlunos}>
            <i className="ico group" />
            <span>ALUNOS</span>
          </button>

          {/* 🔹 NOVO ITEM: ACESSIBILIDADE NO MENU */}
          <button
            className="item"
            type="button"
            onClick={() => {
              setView("acessibilidade");
              setOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" className="aln-ico" aria-hidden>
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 7v10M8 10h8M10 17l2-3 2 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>ACESSIBILIDADE</span>
          </button>

          <button className="item" type="button" onClick={doLogout}>
            <svg viewBox="0 0 24 24" className="aln-ico" aria-hidden>
              <path
                d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M14 16l4-4-4-4M18 12H9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>SAIR</span>
          </button>
        </nav>
      </aside>

      {open && (
        <button
          className="overlay"
          onClick={() => setOpen(false)}
          aria-label="fechar overlay"
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      {/* ===== MODAL DE CONFIRMAÇÃO DE LOGOUT ===== */}
      {showLogoutConfirm && (
        <div
          className="app-modal-overlay"
          onClick={handleCancelLogout}
        >
          <div
            className="app-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Sair do painel administrativo</h3>
            <p>Tem certeza que deseja sair?</p>

            <div className="app-modal-actions">
              <button
                type="button"
                className="app-modal-btn app-modal-btn-cancel"
                onClick={handleCancelLogout}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="app-modal-btn app-modal-btn-confirm"
                onClick={handleConfirmLogout}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE CONFIRMAÇÃO DE RESTRIÇÃO ===== */}
      {confirmOpen && (
        <div
          className="adm-modal-mask"
          onClick={() => !busyRestr && setConfirmOpen(false)}
        >
          <div
            className={`adm-modal-card adm-modal-card--${confirmMode}`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="adm-modal-header">
              <div className="adm-modal-avatar">
                {alvo?.foto ? (
                  <img
                    src={alvo.foto}
                    alt={`Foto de ${alvo?.nome || "aluno"}`}
                    onError={fallbackOnce}
                  />
                ) : (
                  <span className="adm-modal-avatar-fallback">
                    {(alvo?.nome || "A").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="adm-modal-title-block">
                <span className="adm-modal-label">
                  {confirmMode === "restringir"
                    ? "Restringir aluno"
                    : "Remover restrição"}
                </span>
                <h3 className="adm-modal-name">{alvo?.nome || "Aluno"}</h3>
                <p className="adm-modal-meta">
                  {alvo?.cpf && <>CPF {alvo.cpf}</>}
                  {alvo?.cpf && alvo?.dt && " · "}
                  {alvo?.dt && <>Nasc. {alvo.dt}</>}
                </p>
              </div>
            </header>

            <section className="adm-modal-body">
              {confirmMode === "restringir" ? (
                <>
                  <p>
                    Ao <strong>restringir o acesso</strong>, este aluno não poderá
                    entrar no sistema até que a situação seja regularizada.
                  </p>
                  <p className="adm-modal-body-small">
                    Você poderá liberar o acesso novamente a qualquer momento.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Deseja <strong>remover a restrição</strong> deste aluno? Ele
                    voltará a ter acesso normal ao painel do aluno.
                  </p>
                  <p className="adm-modal-body-small">
                    Essa ação não altera os dados de cadastro ou plano de treino.
                  </p>
                </>
              )}
            </section>

            <footer className="adm-modal-actions">
              <button
                type="button"
                className="adm-modal-btn-sec"
                onClick={() => !busyRestr && setConfirmOpen(false)}
                disabled={busyRestr}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="adm-modal-btn-main"
                onClick={confirmarAcaoRestricao}
                disabled={busyRestr}
              >
                {busyRestr
                  ? confirmMode === "restringir"
                    ? "Aplicando restrição..."
                    : "Removendo restrição..."
                  : confirmMode === "restringir"
                  ? "Sim, restringir"
                  : "Sim, remover restrição"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

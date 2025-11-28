import { useEffect, useMemo, useState } from "react";
import "../styles/aluno/index.css";

import AlunoPerfil from "./AlunoPerfil";
import Agendamento from "./Agendamento";
import MeusTreinos from "./MeusTreinos";
import FichaTreinoAluno from "./FichaTreinoAluno";
import Acessibilidades from "./Acessibilidades"; // 🔹 NOVO

// === helpers de semana ===
function sundayOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=domingo ... 6=sábado
  date.setDate(date.getDate() - day); // volta para o domingo
  date.setHours(0, 0, 0, 0);
  return date;
}

function weekKeyForUser(userId, now = new Date()) {
  const sunday = sundayOfWeek(now);
  const y = sunday.getFullYear();
  const m = String(sunday.getMonth() + 1).padStart(2, "0");
  const d = String(sunday.getDate()).padStart(2, "0");
  return `top40.weekly.${userId}.${y}-${m}-${d}`; // chave por usuário + domingo da semana
}
function loadWeekly(userId) {
  try {
    const raw = localStorage.getItem(weekKeyForUser(userId));
    if (!raw) return { sessions: 0, minutes: 0 };
    const obj = JSON.parse(raw);
    if (
      typeof obj?.sessions === "number" &&
      typeof obj?.minutes === "number"
    ) {
      return obj;
    }
  } catch {}
  return { sessions: 0, minutes: 0 };
}
function saveWeekly(userId, data) {
  localStorage.setItem(weekKeyForUser(userId), JSON.stringify(data));
}

function formatMinutes(total) {
  const t = Math.max(0, Math.round(Number(total) || 0));
  if (t < 60) {
    const mm = String(t).padStart(2, "0");
    return `${mm}:00min`;         // ex.: 36:00min
  }
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${h}:${String(m).padStart(2, "0")}h`; // ex.: 1:20h
}

const slides = [
  {
    id: 0,
    tag: "Ficha de Treino",
    title: "Acompanhe seu progresso",
    text: "Confira o desempenho das suas sessões de treino e evolua a cada semana.",
    cta: "Começar treino",
    view: "fichaTreino",
    image:
      "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: 1,
    tag: "Agendar Treino",
    title: "Agende seus treinos com facilidade",
    text: "Escolha o melhor horário e mantenha-se sempre comprometido com sua rotina.",
    cta: "Agendar Treino",
    view: "agendar",
    image:"/agendamento.jpg",
  },
  {
    id: 2,
    tag: "Meus Agendamentos",
    title: "Confira seus agendamentos",
    text: "Veja todos os treinos agendados e organize sua semana com mais eficiência.",
    cta: "Ver Agendamentos",
    view: "meusTreinos",
    image:
      "https://images.pexels.com/photos/703016/pexels-photo-703016.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
];


export default function AlunoDashboard({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState("home"); 
  const [homeSlide, setHomeSlide] = useState(0);

  // 'home' | 'perfil' | 'agendar' | 'meusTreinos' | 'fichaTreino' | 'acessibilidade'

  // === estado do resumo semanal ===
  const [weekly, setWeekly] = useState(() =>
    loadWeekly(user?.Id_Aluno || user?.id || "anon")
  );

  // revalida semana ao carregar (vira a chave automaticamente quando entrar nova semana)
  useEffect(() => {
    const current = loadWeekly(user?.Id_Aluno || user?.id || "anon");
    setWeekly(current);
  }, [user]);

  // se a semana virar enquanto o app estiver aberto, atualiza sozinho
 useEffect(() => {
  const uid = user?.Id_Aluno || user?.id || "anon";
  let lastKey = weekKeyForUser(uid);

  const tick = () => {
    const k = weekKeyForUser(uid);
    if (k !== lastKey) {
      lastKey = k;
      setWeekly(loadWeekly(uid)); // zera visualmente para a nova semana
    }
  };

  const id = setInterval(tick, 5 * 60 * 1000); // checa a cada 5 min
  return () => clearInterval(id);
}, [user]);  // Esse useEffect deve ficar fora do outro

// Novo intervalo para a troca do slide
useEffect(() => {
  const id = setInterval(() => {
    setHomeSlide((prev) => (prev + 1) % slides.length);
  }, 6000);
  return () => clearInterval(id);
}, []);

  // ⬇️ NOVO: controla exibição da confirmação de sair
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const go = (dest) => {
    setScreen(dest);
    setOpen(false);
  };

  const doLogout = () => {
    // ao invés de window.confirm, abre modal
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    try {
      onLogout?.();
    } finally {
      setTimeout(() => window.location.reload(), 0);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // callback chamado pela Ficha de Treino ao “Finalizar treino”
  const handleFinishTraining = (durationMinutes = 0) => {
    setWeekly((prev) => {
      const next = {
        sessions: (prev?.sessions || 0) + 1,
        minutes: (prev?.minutes || 0) + Math.max(0, Math.round(durationMinutes)),
      };
      saveWeekly(user?.Id_Aluno || user?.id || "anon", next);
      return next;
    });
    // volta para HOME (opcional). Se preferir ficar na ficha, remova a linha abaixo:
    setScreen("home");
  };

  return (
    <div className="aln">
      {/* HEADER */}
      <header className="aln-header">
        <button
          className="aln-hamburger"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
        >
          <span /><span /><span />
        </button>

   <div className="logo">  <img src="/logoescrita.png" alt="Top40 Logo" />
</div>
      </header>

      {/* FAIXA CLARA logo abaixo do header */}
      <div className="aln-topbar" />

      {/* CONTEÚDO */}
      <main className="aln-main">
      {screen === "home" && (
  <>
    <h2 className="aln-title">INICIAR TREINO</h2>
    <p className="aln-subtitle">
      Pronto para evoluir? Comece agora seu treino e dê mais um passo rumo à saúde e aos seus objetivos!
    </p>

    {/* Carrossel */}
    <div className="banner">
      <div className="admin-carousel" aria-label="Destaques do painel do aluno">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`admin-slide${index === homeSlide ? " is-active" : ""}`}
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
                    if (slide.view === "fichaTreino") {
                      setScreen("fichaTreino");
                    } else if (slide.view === "agendar") {
                      setScreen("agendar");
                    } else if (slide.view === "meusTreinos") {
                      setScreen("meusTreinos");
                    }
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
              className={`admin-dot${index === homeSlide ? " is-active" : ""}`}
              onClick={() => setHomeSlide(index)}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>

    {/* CTA */}
  

    {/* Card: Resumo Semanal */}
    <section className="aln-card aln-weekly">
      <h3>RESUMO SEMANAL</h3>
      <div className="aln-kpis">
        <div className="aln-kpi">
          <strong>{weekly.sessions}</strong>
          <span>Treinos</span>
        </div>
        <div className="aln-kpi">
          <strong>{formatMinutes(weekly.minutes)}</strong>
          <span>Duração</span>
        </div>
      </div>
    </section>
  </>
)}



        {screen === "perfil" && (
          <AlunoPerfil user={user} onBack={() => setScreen("home")} />
        )}

        {screen === "agendar" && (
          <Agendamento
            user={user}
            onGoMeusTreinos={() => setScreen("meusTreinos")}
                    onBack={() => setScreen("home")}
          />
        )}

        {screen === "meusTreinos" && (
          <MeusTreinos
            user={user}
            onBack={() => setScreen("home")}
            onAgendar={() => setScreen("agendar")}
          />
        )}

        {screen === "fichaTreino" && (
          <FichaTreinoAluno
            user={user}
            onBack={() => setScreen("home")}
            // 🔔 novo: informe a duração (em minutos) ao finalizar o treino
            onFinishTraining={handleFinishTraining}
          />
        )}

        {screen === "acessibilidade" && (
          <Acessibilidades onBack={() => setScreen("home")} />
        )}
      </main>

      {/* DRAWER */}
     <aside
        className={`aln-drawer ${open ? "open" : ""}`}
        aria-hidden={!open}
      >
        {/* topo com setinha, igual ao admin */}
        <div className="aln-drawer-top">
          <button
            className="aln-drawer-back"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            ←
          </button>
        </div>

        <nav className="aln-drawer-nav">
          {/* ➕ HOME */}
          <button className="aln-drawer-item" onClick={() => go("home")}>
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

          <button className="aln-drawer-item" onClick={() => go("perfil")}>
            <svg viewBox="0 0 24 24" className="aln-ico" aria-hidden>
              <circle
                cx="12"
                cy="8"
                r="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M4 20c1.8-4 14.2-4 16 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>PERFIL</span>
          </button>

          <button
            className="aln-drawer-item"
            onClick={() => go("fichaTreino")}
          >
            <svg viewBox="0 0 24 24" className="aln-ico" aria-hidden>
              <rect
                x="5"
                y="3"
                width="14"
                height="18"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8 7h8M8 11h8M8 15h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>FICHA DE TREINO</span>
          </button>

          <button className="aln-drawer-item" onClick={() => go("agendar")}>
            <svg viewBox="0 0 24 24" className="aln-ico" aria-hidden>
              <rect
                x="3"
                y="5"
                width="18"
                height="16"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M7 3v4M17 3v4M3 9h18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>AGENDAR</span>
          </button>

          <button
            className="aln-drawer-item"
            onClick={() => go("meusTreinos")}
          >
            <svg viewBox="0 0 24 24" className="aln-ico" aria-hidden>
              <path
                d="M4 10h6v4H4zM14 10h6v4h-6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M10 12h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            <span>MEUS TREINOS</span>
          </button>

          {/* 🔹 NOVO ITEM: ACESSIBILIDADES */}
          <button
            className="aln-drawer-item"
            onClick={() => go("acessibilidade")}
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
            <span>ACESSIBILIDADES</span>
          </button>

          <button className="aln-drawer-item" onClick={doLogout}>
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
          className="aln-overlay"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ===== MODAL DE CONFIRMAÇÃO DE LOGOUT (NOVO) ===== */}
      {showLogoutConfirm && (
        <div
          className="app-modal-overlay"
          onClick={handleCancelLogout}
        >
          <div
            className="app-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Sair da conta</h3>
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
    </div>
  );
}

import { useEffect, useState } from "react";
import "../styles/aluno/index.css";
import "../styles/acessibilidade.css";

const STORAGE_KEY = "top40.accessibility";

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function applySettings(settings) {
  const root = document.documentElement;

  // Tema
  root.setAttribute("data-theme", settings.theme || "light");

  // Escala de fonte global
  const scale = settings.fontScale ?? 1;
  root.style.setProperty("--font-scale", scale);
  root.style.fontSize = `${scale * 100}%`;

  // Alto contraste
  if (settings.highContrast) {
    root.setAttribute("data-high-contrast", "on");
  } else {
    root.removeAttribute("data-high-contrast");
  }

  // Daltonismo
  root.setAttribute("data-color-mode", settings.colorMode || "normal");
}

export default function Acessibilidades({ onBack }) {
  const saved = loadSettings() || {};

  const [fontScale, setFontScale] = useState(saved.fontScale ?? 1);
  const [theme, setTheme] = useState(saved.theme ?? "light");
  const [highContrast, setHighContrast] = useState(saved.highContrast ?? false);
  const [colorMode, setColorMode] = useState(saved.colorMode ?? "normal");

  // Aplica nas primeiras renderizações
  useEffect(() => {
    applySettings({ fontScale, theme, highContrast, colorMode });
  }, []);

  // Reaplica e salva quando ajustar algo
  useEffect(() => {
    const settings = { fontScale, theme, highContrast, colorMode };
    applySettings(settings);
    saveSettings(settings);
  }, [fontScale, theme, highContrast, colorMode]);

  // === controles ===
  function increaseFont() {
    setFontScale((prev) => Math.min(prev + 0.1, 1.6));
  }
  function decreaseFont() {
    setFontScale((prev) => Math.max(prev - 0.1, 0.8));
  }
  function resetFont() {
    setFontScale(1);
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  function toggleHighContrast() {
    setHighContrast((prev) => !prev);
  }

  function resetAll() {
    setFontScale(1);
    setTheme("light");
    setHighContrast(false);
    setColorMode("normal");
  }

  return (
    <main className="ft">
      <header className="acessibilidade-header">
        {onBack && (
          <button className="aln-back" onClick={onBack} aria-label="Voltar">
            ←
          </button>
        )}
        <h1>ACESSIBILIDADES</h1>
      </header>

      <section className="acc-main">
        <div className="acc-header-row">
          <h2 className="headline">Configurações de acessibilidade</h2>
          <button
            type="button"
            className="acc-reset-all"
            onClick={resetAll}
          >
            Restaurar padrão
          </button>
        </div>

        <p className="subhead">
          Ajuste tamanho da fonte, tema, contraste e filtros de daltonismo para
          melhorar sua leitura.
        </p>

        {/* ======================= FONTE ======================= */}
        <section className="acc-card">
          <div className="acc-card-header">
            <div className="acc-card-icon" aria-hidden="true">
              A
            </div>
            <div>
              <h3 className="acc-card-title">Tamanho da fonte</h3>
              <p className="acc-card-subtitle">
                Aumente ou diminua o tamanho do texto.
              </p>
            </div>
          </div>

          <div className="acc-font-controls">
            <span className="acc-font-label">
              Tamanho atual: <strong>{Math.round(fontScale * 100)}%</strong>
            </span>

            <div className="acc-font-buttons">
              <button type="button" onClick={decreaseFont}>
                A–
              </button>
              <button type="button" onClick={resetFont}>
                Padrão
              </button>
              <button type="button" onClick={increaseFont}>
                A+
              </button>
            </div>
          </div>
        </section>

        {/* ======================= TEMA ======================= */}
        <section className="acc-card">
          <div className="acc-card-header">
            <div className="acc-card-icon" aria-hidden="true">🌗</div>
            <div>
              <h3 className="acc-card-title">Tema</h3>
              <p className="acc-card-subtitle">Modo claro ou escuro.</p>
            </div>
          </div>

          <div className="acc-row">
            <span className="acc-row-label">
              Tema atual:{" "}
              <strong>{theme === "light" ? "Claro" : "Escuro"}</strong>
            </span>

            <button type="button" onClick={toggleTheme}>
              {theme === "light"
                ? "Ativar modo escuro"
                : "Voltar para modo claro"}
            </button>
          </div>
        </section>

        {/* ======================= CONTRASTE ======================= */}
        <section className="acc-card">
          <div className="acc-card-header">
            <div className="acc-card-icon" aria-hidden="true">⚫</div>
            <div>
              <h3 className="acc-card-title">Alto contraste</h3>
              <p className="acc-card-subtitle">
                Melhora a leitura para baixa visão.
              </p>
            </div>
          </div>

          <div className="acc-row">
            <span className="acc-row-label">
              Alto contraste:{" "}
              <strong>{highContrast ? "Ativado" : "Desativado"}</strong>
            </span>

            <button type="button" onClick={toggleHighContrast}>
              {highContrast ? "Desativar alto contraste" : "Ativar alto contraste"}
            </button>
          </div>
        </section>

        {/* ======================= DALTONISMO ======================= */}
        <section className="acc-card">
          <div className="acc-card-header">
            <div className="acc-card-icon" aria-hidden="true">🎨</div>
            <div>
              <h3 className="acc-card-title">Filtros para daltonismo</h3>
              <p className="acc-card-subtitle">
                Ajuste o modo de cor para diferentes tipos de daltonismo.
              </p>
            </div>
          </div>

          <div className="acc-row">
            <span className="acc-row-label">
              Filtro atual: <strong>{colorMode}</strong>
            </span>

            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="protanopia">Protanopia</option>
              <option value="deuteranopia">Deuteranopia</option>
              <option value="tritanopia">Tritanopia</option>
            </select>
          </div>
        </section>
      </section>
    </main>
  );
}

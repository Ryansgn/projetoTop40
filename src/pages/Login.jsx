import { useState } from "react";
import { login } from "../api";
import "../styles/login.css";

export default function Login({ onLogin }) {
  const [stage, setStage] = useState("splash"); // "splash" -> "form"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const resp = await login(email.trim(), senha);

      if (!resp?.ok) {
        setErr(resp?.message || "E-mail ou senha inválidos.");
        return;
      }

      onLogin(resp);
    } catch (error) {
      console.error(error);
      setErr("Não foi possível entrar. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  // ===== Tela 1: Splash =====
  // ===== Tela 1: Splash =====
if (stage === "splash") {
  return (
    <div className="login-container">
      <div className="login-card login-splash">

        {/* LOGO */}
        <div className="logo-box">
          <img
            src="/logotop40.png"
            alt="Top40 Academia"
            className="logo-img"
          />
        </div>

        {/* === BOTÃO PRETO ACADEMIA (idêntico ao antigo) === */}
        <h2 className="logo-subtitle">ACADEMIA</h2>

        {/* === BOTÃO VERDE FAZER LOGIN === */}
        <button
          type="button"
          className="btn-splash-login"
          onClick={() => setStage("form")}
        >
          FAZER LOGIN
        </button>
      </div>
    </div>
  );
}


  // ===== Tela 2: Login (dividida ao meio) =====
  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="logo-area">
          <img src="/login.png" alt="Top40" className="logo" />
        </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO */}
      <div className="login-right">
        <div className="form-area">
          <h2>Login</h2>
          <p>Entre com suas credenciais para continuar.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {err && <p className="login-error">{err}</p>}
        </div>
      </div>
    </div>
  );
}

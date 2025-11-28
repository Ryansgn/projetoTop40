import { useState } from 'react'
import { login } from '../api'
import AlterarSenha from "./AlterarSenha";
import '../styles/login.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState('ALUNO')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showAlterar, setShowAlterar] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await login(email, senha, role)
      if (res.ok) {
        onLogin(res)
      } else if (res.error === 'acesso_restrito') {
        setErr('Seu acesso foi temporariamente restrito pelo administrador.')
      } else {
        setErr('Credenciais inválidas')
      }
    } catch {
      setErr('Falha ao comunicar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  if (showAlterar) {
    // >>> só adicionamos role e defaultEmail
    return <AlterarSenha
      role={role}
      defaultEmail={email}
      onBack={() => setShowAlterar(false)}
    />
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Digite seu e-mail"
            required
          />

          <label>Senha</label>
          <div className="pwd-wrap">
            <input
              type={showPwd ? 'text' : 'password'}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </div>

          {/* link abaixo da senha (mantido igual) */}
          <div style={{ textAlign: 'center', marginTop: '4px', marginBottom: '12px' }}>
            <button
              type="button"
              className="link-btn"
              onClick={() => setShowAlterar(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#000',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Alterar senha
            </button>
          </div>

          <label>Você é:</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="ALUNO">Aluno</option>
            <option value="ADMIN">Administrador</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {err && <p className="error">{err}</p>}
      </div>
    </div>
  )
}
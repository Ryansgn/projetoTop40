import { useState } from 'react'
import Login from './pages/Login'
import AlunoDashboard from './pages/AlunoDashboard'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  const [user, setUser] = useState(null)

  // Função de logout (volta para a tela de login)
  const handleLogout = () => setUser(null)

  // Se não houver usuário logado, mostra a tela de login
  if (!user) return <Login onLogin={setUser} />

  // Se for aluno, renderiza o dashboard do aluno
if (user.role === 'ALUNO') {
  return <AlunoDashboard user={user} onLogout={handleLogout} />
}


  // Se for admin, renderiza o dashboard do admin
  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} onLogout={handleLogout} />
  }

  // Caso venha algum outro tipo de role inesperado
  return <div style={{ padding: 24 }}>Role inválido</div>
}
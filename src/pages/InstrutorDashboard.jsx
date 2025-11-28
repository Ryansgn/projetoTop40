export default function InstrutorDashboard({ user }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 100 }}>
      <h1>Bem-vindo, {user.nome}!</h1>
      <h2>Painel do Instrutor</h2>
      <p>Aqui você verá a lista de alunos e planos de treino.</p>
    </div>
  )
}

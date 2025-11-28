// src/pages/AlunoTreinoDetalhe.jsx
import { useEffect, useState } from "react";
import { getExerciciosByPlano } from "../api"; // já existe
import "../styles/aluno/index.css";

export default function AlunoTreinoDetalhe({ plano, onBack }) {
  const [exercicios, setExercicios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getExerciciosByPlano(plano.ID_Plano);
      if (res.ok) setExercicios(res.data);
      setLoading(false);
    }
    load();
  }, [plano]);

  if (loading) return <div className="loading">Carregando treino...</div>;

  return (
    <div className="ficha-treino">
      <header className="ficha-header">
        <button onClick={onBack} className="back-btn">←</button>
        <h2>FICHA DE TREINO</h2>
      </header>

      <div className="tabs">
        <button className="tab active">Superiores</button>
        <button className="tab">Inferiores</button>
      </div>

      <div className="ficha-exercicios">
        {exercicios.map((ex, i) => (
          <div key={i} className="exercicio-card">
            <div className="ex-top">
              <strong>{ex.Nome_Exe}</strong>
              <button className="assistir">Assistir vídeo ▾</button>
            </div>

            {/* imagem ilustrativa se tiver URL */}
            {ex.UrlVideo && (
              <img src={ex.UrlVideo} alt={ex.Nome_Exe} className="ex-img" />
            )}

            <div className="ex-info">
              <span>{ex.Series} Séries</span>
              <span>{ex.Repeticoes} Repetições</span>
              <span>{ex.Carga || 0} kg</span>
            </div>
          </div>
        ))}
      </div>

      <button className="finalizar-btn">✔ FINALIZAR TREINO</button>
    </div>
  );
}

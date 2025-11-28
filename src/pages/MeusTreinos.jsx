import { useEffect, useMemo, useState } from "react";
import { getSlots, cancelarAgendamento } from "../api";

export default function MeusTreinos({ user, onBack, onAgendar }) {
  const alunoId = user?.id ?? user?.Id_Aluno ?? user?.idAluno ?? null;

  const [meus, setMeus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const carregar = async () => {
    if (!alunoId) { setMsg("Faça login novamente."); return; }
    try {
      setLoading(true);
      setMsg("");
      // reaproveita o endpoint /api/agendamento só para pegar "meus"
      const res = await getSlots(hoje, alunoId);
      if (!res?.ok) throw new Error(res?.message || "Erro ao carregar treinos");
      setMeus(res.meus || []);
    } catch (e) {
      setMsg(e.message || "Falha ao carregar treinos");
      setMeus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  const cancelar = async (idReserva) => {
    if (!alunoId || !idReserva) return;
    try {
      setLoading(true);
      const res = await cancelarAgendamento({ idReserva, alunoId });
      if (!res?.ok) throw new Error(res?.message || "Falha ao cancelar");
      setMsg("Agendamento cancelado.");
      await carregar();
    } catch (e) {
      setMsg(e.message || "Erro ao cancelar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-wrap">
      {/* topo */}
      <header className="mt-head">
        <button className="mt-back" aria-label="Voltar" onClick={onBack}>
          ←
        </button>
        <h1 className="mt-title">MEUS TREINOS</h1>
      </header>

      {/* seção lista */}
      <section className="ag-list mt-list">
        <h2 className="ag-sub center">Treinos agendados</h2>
        {(meus?.length ?? 0) === 0 && (
          <div className="ag-empty">Nenhum agendamento futuro.</div>
        )}
        {!!msg && <div className="ag-msg" style={{marginBottom:8}}>{msg}</div>}

        <div className="ag-cards">
          {meus.map(m => {
            const dataFmt = new Date(m.Data + "T00:00:00")
              .toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"numeric", year:"numeric" });
            const label = {
              'SLOT1':'08:00 - 09:30',
              'SLOT2':'14:30 - 16:00',
              'SLOT3':'19:00 - 20:30',
            }[m.Slot] || `${String(m.Hora_Inicio).slice(0,5)} - ${String(m.Hora_Fim).slice(0,5)}`;
            return (
              <article key={m.ID_Reserva} className="ag-card">
                <div className="ag-card-left">
                  {/* “faixa” superior (data) */}
                  <div className="ag-badge">{dataFmt}</div>
                  {/* horário */}
                  <div className="ag-time">{label}</div>
                  {/* tipo */}
                  <div className="ag-tag">{m.Tipo_Treino}</div>
                </div>
                <button
                  className="ag-cancel"
                  onClick={() => cancelar(m.ID_Reserva)}
                  disabled={loading}
                  title="Cancelar agendamento"
                >
                  CANCELAR
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA: Agendar horário */}
      <div className="mt-cta-wrap">
        <button className="mt-cta" onClick={onAgendar}>
          <span className="mt-plus">+</span> Agendar horário
        </button>
      </div>
    </div>
  );
}

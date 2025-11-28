import { useEffect, useMemo, useState } from "react";
import { getSlots, reservarAgendamento, cancelarAgendamento } from "../api";

/* Calendário inline */
function CalendarInline({ value, onChange }) {
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const start = new Date(view.y, view.m, 1);
  const end = new Date(view.y, view.m + 1, 0);
  const firstWeekday = start.getDay();
  const cells = [];

  for (let i = 0; i < firstWeekday; i++) {
    const d = new Date(view.y, view.m, -(firstWeekday - 1 - i));
    cells.push({ date: d, otherMonth: true });
  }
  for (let d = 1; d <= end.getDate(); d++) {
    cells.push({ date: new Date(view.y, view.m, d), otherMonth: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, otherMonth: true });
  }

  const selected = value ? new Date(value + "T00:00:00") : null;
  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const goPrev = () => {
    const m = view.m - 1;
    setView({ y: m < 0 ? view.y - 1 : view.y, m: (m + 12) % 12 });
  };
  const goNext = () => {
    const m = view.m + 1;
    setView({ y: m > 11 ? view.y + 1 : view.y, m: m % 12 });
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-back" aria-label="voltar mês" onClick={goPrev}>
          ‹
        </button>
        <div className="cal-title">
          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </div>
        <button className="cal-next" aria-label="avançar mês" onClick={goNext}>
          ›
        </button>
      </div>

      <div className="cal-week">
        {weekDays.map((w) => (
          <div key={w} className="cal-weekday">
            {w}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((c, i) => {
          const dNum = c.date.getDate();
          const sel = selected && isSameDay(c.date, selected);
          const inOther = c.otherMonth;
          return (
            <button
              key={i}
              className={
                "cal-cell" +
                (inOther ? " other" : "") +
                (sel ? " selected" : "")
              }
              onClick={() => {
                const y = c.date.getFullYear();
                const m = String(c.date.getMonth() + 1).padStart(2, "0");
                const d = String(c.date.getDate()).padStart(2, "0");
                onChange?.(`${y}-${m}-${d}`);
                if (inOther) setView({ y, m: c.date.getMonth() });
              }}
            >
              <span>{dNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Agendamento({ user, onGoMeusTreinos, onBack }) {
  const alunoId = user?.id ?? user?.Id_Aluno ?? user?.idAluno ?? null;

  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [turno, setTurno] = useState(null); // MANHA | TARDE | NOITE
  const [slots, setSlots] = useState([]);
  const [meus, setMeus] = useState([]);
  const [selecionado, setSelecionado] = useState(null); // H07..H22
  const [tipo, setTipo] = useState("SUPERIORES");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const labelDia = useMemo(() => {
    const dt = new Date(date + "T00:00:00");
    return dt.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  }, [date]);

  const carregar = async (d = date, t = turno) => {
    try {
      setLoading(true);
      setMsg("");
      const res = await getSlots(d, alunoId || undefined, t || undefined);
      if (!res?.ok) throw new Error(res?.message || "Erro ao carregar slots");
      setSlots(t ? res.slots || [] : []); // sem turno => não mostra horários
      setMeus(res.meus || []);
    } catch (e) {
      setMsg(e.message || "Falha ao carregar dados");
      setSlots([]);
      setMeus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar(date, turno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, turno]);

  const confirmar = async () => {
    if (!alunoId) {
      setMsg("Faça login novamente.");
      return;
    }
    if (!turno) {
      setMsg("Escolha um turno.");
      return;
    }
    if (!selecionado) {
      setMsg("Selecione um horário.");
      return;
    }
    try {
      setLoading(true);
      const res = await reservarAgendamento({
        alunoId,
        date,
        slot: selecionado,
        tipoTreino: tipo,
      });
      if (!res?.ok) throw new Error(res?.message || "Não foi possível reservar");

      // dispara evento opcional
      try {
        window.dispatchEvent(new CustomEvent("agendamentoConfirmado"));
      } catch {}

      // redireciona imediatamente para "Meus Treinos"
      if (onGoMeusTreinos) onGoMeusTreinos();
      return;
    } catch (e) {
      setMsg(e.message || "Falha ao reservar");
    } finally {
      setLoading(false);
    }
  };

  const cancelar = async (idReserva) => {
    if (!alunoId || !idReserva) return;
    try {
      setLoading(true);
      const res = await cancelarAgendamento({ idReserva, alunoId });
      if (!res?.ok) throw new Error(res?.message || "Falha ao cancelar");
      setMsg("Agendamento cancelado.");
      await carregar(date, turno);
    } catch (e) {
      setMsg(e.message || "Erro ao cancelar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aln-perfil">
      <div className="aln-perfil-header">
        <button
          className="aln-back"
          onClick={() => onBack && onBack()}
          aria-label="Voltar"
        >
          ←
        </button>
        <h1>AGENDAMENTO</h1>
      </div>

      {/* Calendário */}
      <section className="ag-box">
        <CalendarInline value={date} onChange={(d) => setDate(d)} />
        <div className="ag-date-label" style={{ marginTop: 10 }}>
          Para: <strong>{labelDia}</strong>
        </div>
      </section>

      {/* Turno */}
      <section className="ag-box">
        <h3 className="ag-sub">Escolha o turno</h3>
        <div className="ag-chips">
          {[
            { k: "MANHA", label: "Manhã" },
            { k: "TARDE", label: "Tarde" },
            { k: "NOITE", label: "Noite" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => {
                setTurno(t.k);
                setSelecionado(null);
              }}
              className={`ag-chip ${turno === t.k ? "on" : ""}`}
              disabled={loading}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Horários (apenas após escolher turno) */}
      {turno && (
        <>
          <section className="ag-box">
            <h3 className="ag-sub">Horários disponíveis</h3>
            <div className="ag-chips">
              {slots.map((s) => {
                const on = selecionado === s.code;
                return (
                  <button
                    key={s.code}
                    disabled={loading}
                    onClick={() => setSelecionado(on ? null : s.code)}
                    className={`ag-chip ${on ? "on" : ""}`}
                    aria-pressed={on}
                  >
                    {s.label}
                  </button>
                );
              })}
              {slots.length === 0 && (
                <div className="ag-empty">Sem horários neste turno.</div>
              )}
            </div>
          </section>

          {/* Tipo de treino */}
          <section className="ag-box">
            <h3 className="ag-sub">Tipo de treino</h3>
            <div className="ag-chips">
              {["SUPERIORES", "INFERIORES"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`ag-chip ${tipo === t ? "on" : ""}`}
                  disabled={loading}
                >
                  {t[0] + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </section>

          {/* Confirmar */}
          <section className="ag-box">
            <button
              onClick={confirmar}
              disabled={loading || !selecionado}
              className="ag-cta"
            >
              CONFIRMAR AGENDAMENTO
            </button>
            {!!msg && <div className="ag-msg">{msg}</div>}
          </section>
        </>
      )}

      {/* Meus treinos (fallback se o usuário ficar aqui) */}
      <section className="ag-list">
        <h2 className="ag-sub center">Treinos agendados</h2>
        {(meus?.length ?? 0) === 0 && (
          <div className="ag-empty">Nenhum agendamento futuro.</div>
        )}
        <div className="ag-cards">
          {meus.map((m) => {
            const dataFmt = new Date(m.Data + "T00:00:00").toLocaleDateString(
              "pt-BR",
              {
                weekday: "long",
                day: "numeric",
                month: "numeric",
                year: "numeric",
              }
            );
            const label = `${String(m.Hora_Inicio).slice(
              0,
              5
            )} - ${String(m.Hora_Fim).slice(0, 5)}`;
            return (
              <article key={m.ID_Reserva} className="ag-card">
                <div className="ag-card-left">
                  <div className="ag-badge">{dataFmt}</div>
                  <div className="ag-time">{label}</div>
                  <div className="ag-tag">{m.Tipo_Treino}</div>
                </div>
                <button
                  className="ag-cancel"
                  onClick={() => cancelar(m.ID_Reserva)}
                  disabled={loading}
                >
                  CANCELAR
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { getSlots } from "../api";

/* ===== Calendário inline ===== */
function CalendarInline({ value, onChange }) {
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString("pt-BR", {
    month: "long", year: "numeric"
  });

  const start = new Date(view.y, view.m, 1);
  const end   = new Date(view.y, view.m + 1, 0);
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
    a && b && a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const goPrev = () => { const m = view.m - 1; setView({ y: m < 0 ? view.y - 1 : view.y, m: (m + 12) % 12 }); };
  const goNext = () => { const m = view.m + 1; setView({ y: m > 11 ? view.y + 1 : view.y, m: m % 12 }); };

  const weekDays = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-back" aria-label="voltar mês" onClick={goPrev}>‹</button>
        <div className="cal-title">
          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </div>
        <button className="cal-next" aria-label="avançar mês" onClick={goNext}>›</button>
      </div>

      <div className="cal-week">
        {weekDays.map(w => <div key={w} className="cal-weekday">{w}</div>)}
      </div>

      <div className="cal-grid">
        {cells.map((c, i) => {
          const dNum = c.date.getDate();
          const sel = selected && isSameDay(c.date, selected);
          const inOther = c.otherMonth;
          return (
            <button
              key={i}
              className={"cal-cell" + (inOther ? " other" : "") + (sel ? " selected" : "")}
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

/* ===== Página Admin (2 passos) ===== */
export default function AdminAgendamentos({ onBack }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [step, setStep] = useState(1);           // 1 = escolher dia | 2 = ver ocupação
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const labelDia = useMemo(() => {
    const dt = new Date(date + "T00:00:00");
    return dt.toLocaleDateString("pt-BR", {
      weekday:"long", day:"numeric", month:"numeric", year:"numeric"
    });
  }, [date]);

  // Carrega quando entrar no passo 2
  useEffect(() => {
    if (step !== 2) return;
    (async () => {
      try {
        setLoading(true); setMsg("");
        const res = await getSlots(date); // visão geral do dia
        if (!res?.ok) throw new Error(res?.message || "Erro ao carregar");
        setSlots(res.slots || []);
      } catch (e) {
        setSlots([]); setMsg(e.message || "Falha ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [step, date]);

  // Agrupa em 3 colunas por turno
  const groups = useMemo(() => {
    const norm = (s) => parseInt(String(s.start).slice(0,2), 10);
    const make = (title, a, b) => {
      const gslots = (slots || []).filter(s => {
        const h = norm(s);
        return h >= a && h <= b;
      });
      const total = gslots.reduce((acc, s) => acc + (s.ocupados || 0), 0);
      return { title, slots: gslots, total };
    };
    return [
      make("Manhã", 7, 11),
      make("Tarde", 12, 17),
      make("Noite", 18, 22),
    ];
  }, [slots]);

  const totalDoDia = useMemo(
    () => groups.reduce((acc, g) => acc + g.total, 0),
    [groups]
  );

  return (
    <div className="adm-a-wrap">
      <header className="adm-alunos-header">
        <button className="mt-back" aria-label="Voltar" onClick={onBack}>←</button>
        <h2>AGENDAMENTOS</h2>
      </header>

      {step === 1 && (
        <section className="ag-box" style={{marginTop:8}}>
          <CalendarInline value={date} onChange={setDate} />
          <div className="ag-date-label" style={{marginTop:10}}>
            {labelDia.charAt(0).toUpperCase() + labelDia.slice(1)}
          </div>

          <div className="adm-next-wrap">
            <button className="adm-next" onClick={() => setStep(2)}>
              PRÓXIMO →
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="ag-box" style={{marginTop:12}}>
          <div className="adm-top-row">
            <button className="adm-next" onClick={() => setStep(1)}>← Alterar dia</button>
            <div className="ag-date-label"><strong>{labelDia}</strong></div>
          </div>

          <h3 className="ag-sub center" style={{margin: '8px 0 14px'}}>Horários ocupados</h3>

          {!!msg && <div className="ag-msg" style={{marginBottom:8}}>{msg}</div>}
          {loading && <div className="ag-empty">Carregando…</div>}

          <div className="adm-g-grid">
            {groups.map((g) => (
              <div key={g.title} className="adm-g-section">
                <div className="adm-g-header">
                  <h4>{g.title}</h4>
                  <span className="adm-g-total">Total: {String(g.total).padStart(2,"0")}</span>
                </div>

                <div className="adm-g-rows">
                  {g.slots.map((s) => (
                    <div key={s.code} className="adm-g-row">
                      <span className="adm-g-pill">{s.label}</span>
                      <div className="adm-g-right">
                        <span className="adm-g-badge">
                          Alunos: {String(s.ocupados).padStart(2,"0")}
                        </span>
                        <span className="adm-a-cap">/{s.capacidade}</span>
                      </div>
                    </div>
                  ))}
                  {g.slots.length === 0 && (
                    <div className="ag-empty">Sem horários neste turno.</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="adm-a-total" style={{marginTop:14}}>
            Total do dia: <strong>{totalDoDia}</strong>
          </div>
        </section>
      )}
    </div>
  );
}

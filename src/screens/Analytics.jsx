import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { EXPENSE_CATS } from "../lib/constants";
import { fmt, txRub } from "../lib/model";
import { s } from "../lib/ui";
import { TxRow } from "./Main";

export default function Analytics({ budget, view, period, setPeriod, onBack }) {
  const { txs, income, expense, goals, debts } = view;
  const rates = budget.settings.rates;

  const pieData = EXPENSE_CATS.map((c) => ({
    ...c,
    value: txs.filter((t) => t.type === "expense" && t.category === c.id)
      .reduce((a, t) => a + txRub(t, rates), 0),
  })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

  const saved = txs.filter((t) => t.type === "saving").reduce((a, t) => a + txRub(t, rates), 0);
  const debtPaid = txs.filter((t) => t.type === "expense" && t.category === "debt")
    .reduce((a, t) => a + txRub(t, rates), 0);

  return (
    <>
      <div style={s.hdr}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={onBack} style={s.backBtn}>← Назад</button>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>Аналитика</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["week", "Неделя"], ["month", "Месяц"], ["all", "Всё"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={s.tabBtn(period === v)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["💰 Доходы", income, "#1D9E75"], ["💸 Расходы", expense, "#E24B4A"],
            ["💳 На долги", debtPaid, "#34495E"], ["🐷 Отложено", saved, "#8E44AD"]].map(([lb, v, col]) => (
            <div key={lb} style={{ ...s.card, margin: 0 }}>
              <div style={s.lbl}>{lb}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: col }}>{fmt(v)}</div>
            </div>
          ))}
        </div>

        {income > 0 && (
          <div style={s.card}>
            <div style={s.lbl}>Куда ушёл доход</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444", padding: "6px 0" }}>
              <span>Отложено + на долги</span>
              <span style={{ fontWeight: 700, color: "#1D9E75" }}>
                {Math.round(((saved + debtPaid) / income) * 100)}%
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444", padding: "6px 0" }}>
              <span>Осталось после всех трат</span>
              <span style={{ fontWeight: 700, color: income - expense >= 0 ? "#1D9E75" : "#E24B4A" }}>
                {fmt(income - expense)}
              </span>
            </div>
          </div>
        )}

        {pieData.length > 0 && (
          <div style={s.card}>
            <div style={s.lbl}>Расходы по категориям</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {pieData.map((c) => <Cell key={c.id} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            {pieData.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "7px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color }} />
                  <span style={{ fontSize: 13, color: "#444" }}>{c.icon} {c.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.color }}>
                  {fmt(c.value)} · {Math.round((c.value / expense) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={s.card}>
          <div style={s.lbl}>Операции ({txs.length})</div>
          {txs.length === 0 && (
            <div style={{ color: "#bbb", textAlign: "center", padding: "24px 0", fontSize: 14 }}>Пока пусто 🌿</div>
          )}
          {txs.map((tx) => (
            <TxRow key={tx.id} tx={tx} budget={budget} goals={goals} debts={debts} onDelete={budget.delTx} />
          ))}
        </div>
      </div>
    </>
  );
}

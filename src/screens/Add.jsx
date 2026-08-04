import { useState } from "react";
import { ACCOUNTS, EXPENSE_CATS, INCOME_CATS, CURRENCY_SUFFIX, acc } from "../lib/constants";
import { fmt, today, toRub } from "../lib/model";
import { s } from "../lib/ui";

const MODES = [
  ["expense",  "💸 Расход",  "#E24B4A"],
  ["income",   "💰 Доход",   "#1D9E75"],
  ["transfer", "🔄 Перевод", "#3498DB"],
  ["saving",   "🐷 Отложить","#8E44AD"],
];

export default function Add({ budget, debts, goals, onDone, onBack }) {
  const [mode, setMode]     = useState("expense");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("rub");
  const [toAccount, setToAccount] = useState("bath");
  const [cat, setCat]       = useState(null);
  const [debtTarget, setDebtTarget] = useState(null);
  const [goalId, setGoalId] = useState(goals[0]?.id || "");
  const [date, setDate]     = useState(today());
  const [note, setNote]     = useState("");

  const color = MODES.find((m) => m[0] === mode)[2];
  const cats = mode === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const a = acc(account);
  const suffix = CURRENCY_SUFFIX[a?.currency || "rub"];
  const val = parseFloat(String(amount).replace(/\s/g, "").replace(",", "."));

  const canAdd = !isNaN(val) && val > 0 && (
    mode === "transfer" ? account !== toAccount :
    mode === "saving"   ? !!goalId :
    !!cat && (cat !== "debt" || !!debtTarget)
  );

  const rates = budget.settings.rates;
  const feeNote = a?.currency === "usd" && !isNaN(val)
    ? `Спишется $${(val + Number(budget.settings.usd_fee)).toFixed(2)} с учётом комиссии ≈ ${fmt((val + Number(budget.settings.usd_fee)) * rates.usd)}`
    : a?.currency !== "rub" && !isNaN(val)
    ? `≈ ${fmt(toRub(val, a.currency, rates))}`
    : null;

  const submit = async () => {
    if (!canAdd) return;
    const ok = await budget.addTx({
      date, type: mode, amount: val, account,
      to_account: mode === "transfer" ? toAccount : null,
      category:   mode === "expense" || mode === "income" ? cat : null,
      debt_target: mode === "expense" && cat === "debt" ? debtTarget : null,
      goal_id:    mode === "saving" ? goalId : null,
      note: note.trim() || null,
    });
    if (ok) onDone();
  };

  return (
    <div style={s.wrap}>
      <div style={s.hdr}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={onBack} style={s.backBtn}>← Назад</button>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>Добавить</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {MODES.map(([m, l]) => (
            <button key={m} onClick={() => { setMode(m); setCat(null); setDebtTarget(null); }}
              style={{ ...s.tabBtn(mode === m), fontSize: 11, padding: "8px 2px" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 12px 0" }}>
        {/* Сумма */}
        <div style={s.card}>
          <div style={s.lbl}>Сумма ({suffix})</div>
          <input
            style={{ ...s.inp, fontSize: 32, fontWeight: 800, color, textAlign: "center",
                     border: "none", background: "transparent" }}
            type="number" inputMode="decimal" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
          {feeNote && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#999", marginTop: 2 }}>{feeNote}</div>
          )}
        </div>

        {/* Счёт */}
        <div style={s.card}>
          <div style={s.lbl}>
            {mode === "income" ? "Куда пришло" : mode === "transfer" ? "Откуда → Куда" : "С какого счёта"}
          </div>
          {mode === "transfer" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: 8, alignItems: "center" }}>
              <select value={account} onChange={(e) => setAccount(e.target.value)}
                style={{ ...s.inp, padding: "10px 8px", fontSize: 13 }}>
                {ACCOUNTS.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.label}</option>)}
              </select>
              <div style={{ textAlign: "center", color: "#bbb" }}>→</div>
              <select value={toAccount} onChange={(e) => setToAccount(e.target.value)}
                style={{ ...s.inp, padding: "10px 8px", fontSize: 13 }}>
                {ACCOUNTS.filter((x) => x.id !== account).map((x) => (
                  <option key={x.id} value={x.id}>{x.icon} {x.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <select value={account} onChange={(e) => setAccount(e.target.value)} style={s.inp}>
              {ACCOUNTS.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.label}</option>)}
            </select>
          )}
          <div style={{ marginTop: 10, fontSize: 11, color: "#ccc", textAlign: "center" }}>
            1฿ = {rates.bath}₽ · 1 BYN = {rates.byn}₽ · 1$ = {rates.usd}₽
          </div>
          {account === "credit" && mode === "expense" && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#E24B4A", textAlign: "center" }}>
              Трата по кредитке увеличит долг «Кредитка»
            </div>
          )}
        </div>

        {/* Категория */}
        {(mode === "expense" || mode === "income") && (
          <div style={s.card}>
            <div style={s.lbl}>Категория</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {cats.map((c) => (
                <button key={c.id} onClick={() => { setCat(c.id); if (c.id !== "debt") setDebtTarget(null); }}
                  style={s.catBtn(cat === c.id, c.color)}>
                  <div style={{ fontSize: 24 }}>{c.icon}</div>
                  <div style={{ fontSize: 10, marginTop: 3, fontWeight: cat === c.id ? 700 : 400,
                                color: cat === c.id ? c.color : "#777" }}>{c.label}</div>
                </button>
              ))}
            </div>

            {mode === "expense" && cat === "debt" && (
              <div style={{ marginTop: 14 }}>
                <div style={s.lbl}>Какой долг гасим?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {debts.map((d) => (
                    <button key={d.id} onClick={() => setDebtTarget(d.id)}
                      style={{ flex: 1, padding: "10px 4px", borderRadius: 12, cursor: "pointer",
                        border: `2px solid ${debtTarget === d.id ? "#E24B4A" : "#eee"}`,
                        background: debtTarget === d.id ? "#E24B4A18" : "#fff",
                        fontSize: 12, fontWeight: debtTarget === d.id ? 700 : 400,
                        color: debtTarget === d.id ? "#E24B4A" : "#555" }}>
                      {d.label}<br />
                      <span style={{ fontSize: 11, color: "#bbb" }}>{fmt(d.current)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Цель */}
        {mode === "saving" && (
          <div style={s.card}>
            <div style={s.lbl}>В какую цель</div>
            {goals.length === 0 ? (
              <div style={{ fontSize: 13, color: "#bbb" }}>Сначала заведи цель во вкладке «Планы»</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {goals.map((g) => (
                  <button key={g.id} onClick={() => setGoalId(g.id)}
                    style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                      border: `2px solid ${goalId === g.id ? "#8E44AD" : "#eee"}`,
                      background: goalId === g.id ? "#8E44AD12" : "#fff" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{g.title}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                      {fmt(g.saved)} из {fmt(g.target)} · {Math.round(g.pct)}%
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Дата и заметка */}
        <div style={s.card}>
          <div style={s.lbl}>Дата</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={s.inp} />
          <div style={{ ...s.lbl, marginTop: 14 }}>Заметка (необязательно)</div>
          <input style={s.inp} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Что это было…" />
        </div>

        <div style={{ padding: "14px 0 4px" }}>
          <button onClick={submit} disabled={!canAdd || budget.busy} style={s.primaryBtn(color, canAdd && !budget.busy)}>
            {budget.busy ? "Сохраняем…"
              : mode === "expense" ? "Записать расход"
              : mode === "income" ? "Записать доход"
              : mode === "transfer" ? "Перевести" : "Отложить"}
          </button>
        </div>
      </div>
    </div>
  );
}

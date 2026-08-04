import { ACCOUNTS, cat as findCat, acc } from "../lib/constants";
import { fmt, fmtCur, txRub, debtForecast, monthLabel, currentMonth } from "../lib/model";
import { s, Bar } from "../lib/ui";

export default function Main({ budget, view, period, setPeriod, onOpenAdd, onOpenHistory }) {
  const { balances, totalRub, debts, goals, income, expense, limits, plannedLeft } = view;
  const rates = budget.settings.rates;
  const totalDebt = debts.reduce((a, d) => a + d.current, 0);

  return (
    <>
      <div style={s.hdr}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>ФИНАНСОВЫЙ ТРЕКЕР</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Бюджет 2026</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
              {budget.busy ? "сохраняем…" : monthLabel(currentMonth())}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>На руках</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{fmt(totalRub)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 12px 0" }}>
        {/* Доходы / расходы */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["💰", "Доходы", income, "#1D9E75"], ["💸", "Расходы", expense, "#E24B4A"]].map(([ic, lb, v, col]) => (
            <div key={lb} style={{ ...s.card, margin: 0 }}>
              <div style={s.lbl}>{ic} {lb}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{fmt(v)}</div>
              <div style={{ fontSize: 11, color: "#ccc", marginTop: 2 }}>
                {period === "week" ? "неделя" : period === "month" ? "месяц" : "всё время"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[["week", "Неделя"], ["month", "Месяц"], ["all", "Всё"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={s.filterBtn(period === v)}>{l}</button>
          ))}
        </div>

        {/* Сколько ещё можно потратить по плану */}
        {limits.length > 0 && (
          <div style={{ ...s.card, background: plannedLeft >= 0 ? "#fff" : "#fff6f6" }}>
            <div style={s.lbl}>План на {monthLabel(currentMonth())}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, color: "#666" }}>
                {plannedLeft >= 0 ? "Свободно до конца месяца" : "Перерасход"}
              </span>
              <span style={{ fontSize: 22, fontWeight: 800, color: plannedLeft >= 0 ? "#1D9E75" : "#E24B4A" }}>
                {fmt(Math.abs(plannedLeft))}
              </span>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
              {limits.filter((l) => l.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 4).map((l) => {
                const c = findCat(l.category);
                return (
                  <div key={l.category}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#555" }}>{c?.icon} {c?.label}</span>
                      <span style={{ color: l.pct > 100 ? "#E24B4A" : "#999" }}>
                        {fmt(l.spent)} / {fmt(l.amount)}
                      </span>
                    </div>
                    <Bar pct={l.pct} color={l.pct > 100 ? "#E24B4A" : l.pct > 80 ? "#F39C12" : c?.color || "#2ECC71"} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Счета */}
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={s.lbl}>Счета</div>
            <div style={{ fontSize: 10, color: "#ccc" }}>1฿={rates.bath}₽ · 1BYN={rates.byn}₽ · 1$={rates.usd}₽</div>
          </div>
          {ACCOUNTS.filter((a) => !a.isDebt).map((a) => (
            <div key={a.id} style={s.row}>
              <span style={{ fontSize: 14, color: "#444" }}>{a.icon}&nbsp;{a.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: balances[a.currency] < 0 ? "#E24B4A" : "#222" }}>
                {fmtCur(balances[a.currency], a.currency, rates)}
              </span>
            </div>
          ))}
          <div style={{ ...s.row, borderBottom: "none", paddingTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#666" }}>Итого</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>{fmt(totalRub)}</span>
          </div>
          <div style={{ fontSize: 11, color: "#ccc", marginTop: 4 }}>
            💵 Комиссия карты Мир: ${Number(budget.settings.usd_fee).toFixed(2)} за операцию — уже учтена
          </div>
        </div>

        {/* Долги */}
        <div style={s.card}>
          <div style={s.lbl}>💳 Долги — {fmt(totalDebt)}</div>
          {debts.map((d) => {
            const f = debtForecast(budget.txs, d, budget.settings);
            return (
              <div key={d.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "#444" }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: d.current > 0 ? "#E24B4A" : "#1D9E75" }}>
                    {d.current > 0 ? fmt(d.current) : "закрыт 🎉"}
                  </span>
                </div>
                <Bar pct={d.pct} color={d.current > 0 ? "#E24B4A" : "#1D9E75"} />
                <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>
                  {Math.round(d.pct)}% погашено
                  {f.monthsLeft ? ` · при темпе ${fmt(f.pace)}/мес закроется: ${monthLabel(f.date)}` : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Цели */}
        {goals.length > 0 && (
          <div style={s.card}>
            <div style={s.lbl}>🐷 Копилка</div>
            {goals.map((g) => (
              <div key={g.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "#444" }}>{g.title}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#8E44AD" }}>
                    {fmt(g.saved)} / {fmt(g.target)}
                  </span>
                </div>
                <Bar pct={g.pct} color="#8E44AD" />
                <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>
                  {Math.round(g.pct)}% · осталось {fmt(Math.max(0, g.target - g.saved))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Последние операции */}
        {budget.txs.length > 0 && (
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={s.lbl}>Последние</div>
              <button onClick={onOpenHistory}
                style={{ border: "none", background: "none", color: "#3498DB", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                все →
              </button>
            </div>
            {budget.txs.slice(0, 5).map((tx) => (
              <TxRow key={tx.id} tx={tx} budget={budget} goals={goals} debts={debts} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function TxRow({ tx, budget, goals, debts, onDelete }) {
  const c = findCat(tx.category);
  const from = acc(tx.account);
  const to = acc(tx.to_account);
  const debt = debts.find((d) => d.id === tx.debt_target);
  const goal = goals.find((g) => g.id === tx.goal_id);
  const rub = txRub(tx, budget.settings.rates);

  const icon = tx.type === "transfer" ? "🔄" : tx.type === "saving" ? "🐷" : c?.icon || "📦";
  const title = tx.type === "transfer" ? `${from?.label} → ${to?.label}`
    : tx.type === "saving" ? (goal?.title || "В копилку")
    : debt ? `Долг: ${debt.label}` : c?.label || tx.category;
  const sign = tx.type === "income" ? "+" : tx.type === "transfer" ? "⇄" : "−";
  const color = tx.type === "income" ? "#1D9E75" : tx.type === "transfer" ? "#3498DB"
    : tx.type === "saving" ? "#8E44AD" : "#E24B4A";

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f5f5f5" }}>
      <span style={{ fontSize: 25, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#333", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        {tx.note && <div style={{ fontSize: 11, color: "#aaa" }}>{tx.note}</div>}
        <div style={{ fontSize: 11, color: "#ccc" }}>
          {new Date(tx.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
          {from && from.currency !== "rub" ? ` · ${from.icon}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color }}>{sign}{fmt(rub)}</div>
        {onDelete && (
          <button onClick={() => onDelete(tx.id)}
            style={{ border: "none", background: "none", color: "#ddd", cursor: "pointer", fontSize: 11, padding: "2px 0" }}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

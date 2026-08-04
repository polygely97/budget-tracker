import { useState } from "react";
import { EXPENSE_CATS, ACCOUNTS } from "../lib/constants";
import { fmt, currentMonth, monthLabel, monthKey } from "../lib/model";
import { s, Bar } from "../lib/ui";
import { supabase } from "../lib/supabase";

// Соседний месяц: shift = -1 предыдущий, +1 следующий
const shiftMonth = (key, shift) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + shift, 1);
  return monthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
};

export default function Plans({ budget, view, session }) {
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState("limits");

  return (
    <>
      <div style={s.hdr}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 12 }}>Планы</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["limits", "📋 Лимиты"], ["goals", "🐷 Цели"], ["settings", "⚙️ Настройки"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={s.tabBtn(tab === t)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 12px 0" }}>
        {tab === "limits" && <Limits budget={budget} view={view} month={month} setMonth={setMonth} />}
        {tab === "goals" && <Goals budget={budget} view={view} />}
        {tab === "settings" && <Settings budget={budget} session={session} />}
      </div>
    </>
  );
}

// ─── Лимиты трат по категориям ─────────────────────────────────────────────
function Limits({ budget, view, month, setMonth }) {
  const limitsMap = Object.fromEntries(
    budget.limits.filter((l) => l.month === month).map((l) => [l.category, Number(l.amount)])
  );
  const spentMap = Object.fromEntries(view.limits.map((l) => [l.category, l.spent]));
  const isCurrent = month === currentMonth();

  const total = Object.values(limitsMap).reduce((a, b) => a + b, 0);
  const spentTotal = EXPENSE_CATS.reduce((a, c) => a + (spentMap[c.id] || 0), 0);

  const copyPrevious = async () => {
    const prev = shiftMonth(month, -1);
    const src = budget.limits.filter((l) => l.month === prev);
    for (const l of src) await budget.setLimit(month, l.category, l.amount);
  };

  return (
    <>
      <div style={{ ...s.card, marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setMonth(shiftMonth(month, -1))} style={s.filterBtn(false)}>←</button>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{monthLabel(month)}</div>
          <button onClick={() => setMonth(shiftMonth(month, +1))} style={s.filterBtn(false)}>→</button>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#666" }}>Запланировано всего</span>
          <span style={{ fontWeight: 800, color: "#1a1a2e" }}>{fmt(total)}</span>
        </div>
        {isCurrent && total > 0 && (
          <>
            <div style={{ marginTop: 8 }}>
              <Bar pct={(spentTotal / total) * 100} color={spentTotal > total ? "#E24B4A" : "#1D9E75"} height={8} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#999" }}>
              Потрачено {fmt(spentTotal)} · {spentTotal <= total
                ? `свободно ${fmt(total - spentTotal)}`
                : `перерасход ${fmt(spentTotal - total)}`}
            </div>
          </>
        )}
        {total === 0 && (
          <button onClick={copyPrevious} style={{ ...s.filterBtn(false), marginTop: 12, width: "100%", padding: 10 }}>
            Скопировать план прошлого месяца
          </button>
        )}
      </div>

      <div style={s.card}>
        <div style={s.lbl}>Сколько планируем тратить</div>
        {EXPENSE_CATS.map((c) => {
          const limit = limitsMap[c.id] || 0;
          const spent = spentMap[c.id] || 0;
          const pct = limit > 0 ? (spent / limit) * 100 : 0;
          return (
            <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <span style={{ flex: 1, fontSize: 14, color: "#444" }}>{c.label}</span>
                <input
                  type="number" inputMode="decimal" defaultValue={limit || ""} placeholder="—"
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    if (v !== limit) budget.setLimit(month, c.id, v);
                  }}
                  style={{ ...s.inp, width: 110, padding: "8px 10px", textAlign: "right", fontSize: 15 }} />
              </div>
              {isCurrent && limit > 0 && (
                <div style={{ marginTop: 7 }}>
                  <Bar pct={pct} color={pct > 100 ? "#E24B4A" : pct > 80 ? "#F39C12" : c.color} />
                  <div style={{ fontSize: 11, color: pct > 100 ? "#E24B4A" : "#bbb", marginTop: 3 }}>
                    {fmt(spent)} из {fmt(limit)}
                    {pct > 100 ? ` · перебор на ${fmt(spent - limit)}` : ` · осталось ${fmt(limit - spent)}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 10 }}>
          Введи сумму и коснись экрана рядом — план сохранится сам.
        </div>
      </div>
    </>
  );
}

// ─── Цели накопления ───────────────────────────────────────────────────────
function Goals({ budget, view }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  const add = async () => {
    if (!title.trim() || !(parseFloat(target) > 0)) return;
    const ok = await budget.addGoal({
      title: title.trim(), target: parseFloat(target), sort_order: budget.goals.length + 1,
    });
    if (ok) { setTitle(""); setTarget(""); }
  };

  return (
    <>
      {view.goals.map((g) => (
        <div key={g.id} style={{ ...s.card, marginTop: g === view.goals[0] ? 0 : 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#333" }}>{g.title}</div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                {fmt(g.saved)} из {fmt(g.target)}
                {g.deadline ? ` · до ${new Date(g.deadline).toLocaleDateString("ru-RU", { month: "short", year: "numeric" })}` : ""}
              </div>
            </div>
            <button onClick={() => { if (confirm(`Убрать цель «${g.title}»?`)) budget.delGoal(g.id); }}
              style={{ border: "none", background: "none", color: "#ddd", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <div style={{ marginTop: 10 }}><Bar pct={g.pct} color="#8E44AD" height={8} /></div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 5 }}>
            {Math.round(g.pct)}% · осталось {fmt(Math.max(0, g.target - g.saved))}
          </div>
        </div>
      ))}

      <div style={s.card}>
        <div style={s.lbl}>Новая цель</div>
        <input style={s.inp} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: подушка безопасности" />
        <input style={{ ...s.inp, marginTop: 8 }} type="number" inputMode="decimal" value={target}
          onChange={(e) => setTarget(e.target.value)} placeholder="Сколько нужно, ₽" />
        <button onClick={add} disabled={!title.trim() || !(parseFloat(target) > 0)}
          style={{ ...s.primaryBtn("#8E44AD", !!title.trim() && parseFloat(target) > 0), marginTop: 10, padding: 13 }}>
          Добавить цель
        </button>
      </div>
    </>
  );
}

// ─── Настройки ─────────────────────────────────────────────────────────────
function Settings({ budget, session }) {
  const st = budget.settings;
  const [rates, setRates] = useState(st.rates);
  const [fee, setFee] = useState(st.usd_fee);
  const [init, setInit] = useState(st.initial_balances || {});
  const [debts, setDebts] = useState(budget.debts);

  const saveAll = async () => {
    await budget.saveSettings({
      rates: {
        bath: parseFloat(rates.bath) || 0,
        byn: parseFloat(rates.byn) || 0,
        usd: parseFloat(rates.usd) || 0,
      },
      usd_fee: parseFloat(fee) || 0,
      initial_balances: {
        rub: parseFloat(init.rub) || 0, bath: parseFloat(init.bath) || 0,
        byn: parseFloat(init.byn) || 0, usd: parseFloat(init.usd) || 0,
      },
    });
    for (const d of debts) {
      const orig = budget.debts.find((x) => x.id === d.id);
      if (orig && Number(orig.initial_amount) !== Number(d.initial_amount)) {
        await budget.saveDebt({ ...d, initial_amount: parseFloat(d.initial_amount) || 0 });
      }
    }
  };

  const field = (label, value, onChange, step = "0.01") => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <span style={{ flex: 1, fontSize: 14, color: "#444" }}>{label}</span>
      <input type="number" inputMode="decimal" step={step} value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...s.inp, width: 130, padding: "8px 10px", textAlign: "right", fontSize: 15 }} />
    </div>
  );

  return (
    <>
      <div style={{ ...s.card, marginTop: 0 }}>
        <div style={s.lbl}>Курсы валют (сколько ₽ за единицу)</div>
        {field("1 бат ฿", rates.bath, (v) => setRates({ ...rates, bath: v }))}
        {field("1 BYN", rates.byn, (v) => setRates({ ...rates, byn: v }))}
        {field("1 доллар $", rates.usd, (v) => setRates({ ...rates, usd: v }))}
        {field("Комиссия карты Мир, $", fee, setFee)}
      </div>

      <div style={s.card}>
        <div style={s.lbl}>Остатки на старте</div>
        <div style={{ fontSize: 11, color: "#bbb", marginBottom: 6 }}>
          Сколько было на счетах, когда начали вести учёт. Дальше баланс считается сам по операциям.
        </div>
        {ACCOUNTS.filter((a) => !a.isDebt).map((a) =>
          <div key={a.id}>{field(`${a.icon} ${a.label}`, init[a.currency] ?? 0, (v) => setInit({ ...init, [a.currency]: v }))}</div>
        )}
      </div>

      <div style={s.card}>
        <div style={s.lbl}>Долги — исходные суммы</div>
        {debts.map((d, i) => (
          <div key={d.id}>
            {field(d.label, d.initial_amount, (v) => {
              const next = [...debts]; next[i] = { ...d, initial_amount: v }; setDebts(next);
            }, "1")}
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
          Текущий остаток = исходная сумма + траты по кредитке − все платежи.
        </div>
      </div>

      <div style={{ padding: "14px 0 4px" }}>
        <button onClick={saveAll} disabled={budget.busy} style={s.primaryBtn("#0f3460", !budget.busy)}>
          {budget.busy ? "Сохраняем…" : "Сохранить настройки"}
        </button>
      </div>

      <div style={s.card}>
        <div style={s.lbl}>Аккаунт</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>{session.user.email}</div>
        <button onClick={() => supabase.auth.signOut()}
          style={{ ...s.filterBtn(false), width: "100%", padding: 12 }}>Выйти</button>
      </div>
    </>
  );
}

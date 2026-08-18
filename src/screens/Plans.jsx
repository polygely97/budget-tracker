import { useState } from "react";
import { EXPENSE_CATS, ACCOUNTS } from "../lib/constants";
import { fmt, currentMonth, monthLabel, monthKey, toRub, TOTAL_LIMIT } from "../lib/model";
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
  const [tab, setTab] = useState("debts");

  return (
    <>
      <div style={s.hdr}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 12 }}>Планы</div>
        <div style={{ display: "flex", gap: 5 }}>
          {[["debts", "🎯 Долги"], ["limits", "📋 Лимиты"], ["goals", "🐷 Цели"], ["settings", "⚙️"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{ ...s.tabBtn(tab === t), fontSize: 11 }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 12px 0" }}>
        {tab === "debts" && <DebtPlan budget={budget} view={view} />}
        {tab === "limits" && <Limits budget={budget} view={view} month={month} setMonth={setMonth} />}
        {tab === "goals" && <Goals budget={budget} view={view} />}
        {tab === "settings" && <Settings budget={budget} session={session} />}
      </div>
    </>
  );
}

// ─── План закрытия долгов ──────────────────────────────────────────────────
function DebtPlan({ budget, view }) {
  const { debtPlan, debtMonth, debts } = view;
  const freedom = [...debtPlan].reverse().find((r) => r.closes.length);
  const totalDebt = debts.reduce((a, d) => a + d.current, 0);

  return (
    <>
      {/* Как идём в этом месяце */}
      <div style={{ ...s.card, marginTop: 0 }}>
        <div style={s.lbl}>{monthLabel(debtMonth.month)} — на долги</div>
        {debtMonth.planned > 0 ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: debtMonth.fact >= debtMonth.planned ? "#1D9E75" : "#1a1a2e" }}>
                {fmt(debtMonth.fact)}
              </span>
              <span style={{ fontSize: 13, color: "#999" }}>из {fmt(debtMonth.planned)}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Bar pct={debtMonth.pct} color={debtMonth.fact >= debtMonth.planned ? "#1D9E75" : "#E24B4A"} height={8} />
            </div>
            <div style={{ fontSize: 12, color: debtMonth.left > 0 ? "#E24B4A" : "#1D9E75", marginTop: 6, fontWeight: 600 }}>
              {debtMonth.left > 0
                ? `Осталось внести ${fmt(debtMonth.left)}`
                : `План месяца выполнен${debtMonth.left < 0 ? `, сверху ещё ${fmt(-debtMonth.left)}` : ""} 🎉`}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#bbb" }}>
            На этот месяц план не задан — впиши сумму ниже.
          </div>
        )}
      </div>

      {/* Помесячный план */}
      <div style={s.card}>
        <div style={s.lbl}>Сколько направляем на долги</div>
        <div style={{ fontSize: 11, color: "#bbb", marginBottom: 10 }}>
          Порядок погашения: {[...debts].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
            .map((d) => d.label).join(" → ")}
        </div>

        {debtPlan.map((r) => (
          <div key={r.month} style={{ padding: "11px 0", borderBottom: "1px solid #f5f5f5",
                                      opacity: r.isPast && !r.fact ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: r.isCurrent ? "#0f3460" : "#1a1a2e" }}>
                {monthLabel(r.month)}{r.isCurrent ? " · сейчас" : ""}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(r.isPast || r.isCurrent) && (
                  <span style={{ fontSize: 11, color: r.fact >= r.amount ? "#1D9E75" : "#E24B4A", fontWeight: 700 }}>
                    факт {fmt(r.fact)}
                  </span>
                )}
                <input
                  type="number" inputMode="decimal" defaultValue={r.amount}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    if (v !== Number(r.amount)) budget.setPlanMonth(r.month, v);
                  }}
                  style={{ ...s.inp, width: 110, padding: "7px 9px", textAlign: "right", fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
              {debts.map((d) => {
                const left = r.left[d.id] ?? d.current;
                const done = left <= 0;
                return (
                  <span key={d.id} style={{ padding: "3px 8px", borderRadius: 6,
                    background: done ? "#EAF3DE" : "#FDECEA", color: done ? "#3B6D11" : "#A32D2D" }}>
                    {d.label}: {done ? "✓" : fmt(left)}
                  </span>
                );
              })}
            </div>
            {r.closes.length > 0 && (
              <div style={{ fontSize: 12, color: "#1D9E75", fontWeight: 700, marginTop: 6 }}>
                Закрывается: {r.closes.join(", ")} ✓
              </div>
            )}
          </div>
        ))}

        <AddPlanMonth budget={budget} plan={debtPlan} />

        {freedom && (
          <div style={{ marginTop: 12, padding: 12, background: "#EAF3DE", borderRadius: 10,
                        fontSize: 13, color: "#3B6D11", fontWeight: 700, textAlign: "center" }}>
            🎉 Свобода от долгов — {monthLabel(freedom.month)}
          </div>
        )}
        {!freedom && totalDebt > 0 && (
          <div style={{ marginTop: 12, padding: 12, background: "#FFF8EC", borderRadius: 10,
                        fontSize: 12, color: "#854F0B", textAlign: "center" }}>
            Запланированных сумм не хватает, чтобы закрыть всё. Останется {fmt(
              debts.reduce((a, d) => a + (debtPlan.at(-1)?.left[d.id] ?? d.current), 0)
            )} — добавь месяцев или увеличь суммы.
          </div>
        )}
      </div>
    </>
  );
}

function AddPlanMonth({ budget, plan }) {
  const last = plan.at(-1);
  const next = last ? shiftMonth(last.month, +1) : currentMonth();
  const amount = last ? Number(last.amount) : 0;
  return (
    <button onClick={() => budget.setPlanMonth(next, amount || 100000)}
      style={{ ...s.filterBtn(false), width: "100%", padding: 11, marginTop: 12 }}>
      + добавить {monthLabel(next)}
    </button>
  );
}

// ─── Лимиты трат по категориям ─────────────────────────────────────────────
function Limits({ budget, view, month, setMonth }) {
  const rates = budget.settings.rates;
  const rows = budget.limits.filter((l) => l.month === month);
  const totalRow = rows.find((l) => l.category === TOTAL_LIMIT);
  const totalAmount = Number(totalRow?.amount) || 0;
  const totalCurrency = totalRow?.currency || "bath";
  const limitsMap = Object.fromEntries(rows.map((l) => [l.category, Number(l.amount)]));
  const curMap = Object.fromEntries(rows.map((l) => [l.category, l.currency || "rub"]));
  const spentMap = Object.fromEntries(view.limits.map((l) => [l.category, l.spent]));
  const isCurrent = month === currentMonth();

  // лимит может быть в баттах — считаем всё в рублях по текущему курсу
  const inRub = (cat) => toRub(limitsMap[cat] || 0, curMap[cat] || "rub", rates);
  const total = EXPENSE_CATS.reduce((a, c) => a + inRub(c.id), 0);
  // если задана общая сумма месяца — она главнее, чем сумма по категориям
  const planned = totalRow ? toRub(totalAmount, totalCurrency, rates) : total;
  const monthSpent = isCurrent ? view.monthPlan.spent : 0;

  const copyPrevious = async () => {
    const prev = shiftMonth(month, -1);
    const src = budget.limits.filter((l) => l.month === prev);
    for (const l of src) await budget.setLimit(month, l.category, l.amount, l.currency || "rub");
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
          <span style={{ fontWeight: 800, color: "#1a1a2e" }}>{fmt(planned)}</span>
        </div>
        {isCurrent && planned > 0 && (
          <>
            <div style={{ marginTop: 8 }}>
              <Bar pct={(monthSpent / planned) * 100} color={monthSpent > planned ? "#E24B4A" : "#1D9E75"} height={8} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#999" }}>
              Потрачено {fmt(monthSpent)} · {monthSpent <= planned
                ? `осталось по плану ${fmt(planned - monthSpent)}`
                : `перерасход ${fmt(monthSpent - planned)}`}
            </div>
            {totalRow && (
              <div style={{ marginTop: 4, fontSize: 11, color: "#bbb" }}>
                Считаем по общей сумме месяца, лимиты по категориям сейчас не учитываются.
              </div>
            )}
          </>
        )}
        {total === 0 && !totalRow && (
          <button onClick={copyPrevious} style={{ ...s.filterBtn(false), marginTop: 12, width: "100%", padding: 10 }}>
            Скопировать план прошлого месяца
          </button>
        )}
      </div>

      {/* Одна сумма на месяц — когда не хочется расписывать по категориям */}
      <div style={s.card}>
        <div style={s.lbl}>Одной суммой на месяц</div>
        <div style={{ fontSize: 11, color: "#bbb", marginBottom: 10 }}>
          Например: «до конца августа нам нужно 8 000 ฿». Если сумма задана, считаем по ней,
          а лимиты по категориям ниже не учитываются.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, fontSize: 14, color: "#444" }}>Всего на {monthLabel(month)}</span>
          <button
            onClick={() => budget.setLimit(month, TOTAL_LIMIT, totalAmount, totalCurrency === "rub" ? "bath" : "rub")}
            disabled={!totalAmount}
            style={{ border: "1px solid #eee", background: totalCurrency === "bath" ? "#EAF3DE" : "#fafafa",
                     color: totalCurrency === "bath" ? "#3B6D11" : "#888", borderRadius: 8,
                     padding: "7px 9px", cursor: totalAmount ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>
            {totalCurrency === "bath" ? "฿" : "₽"}
          </button>
          <input
            type="number" inputMode="decimal" defaultValue={totalAmount || ""} placeholder="—"
            key={`${month}-total-${totalAmount}-${totalCurrency}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 0;
              if (v !== totalAmount) budget.setLimit(month, TOTAL_LIMIT, v, totalCurrency);
            }}
            style={{ ...s.inp, width: 100, padding: "8px 10px", textAlign: "right", fontSize: 15 }} />
        </div>
        {totalAmount > 0 && totalCurrency === "bath" && (
          <div style={{ fontSize: 11, color: "#999", textAlign: "right", marginTop: 4 }}>
            = {fmt(toRub(totalAmount, "bath", rates))} по курсу {rates.bath} ₽
          </div>
        )}
      </div>

      <div style={s.card}>
        <div style={s.lbl}>Сколько планируем тратить</div>
        {EXPENSE_CATS.map((c) => {
          const limit = limitsMap[c.id] || 0;
          const cur = curMap[c.id] || "rub";
          const limitRub = inRub(c.id);
          const spent = spentMap[c.id] || 0;
          const pct = limitRub > 0 ? (spent / limitRub) * 100 : 0;
          return (
            <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <span style={{ flex: 1, fontSize: 14, color: "#444" }}>{c.label}</span>
                <button
                  onClick={() => budget.setLimit(month, c.id, limit, cur === "rub" ? "bath" : "rub")}
                  disabled={!limit}
                  style={{ border: "1px solid #eee", background: cur === "bath" ? "#EAF3DE" : "#fafafa",
                           color: cur === "bath" ? "#3B6D11" : "#888", borderRadius: 8,
                           padding: "7px 9px", cursor: limit ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>
                  {cur === "bath" ? "฿" : "₽"}
                </button>
                <input
                  type="number" inputMode="decimal" defaultValue={limit || ""} placeholder="—"
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    if (v !== limit) budget.setLimit(month, c.id, v, cur);
                  }}
                  style={{ ...s.inp, width: 100, padding: "8px 10px", textAlign: "right", fontSize: 15 }} />
              </div>
              {limit > 0 && cur === "bath" && (
                <div style={{ fontSize: 11, color: "#999", textAlign: "right", marginTop: 3 }}>
                  = {fmt(limitRub)} по курсу {rates.bath} ₽
                </div>
              )}
              {isCurrent && limitRub > 0 && (
                <div style={{ marginTop: 7 }}>
                  <Bar pct={pct} color={pct > 100 ? "#E24B4A" : pct > 80 ? "#F39C12" : c.color} />
                  <div style={{ fontSize: 11, color: pct > 100 ? "#E24B4A" : "#bbb", marginTop: 3 }}>
                    {fmt(spent)} из {fmt(limitRub)}
                    {pct > 100 ? ` · перебор на ${fmt(spent - limitRub)}` : ` · осталось ${fmt(limitRub - spent)}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 10 }}>
          Введи сумму и коснись экрана рядом — план сохранится сам.
          Кнопка ₽/฿ переключает валюту лимита: батты пересчитываются по курсу.
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

// ─── Смена пароля ──────────────────────────────────────────────────────────
// Пароль задаёт сам человек: он уходит прямо в Supabase и нигде не сохраняется.
function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState("");
  const [repeat, setRepeat] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const short = pass.length > 0 && pass.length < 8;
  const mismatch = repeat.length > 0 && pass !== repeat;
  const ok = pass.length >= 8 && pass === repeat;

  const submit = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);
    if (error) { setMsg({ err: true, text: error.message }); return; }
    setPass(""); setRepeat(""); setOpen(false);
    setMsg({ err: false, text: "Пароль изменён. На других устройствах вход по новому." });
  };

  if (!open) {
    return (
      <>
        <button onClick={() => { setOpen(true); setMsg(null); }}
          style={{ ...s.filterBtn(false), width: "100%", padding: 12 }}>
          🔒 Сменить пароль
        </button>
        {msg && (
          <div style={{ fontSize: 12, color: msg.err ? "#E24B4A" : "#1D9E75", marginTop: 8 }}>{msg.text}</div>
        )}
      </>
    );
  }

  return (
    <div style={{ background: "#fafafa", borderRadius: 12, padding: 12 }}>
      <input type="password" autoComplete="new-password" placeholder="новый пароль"
        value={pass} onChange={(e) => setPass(e.target.value)} style={s.inp} />
      <input type="password" autoComplete="new-password" placeholder="ещё раз"
        value={repeat} onChange={(e) => setRepeat(e.target.value)} style={{ ...s.inp, marginTop: 8 }} />
      {short && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 6 }}>Минимум 8 символов</div>}
      {mismatch && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 6 }}>Пароли не совпадают</div>}
      {msg?.err && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 6 }}>{msg.text}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => { setOpen(false); setPass(""); setRepeat(""); }}
          style={{ ...s.filterBtn(false), flex: 1, padding: 11 }}>Отмена</button>
        <button onClick={submit} disabled={!ok || busy}
          style={{ ...s.primaryBtn("#0f3460", ok && !busy), flex: 1, padding: 11, fontSize: 14 }}>
          {busy ? "Меняем…" : "Сохранить"}
        </button>
      </div>
    </div>
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
        <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>{session.user.email}</div>
        <ChangePassword />
        <button onClick={() => supabase.auth.signOut()}
          style={{ ...s.filterBtn(false), width: "100%", padding: 12, marginTop: 10 }}>Выйти</button>
      </div>
    </>
  );
}

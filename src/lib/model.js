import { acc } from "./constants";

// ─── Форматирование ────────────────────────────────────────────────────────
export const fmt = (n, suf = "₽") => {
  const v = Number(n) || 0;
  return Math.round(v).toLocaleString("ru-RU") + " " + suf;
};

export const fmtCur = (n, currency, rates) => {
  const v = Number(n) || 0;
  if (currency === "rub") return fmt(v);
  if (currency === "usd") return `$${v.toFixed(2)} ≈ ${fmt(v * rates.usd)}`;
  if (currency === "byn") return `${v.toFixed(2)} BYN ≈ ${fmt(v * rates.byn)}`;
  return `${Math.round(v).toLocaleString("ru-RU")} ฿ ≈ ${fmt(v * rates.bath)}`;
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const monthKey = (dateStr) => String(dateStr).slice(0, 7); // '2026-08'
export const currentMonth = () => monthKey(today());

export const monthLabel = (key) => {
  const [y, m] = key.split("-");
  const names = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  return `${names[Number(m) - 1]} ${y}`;
};

// ─── Конвертация ───────────────────────────────────────────────────────────
// rates хранит, сколько рублей стоит 1 единица валюты
export const toRub = (amount, currency, rates) => {
  const v = Number(amount) || 0;
  if (currency === "rub") return v;
  return v * (Number(rates?.[currency]) || 1);
};

export const fromRub = (rub, currency, rates) => {
  const v = Number(rub) || 0;
  if (currency === "rub") return v;
  return v / (Number(rates?.[currency]) || 1);
};

// Сумма операции в рублях — для аналитики и лимитов
export const txRub = (tx, rates) => {
  const a = acc(tx.account);
  return toRub(tx.amount, a?.currency || "rub", rates);
};

// Реальное списание со счёта с учётом комиссии карты Мир ($0.25 за операцию)
const withdrawal = (tx, settings) => {
  const a = acc(tx.account);
  const fee = a?.currency === "usd" ? Number(settings.usd_fee) || 0 : 0;
  return (Number(tx.amount) || 0) + fee;
};

// ─── Точка отсчёта ─────────────────────────────────────────────────────────
// Когда учёт забросили и цифры разъехались с реальностью, не переписываем
// историю, а делаем сверку: вводим реальные остатки и долги на дату
// settings.start_date. В балансы и долги входят только операции с этой даты,
// более ранние остаются в истории как есть.
export const sinceStart = (txs, settings) => {
  const from = settings?.start_date;
  if (!from) return txs;
  return txs.filter((t) => String(t.date) >= String(from));
};

// ─── Балансы счетов ────────────────────────────────────────────────────────
// Считаются от стартовых остатков + все операции с точки отсчёта. Единственный
// источник правды — список операций, поэтому баланс не может «разъехаться» с историей.
export function computeBalances(allTxs, settings) {
  const txs = sinceStart(allTxs, settings);
  const rates = settings.rates;
  const bal = { ...{ rub: 0, bath: 0, byn: 0, usd: 0 }, ...(settings.initial_balances || {}) };
  Object.keys(bal).forEach((k) => (bal[k] = Number(bal[k]) || 0));

  for (const tx of txs) {
    const from = acc(tx.account);
    const isCard = from && !from.isDebt;

    if (tx.type === "income") {
      // доход на кредитку = её частичное погашение, остатка не прибавляет
      if (isCard) bal[from.currency] += Number(tx.amount) || 0;
    } else if (tx.type === "expense" || tx.type === "saving") {
      if (isCard) bal[from.currency] -= withdrawal(tx, settings);
    } else if (tx.type === "transfer") {
      const to = acc(tx.to_account);
      if (isCard) bal[from.currency] -= withdrawal(tx, settings);
      if (to && !to.isDebt) {
        const rub = toRub(tx.amount, from?.currency || "rub", rates);
        bal[to.currency] += fromRub(rub, to.currency, rates);
      }
    }
  }
  return bal;
}

export const totalBalanceRub = (bal, rates) =>
  toRub(bal.rub, "rub", rates) + toRub(bal.bath, "bath", rates) +
  toRub(bal.byn, "byn", rates) + toRub(bal.usd, "usd", rates);

// ─── Долги ─────────────────────────────────────────────────────────────────
// Текущий долг = стартовый + всё, что потрачено с кредитки − все платежи по нему
export function computeDebts(allTxs, debts, settings) {
  const txs = sinceStart(allTxs, settings);
  return debts.map((d) => {
    let grown = 0;
    let paid = 0;
    for (const tx of txs) {
      const isDebtPayment = tx.category === "debt" && tx.debt_target === d.id;
      if (isDebtPayment && tx.type === "expense") {
        paid += txRub(tx, settings.rates);
        continue;
      }
      const from = acc(tx.account);
      if (from?.isDebt && from.debtId === d.id) {
        if (tx.type === "expense" || tx.type === "transfer" || tx.type === "saving") {
          grown += Number(tx.amount) || 0;
        } else if (tx.type === "income") {
          paid += Number(tx.amount) || 0;
        }
      }
    }
    const start = Number(d.initial_amount) || 0;
    const current = Math.max(0, start + grown - paid);
    const base = start + grown;
    return { ...d, current, paid, grown, pct: base > 0 ? Math.min(100, (paid / base) * 100) : 100 };
  });
}

// ─── Цели-копилки ──────────────────────────────────────────────────────────
export function computeGoals(txs, goals, settings) {
  return goals.map((g) => {
    const saved = txs
      .filter((t) => t.type === "saving" && t.goal_id === g.id)
      .reduce((sum, t) => sum + txRub(t, settings.rates), 0);
    const target = Number(g.target) || 0;
    return { ...g, saved, pct: target > 0 ? Math.min(100, (saved / target) * 100) : 0 };
  });
}

// ─── Планы трат ────────────────────────────────────────────────────────────
// Лимит можно задать в валюте, в которой реально живём: 45 000 ฿ за виллу
// остаются 45 000 ฿, а в рубли пересчитываются по текущему курсу.
export function computeLimits(txs, limits, month, settings) {
  return limits
    .filter((l) => l.month === month)
    .map((l) => {
      const spent = txs
        .filter((t) => t.type === "expense" && t.category === l.category && monthKey(t.date) === month)
        .reduce((sum, t) => sum + txRub(t, settings.rates), 0);
      const cur = l.currency || "rub";
      const amountRub = toRub(l.amount, cur, settings.rates);
      return {
        ...l, currency: cur, amountRub, spent,
        left: amountRub - spent,
        pct: amountRub > 0 ? (spent / amountRub) * 100 : 0,
      };
    });
}

// Общий лимит на месяц — когда думаем не по категориям, а одной суммой:
// «до конца августа нам надо 8 000 ฿». Хранится как категория 'total'.
export const TOTAL_LIMIT = "total";

export function computeMonthPlan(txs, limits, month, settings) {
  const totalRow = limits.find((l) => l.month === month && l.category === TOTAL_LIMIT);
  // траты месяца без платежей по долгам — долги считаются отдельно
  const spentAll = txs
    .filter((t) => t.type === "expense" && t.category !== "debt" && monthKey(t.date) === month)
    .reduce((s, t) => s + txRub(t, settings.rates), 0);

  if (totalRow) {
    const planned = toRub(totalRow.amount, totalRow.currency || "rub", settings.rates);
    return {
      mode: "total", planned, spent: spentAll, left: planned - spentAll,
      amount: Number(totalRow.amount), currency: totalRow.currency || "rub",
    };
  }
  const byCat = computeLimits(txs, limits, month, settings);
  const planned = byCat.reduce((a, l) => a + l.amountRub, 0);
  const spent = byCat.reduce((a, l) => a + l.spent, 0);
  return { mode: "categories", planned, spent, left: planned - spent };
}

// ─── План закрытия долгов ──────────────────────────────────────────────────
// Раскладываем запланированную на месяц сумму по долгам в порядке приоритета
// (сначала сплит, потом кредитка, потом папе) и смотрим, что остаётся.
export function computeDebtPlan(plan, debts, txs, settings) {
  const order = [...debts].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  const rest = Object.fromEntries(order.map((d) => [d.id, d.current]));
  const now = currentMonth();

  return [...plan]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => {
      let free = Number(row.amount) || 0;
      const closes = [];
      for (const d of order) {
        if (rest[d.id] <= 0 || free <= 0) continue;
        const pay = Math.min(rest[d.id], free);
        rest[d.id] -= pay;
        free -= pay;
        if (rest[d.id] <= 0) closes.push(d.label);
      }
      // за текущий и прошедшие месяцы показываем факт, а не только план
      const fact = txs
        .filter((t) => t.type === "expense" && t.category === "debt" && monthKey(t.date) === row.month)
        .reduce((s, t) => s + txRub(t, settings.rates), 0);
      return {
        ...row,
        fact,
        isPast: row.month < now,
        isCurrent: row.month === now,
        left: { ...rest },
        closes,
      };
    });
}

// Сколько ушло на долги в конкретном месяце и сколько планировали
export function debtProgressThisMonth(plan, txs, settings) {
  const month = currentMonth();
  const planned = Number(plan.find((p) => p.month === month)?.amount) || 0;
  const fact = txs
    .filter((t) => t.type === "expense" && t.category === "debt" && monthKey(t.date) === month)
    .reduce((s, t) => s + txRub(t, settings.rates), 0);
  return { month, planned, fact, left: planned - fact, pct: planned > 0 ? (fact / planned) * 100 : 0 };
}

// ─── Темп погашения долгов ─────────────────────────────────────────────────
// «При таком темпе кредитка закроется в сентябре» — считаем по средним платежам
// за последние 3 месяца, где платежи вообще были.
export function debtForecast(txs, debt, settings) {
  if (debt.current <= 0) return { done: true };
  const byMonth = {};
  for (const tx of txs) {
    if (tx.type === "expense" && tx.category === "debt" && tx.debt_target === debt.id) {
      const k = monthKey(tx.date);
      byMonth[k] = (byMonth[k] || 0) + txRub(tx, settings.rates);
    }
  }
  const months = Object.keys(byMonth).sort().slice(-3);
  if (!months.length) return { done: false, pace: 0 };
  const pace = months.reduce((s, k) => s + byMonth[k], 0) / months.length;
  if (pace <= 0) return { done: false, pace: 0 };
  const monthsLeft = Math.ceil(debt.current / pace);
  const d = new Date();
  d.setMonth(d.getMonth() + monthsLeft);
  return { done: false, pace, monthsLeft, date: monthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`) };
}

// ─── Фильтр периода ────────────────────────────────────────────────────────
export function filterByPeriod(txs, period) {
  if (period === "all") return txs;
  const now = new Date();
  if (period === "week") {
    const from = new Date(now.getTime() - 7 * 86400000);
    return txs.filter((t) => new Date(t.date) >= from);
  }
  const m = currentMonth();
  return txs.filter((t) => monthKey(t.date) === m);
}

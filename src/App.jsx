import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { useBudget } from "./lib/useBudget";
import {
  computeBalances, computeDebts, computeGoals, computeLimits,
  totalBalanceRub, filterByPeriod, txRub, currentMonth,
} from "./lib/model";
import { s } from "./lib/ui";
import Auth from "./screens/Auth";
import Main from "./screens/Main";
import Add from "./screens/Add";
import Plans from "./screens/Plans";

// Графики весят много — грузим их только когда открыли аналитику
const Analytics = lazy(() => import("./screens/Analytics"));

export default function App() {
  const [session, setSession] = useState(undefined); // undefined — ещё проверяем

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Splash text="Загрузка…" />;
  if (!session) return <Auth />;
  return <Budget session={session} />;
}

function Splash({ text }) {
  return (
    <div style={{ ...s.wrap, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#bbb", fontSize: 15 }}>
      {text}
    </div>
  );
}

function Budget({ session }) {
  const budget = useBudget(session);
  const [tab, setTab] = useState("main");
  const [period, setPeriod] = useState("month");

  // Все производные числа считаются из операций — единый источник правды
  const view = useMemo(() => {
    const { txs, settings, debts, goals, limits } = budget;
    const rates = settings.rates;
    const periodTxs = filterByPeriod(txs, period);
    const computedLimits = computeLimits(txs, limits, currentMonth(), settings);
    const plannedTotal = computedLimits.reduce((a, l) => a + Number(l.amount), 0);
    const plannedSpent = computedLimits.reduce((a, l) => a + l.spent, 0);
    const balances = computeBalances(txs, settings);

    return {
      txs: periodTxs,
      balances,
      totalRub: totalBalanceRub(balances, rates),
      debts: computeDebts(txs, debts, settings),
      goals: computeGoals(txs, goals, settings),
      limits: computedLimits,
      plannedLeft: plannedTotal - plannedSpent,
      income: periodTxs.filter((t) => t.type === "income").reduce((a, t) => a + txRub(t, rates), 0),
      expense: periodTxs.filter((t) => t.type === "expense").reduce((a, t) => a + txRub(t, rates), 0),
    };
  }, [budget.txs, budget.settings, budget.debts, budget.goals, budget.limits, period]);

  if (budget.loading) return <Splash text="Загрузка…" />;

  return (
    <div style={s.wrap}>
      {budget.error && (
        <div onClick={budget.clearError}
          style={{ background: "#E24B4A", color: "#fff", padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
          {budget.error} — нажми, чтобы скрыть
        </div>
      )}

      {tab === "main" && (
        <Main budget={budget} view={view} period={period} setPeriod={setPeriod}
          onOpenAdd={() => setTab("add")} onOpenHistory={() => setTab("history")} />
      )}
      {tab === "add" && (
        <Add budget={budget} debts={view.debts} goals={view.goals}
          onDone={() => setTab("main")} onBack={() => setTab("main")} />
      )}
      {tab === "history" && (
        <Suspense fallback={<Splash text="Загрузка…" />}>
          <Analytics budget={budget} view={view} period={period} setPeriod={setPeriod}
            onBack={() => setTab("main")} />
        </Suspense>
      )}
      {tab === "plans" && <Plans budget={budget} view={view} session={session} />}

      {tab !== "add" && (
        <>
          <div style={{ height: 90 }} />
          <div style={s.navBar}>
            <button style={s.navBtn(tab === "main")} onClick={() => setTab("main")}>
              <span style={{ fontSize: 22 }}>🏠</span>
              <span style={{ fontSize: 10, fontWeight: tab === "main" ? 700 : 400 }}>Главная</span>
            </button>
            <button style={s.navBtn(tab === "plans")} onClick={() => setTab("plans")}>
              <span style={{ fontSize: 22 }}>📋</span>
              <span style={{ fontSize: 10, fontWeight: tab === "plans" ? 700 : 400 }}>Планы</span>
            </button>
            <button style={{ ...s.navBtn(false), flex: 1.4 }} onClick={() => setTab("add")}>
              <div style={s.bigAddBtn}>+</div>
            </button>
            <button style={s.navBtn(tab === "history")} onClick={() => setTab("history")}>
              <span style={{ fontSize: 22 }}>📊</span>
              <span style={{ fontSize: 10, fontWeight: tab === "history" ? 700 : 400 }}>Аналитика</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { supabase, HOUSEHOLD } from "./supabase";

const DEFAULT_SETTINGS = {
  household_id: HOUSEHOLD,
  rates: { bath: 2.49, byn: 2.5, usd: 91.88 },
  usd_fee: 0.25,
  initial_balances: { rub: 0, bath: 0, byn: 0, usd: 0 },
  start_date: null,
};

// Все данные семьи + подписка на изменения: если Оксана записала расход
// со своего телефона, он появляется здесь сам, без перезагрузки.
export function useBudget(session) {
  const [state, setState] = useState({
    txs: [], debts: [], goals: [], limits: [], plan: [], settings: DEFAULT_SETTINGS,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // К какой семье относится вошедший — берём из базы, а не из константы
  const [household, setHousehold] = useState(HOUSEHOLD);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const { data: me } = await supabase
        .from("budget_members").select("household_id")
        .eq("user_id", session.user.id).maybeSingle();
      const HH = me?.household_id || HOUSEHOLD;
      if (HH !== household) setHousehold(HH);

      const [txs, debts, goals, limits, plan, settings] = await Promise.all([
        supabase.from("budget_transactions").select("*").eq("household_id", HH)
          .order("date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("budget_debts").select("*").eq("household_id", HH)
          .eq("archived", false).order("sort_order"),
        supabase.from("budget_goals").select("*").eq("household_id", HH)
          .eq("archived", false).order("sort_order"),
        supabase.from("budget_limits").select("*").eq("household_id", HH),
        supabase.from("budget_debt_plan").select("*").eq("household_id", HH).order("month"),
        supabase.from("budget_settings").select("*").eq("household_id", HH).maybeSingle(),
      ]);
      const first = [txs, debts, goals, limits, plan, settings].find((r) => r.error);
      if (first) throw first.error;
      setState({
        txs: txs.data || [],
        debts: debts.data || [],
        goals: goals.data || [],
        limits: limits.data || [],
        plan: plan.data || [],
        settings: settings.data || DEFAULT_SETTINGS,
      });
      setError(null);
    } catch (e) {
      setError(e.message || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  // Реалтайм: слушаем изменения во всех таблицах бюджета
  useEffect(() => {
    if (!session) return;
    const ch = supabase.channel("budget-sync");
    ["budget_transactions", "budget_debts", "budget_goals", "budget_limits", "budget_debt_plan", "budget_settings"]
      .forEach((table) => ch.on("postgres_changes", { event: "*", schema: "public", table }, load));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, load]);

  // ─── Действия ────────────────────────────────────────────────────────────
  const run = async (fn) => {
    setBusy(true);
    try {
      const { error: e } = await fn();
      if (e) throw e;
      await load();
      return true;
    } catch (e) {
      setError(e.message || "Ошибка сохранения");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addTx = (tx) => run(() =>
    supabase.from("budget_transactions").insert({
      ...tx, household_id: household, author: session.user.id,
    }));

  const delTx = (id) => run(() =>
    supabase.from("budget_transactions").delete().eq("id", id));

  const setLimit = (month, category, amount, currency = "rub") => run(() =>
    Number(amount) > 0
      ? supabase.from("budget_limits").upsert({
          household_id: household, month, category, amount: Number(amount), currency,
        })
      : supabase.from("budget_limits").delete()
          .eq("household_id", household).eq("month", month).eq("category", category));

  const setPlanMonth = (month, amount) => run(() =>
    Number(amount) > 0
      ? supabase.from("budget_debt_plan").upsert({
          household_id: household, month, amount: Number(amount),
        })
      : supabase.from("budget_debt_plan").delete()
          .eq("household_id", household).eq("month", month));

  const saveSettings = (patch) => run(() =>
    supabase.from("budget_settings").upsert({
      ...state.settings, ...patch, household_id: household, updated_at: new Date().toISOString(),
    }));

  const saveDebt = (debt) => run(() =>
    supabase.from("budget_debts").upsert({ ...debt, household_id: household }));

  const addGoal = (goal) => run(() =>
    supabase.from("budget_goals").insert({ ...goal, household_id: household }));

  const saveGoal = (goal) => run(() =>
    supabase.from("budget_goals").update({
      title: goal.title, target: goal.target, deadline: goal.deadline || null,
    }).eq("id", goal.id));

  const delGoal = (id) => run(() =>
    supabase.from("budget_goals").update({ archived: true }).eq("id", id));

  return {
    ...state, loading, busy, error, clearError: () => setError(null), reload: load,
    addTx, delTx, setLimit, setPlanMonth, saveSettings, saveDebt, addGoal, saveGoal, delGoal,
  };
}

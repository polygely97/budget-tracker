import { useState } from "react";
import { supabase } from "../lib/supabase";
import { s } from "../lib/ui";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password: pass,
    });
    if (error) setErr(error.message === "Invalid login credentials"
      ? "Неверная почта или пароль" : error.message);
    setBusy(false);
  };

  return (
    <div style={{ ...s.wrap, background: "linear-gradient(160deg,#1a1a2e,#0f3460)", paddingBottom: 0 }}>
      <div style={{ padding: "18vh 24px 0", textAlign: "center" }}>
        <div style={{ fontSize: 46, marginBottom: 10 }}>🐿️</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>Бюджет 2026</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
          Полина и Оксана · путь к 7 млн
        </div>

        <form onSubmit={submit} style={{ marginTop: 32, display: "grid", gap: 10 }}>
          <input style={{ ...s.inp, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#fff" }}
            type="email" inputMode="email" autoComplete="username" placeholder="почта"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={{ ...s.inp, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#fff" }}
            type="password" autoComplete="current-password" placeholder="пароль"
            value={pass} onChange={(e) => setPass(e.target.value)} />
          {err && <div style={{ color: "#ff9a9a", fontSize: 13 }}>{err}</div>}
          <button type="submit" disabled={busy || !email || !pass}
            style={{ ...s.primaryBtn("#E24B4A", !busy && !!email && !!pass), marginTop: 6 }}>
            {busy ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

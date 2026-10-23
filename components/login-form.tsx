"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./icons";

export type Mode = "signin" | "signup";

export function LoginForm({ next, linkError, initialMode = "signin" }: { next: string; linkError: boolean; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? "That sign-in link is invalid or has expired. Try again." : null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(next); // full navigation so the server sees the new session cookie
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { terms_accepted_at: new Date().toISOString() }, emailRedirectTo: `${window.location.origin}/auth/confirm` }, // the confirmation mail appends ?token_hash=…
      });
      if (error) throw error;
      if (data.session) { window.location.assign(next); return; }
      setNotice("Check your inbox: we sent a link to confirm your email.");
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      {/* the photo: left half on wide screens, the whole backdrop behind the sheet on phones */}
      <div className="auth-art">
        <Image src="/img/yakitori.jpg" alt="" fill priority sizes="(max-width: 860px) 100vw, 50vw" />
        <p className="auth-jp" lang="ja">いただきます</p>
        <div className="auth-art-copy">
          <p className="auth-art-title">Eat where Japan eats.</p>
          <p className="auth-art-sub">Tabelog’s ratings, the scores locals actually trust, on one English map.</p>
        </div>
      </div>

      <section className="auth-main">
        <header className="auth-head">
          <div className="brand">
            <Logo size={32} />
            <p className="h1">TabeDog</p>
          </div>
          <p className="p2 auth-lead">Your personal map of Tabelog. Sign in to search and save places.</p>
        </header>
        <div className="auth-sheet">
          <form className="auth-card" onSubmit={submit}>
            <div className="seg auth-seg" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "on" : ""} onClick={() => setMode("signin")}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>Create account</button>
            </div>
            <label className="field">
              <span className="sub">Email</span>
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span className="sub">Password</span>
              <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {mode === "signup" && (
              <label className="auth-terms p2">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
                <span>I agree to the <Link href="/terms" target="_blank">Terms of Service</Link> and <Link href="/terms#privacy" target="_blank">Privacy Policy</Link>.</span>
              </label>
            )}
            {error && <p className="p2 auth-error" role="alert">{error}</p>}
            {notice && <p className="p2 auth-notice" role="status">{notice}</p>}
            <button type="submit" className="btn auth-btn" disabled={busy || (mode === "signup" && !agreed)}>
              {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
            <p className="sub auth-or"><span>or</span></p>
            <button type="submit" form="guestForm" className="chip auth-guest">Continue as guest</button>
            <p className="sub auth-guest-note">Search the map without an account. Saved lists need an account.</p>
          </form>
          <p className="sub auth-legal">By continuing you agree to our <Link href="/terms">Terms</Link> and <Link href="/terms#privacy">Privacy Policy</Link>.</p>
        </div>
      </section>
      {/* its own form, since forms can't nest; the button above submits it via form= */}
      <form id="guestForm" action="/auth/guest" method="post" hidden>
        <input type="hidden" name="next" value={next} />
      </form>
    </main>
  );
}

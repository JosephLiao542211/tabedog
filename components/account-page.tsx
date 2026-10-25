"use client";

// /account: the signed-in user's email, password, plan and subscription, plus sign out and delete.
// Email and password changes go straight to Supabase Auth from the browser; billing goes through Stripe's portal.
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PREMIUM_FEATURES, type Feature, type Plan } from "@/lib/plan";
import { Logo, SignOutIcon } from "./icons";
import { ManageBillingButton, PlanBadge, PREMIUM_PRICE_LABEL, UPGRADE_HINT, UpgradeButton } from "./upgrade";

export type SubscriptionInfo = {
  status: string;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  amount: number | null;
  currency: string | null;
  interval: string | null;
  card: { brand: string; last4: string } | null;
};

type Status = { kind: "error" | "ok"; text: string } | null;

const STATUS_LABEL: Record<string, string> = {
  active: "Active", trialing: "Trial", past_due: "Payment overdue", unpaid: "Unpaid",
  canceled: "Cancelled", incomplete: "Incomplete", incomplete_expired: "Expired", paused: "Paused",
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });

/** Stripe amounts are in the currency's smallest unit; yen has none, so ¥500 is 500. */
function fmtPrice(amount: number, currency: string) {
  const f = new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() });
  return f.format(amount / 10 ** (f.resolvedOptions().maximumFractionDigits ?? 2));
}

function Note({ status }: { status: Status }) {
  if (!status) return null;
  return <p className={"p2 " + (status.kind === "error" ? "auth-error" : "auth-notice")} role={status.kind === "error" ? "alert" : "status"}>{status.text}</p>;
}

function Card({ title, lead, children, danger = false }: { title: string; lead?: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={"acct-card" + (danger ? " danger" : "")}>
      <div className="acct-card-head">
        <h2 className="h2">{title}</h2>
        {lead && <p className="sub">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function EmailForm({ email, pendingEmail }: { email: string; pendingEmail: string | null }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(pendingEmail ? { kind: "ok", text: `Waiting for you to confirm ${pendingEmail}. Check both inboxes.` } : null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = value.trim();
    if (next.toLowerCase() === email.toLowerCase()) { setStatus({ kind: "error", text: "That’s already your email." }); return; }
    setBusy(true); setStatus(null);
    const { error } = await createClient().auth.updateUser({ email: next }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` });
    setBusy(false);
    if (error) { setStatus({ kind: "error", text: error.message }); return; }
    setValue("");
    // double_confirm_changes is on: both the old and the new address get a link, and both must be clicked
    setStatus({ kind: "ok", text: `Almost done: click the links we sent to ${email} and ${next}.` });
  }
  return (
    <form className="acct-form" onSubmit={submit}>
      <label className="field">
        <span className="sub">New email</span>
        <input type="email" autoComplete="email" required value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <Note status={status} />
      <button type="submit" className="chip acct-submit" disabled={busy || !value.trim()}>{busy ? "Sending…" : "Change email"}</button>
    </form>
  );
}

function PasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== again) { setStatus({ kind: "error", text: "The new passwords don’t match." }); return; }
    if (next === current) { setStatus({ kind: "error", text: "Pick a password you haven’t been using." }); return; }
    setBusy(true); setStatus(null);
    const supabase = createClient();
    try {
      // Supabase doesn't ask for the old password itself, so check it here before changing anything
      const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current });
      if (wrong) throw new Error("Your current password isn’t right.");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      setCurrent(""); setNext(""); setAgain("");
      setStatus({ kind: "ok", text: "Password updated." });
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="acct-form" onSubmit={submit}>
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <label className="field">
        <span className="sub">Current password</span>
        <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <div className="acct-pair">
        <label className="field">
          <span className="sub">New password</span>
          <input type="password" autoComplete="new-password" required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="field">
          <span className="sub">Repeat new password</span>
          <input type="password" autoComplete="new-password" required minLength={6} value={again} onChange={(e) => setAgain(e.target.value)} />
        </label>
      </div>
      <Note status={status} />
      <button type="submit" className="chip acct-submit" disabled={busy || !current || !next || !again}>{busy ? "Updating…" : "Update password"}</button>
    </form>
  );
}

function Subscription({ plan, premiumUntil, billing, sub }: { plan: Plan; premiumUntil: string | null; billing: boolean; sub: SubscriptionInfo | null }) {
  const features = (Object.keys(PREMIUM_FEATURES) as Feature[]).map((k) => PREMIUM_FEATURES[k]);
  const rows: [string, string][] = [];
  if (sub) {
    rows.push(["Status", sub.cancelAtPeriodEnd && sub.status === "active" ? "Cancels at period end" : STATUS_LABEL[sub.status] ?? sub.status]);
    if (sub.amount != null && sub.currency) rows.push(["Price", `${fmtPrice(sub.amount, sub.currency)}${sub.interval ? ` / ${sub.interval}` : ""}`]);
    if (sub.periodEnd) rows.push([sub.cancelAtPeriodEnd ? "Premium until" : "Renews on", fmtDate(sub.periodEnd)]);
    if (sub.card) rows.push(["Card", `${sub.card.brand[0].toUpperCase()}${sub.card.brand.slice(1)} ending ${sub.card.last4}`]);
  } else if (plan === "premium") {
    rows.push(["Premium until", premiumUntil ? fmtDate(premiumUntil) : "No end date"]);
  }
  return (
    <>
      <div className="acct-plan">
        <PlanBadge plan={plan} />
        <span className="p2">{plan === "premium" ? "Everything is unlocked." : "Search is free. Premium adds:"}</span>
      </div>
      {plan === "free" && <ul className="p2 upgrade-list">{features.map((f) => <li key={f.title}>{f.title}</li>)}</ul>}
      {rows.length > 0 && (
        <dl className="acct-rows">
          {rows.map(([k, v]) => <div key={k}><dt className="sub">{k}</dt><dd className="p1">{v}</dd></div>)}
        </dl>
      )}
      <div className="acct-actions">
        {plan === "free" && (billing ? <><UpgradeButton /><p className="sub">{PREMIUM_PRICE_LABEL}</p></> : <p className="sub">{UPGRADE_HINT}</p>)}
        {plan === "premium" && billing && sub && <><ManageBillingButton /><p className="sub">Change your card, see invoices or cancel on Stripe.</p></>}
        {plan === "premium" && !sub && <p className="sub">Your Premium was granted by the TabeDog admin, so there’s nothing to manage or pay.</p>}
      </div>
    </>
  );
}

function DeleteAccount({ email, hasSub }: { email: string; hasSub: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setStatus(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Couldn’t delete your account.");
      window.location.assign("/");
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  }
  if (!open) return <button type="button" className="chip acct-danger" onClick={() => setOpen(true)}>Delete account…</button>;
  return (
    <form className="acct-form" onSubmit={submit}>
      <p className="p2">This deletes your account and every saved list, for good.{hasSub ? " Your subscription is cancelled right away, with no refund for the rest of this period." : ""}</p>
      <label className="field">
        <span className="sub">Type <b>{email}</b> to confirm</span>
        <input type="email" autoComplete="off" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <Note status={status} />
      <div className="acct-row-btns">
        <button type="button" className="chip" onClick={() => { setOpen(false); setConfirm(""); setStatus(null); }}>Keep my account</button>
        <button type="submit" className="chip acct-danger" disabled={busy || confirm.trim().toLowerCase() !== email.toLowerCase()}>{busy ? "Deleting…" : "Delete forever"}</button>
      </div>
    </form>
  );
}

export function AccountPage({ email, pendingEmail, memberSince, plan, premiumUntil, billing, subscription, note }: {
  email: string; pendingEmail: string | null; memberSince: string; plan: Plan; premiumUntil: string | null;
  billing: boolean; subscription: SubscriptionInfo | null; note: string | null;
}) {
  return (
    <div className="site acct">
      <header className="site-header">
        <Link href="/" className="site-brand" aria-label="TabeDog home">
          <Logo size={24} />
          <span className="site-brand-name">TabeDog</span>
        </Link>
        <div className="site-actions">
          <a href="/" className="site-btn">Back to the map</a>
        </div>
      </header>
      <main>
        <section className="site-hero site-hero-page">
          <p className="site-kicker">アカウント</p>
          <h1>Your account</h1>
          <p className="site-lead2">Signed in as <b>{email}</b> · member since {fmtDate(memberSince)}</p>
        </section>
        {note && <p className="p2 acct-banner" role="status">{note}</p>}

        <div className="acct-grid">
          <Card title="Subscription" lead={plan === "premium" ? "TabeDog Premium" : "TabeDog Free"}>
            <Subscription plan={plan} premiumUntil={premiumUntil} billing={billing} sub={subscription} />
          </Card>
          <Card title="Email" lead={`You sign in with ${email}.`}>
            <EmailForm email={email} pendingEmail={pendingEmail} />
          </Card>
          <Card title="Password" lead="At least 6 characters.">
            <PasswordForm email={email} />
          </Card>
          <Card title="Sign out or leave" danger>
            <form action="/auth/signout" method="post">
              <button type="submit" className="chip"><SignOutIcon />Sign out</button>
            </form>
            <DeleteAccount email={email} hasSub={!!subscription && subscription.status !== "canceled"} />
          </Card>
        </div>
      </main>
    </div>
  );
}

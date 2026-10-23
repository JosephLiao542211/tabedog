"use client";

// What a free user sees when they tap a premium feature: what it is, and how to get it.
import { useEffect, useRef } from "react";
import { PLAN_LABEL, PREMIUM_FEATURES, type Feature, type Plan } from "@/lib/plan";
import { GUEST_SEARCH_LIMIT } from "@/lib/guest";
import { SearchIcon, SparkIcon } from "./icons";

export const UPGRADE_HINT = "Premium is granted per account for now. Ask the TabeDog admin to upgrade you.";
export const PREMIUM_PRICE_LABEL = "¥500 / month · cancel any time";

/** Posts to Stripe Checkout. A plain form so it works as a full navigation (Stripe redirects back). */
export function UpgradeButton({ className = "btn" }: { className?: string }) {
  return (
    <form action="/api/billing/checkout" method="post" className="upgrade-form">
      <button type="submit" className={className}><SparkIcon size={14} />Upgrade to Premium</button>
    </form>
  );
}

export function ManageBillingButton() {
  return (
    <form action="/api/billing/portal" method="post" className="upgrade-form">
      <button type="submit" className="chip">Manage subscription</button>
    </form>
  );
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return <span className={"plan-badge " + plan}>{plan === "premium" && <SparkIcon size={11} />}{PLAN_LABEL[plan]}</span>;
}

/** Popover explaining that `feature` needs Premium. Closes on outside click or Escape. */
export function UpgradePrompt({ feature, id, billing, guest = false, onClose }: { feature: Feature; id?: string; billing: boolean; guest?: boolean; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) onClose(); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("click", onDoc, true);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("click", onDoc, true); document.removeEventListener("keydown", onKey, true); };
  }, [onClose]);
  const f = PREMIUM_FEATURES[feature];
  return (
    <div id={id} className="float upgrade" ref={box} role="dialog" aria-label="Premium feature" onClick={(e) => e.stopPropagation()}>
      <p className="sub"><SparkIcon size={12} /> Premium feature</p>
      <p className="h2">{f.title}</p>
      <p className="p2">{f.blurb}</p>
      <ul className="p2 upgrade-list">
        {(Object.keys(PREMIUM_FEATURES) as Feature[]).map((k) => <li key={k}>{PREMIUM_FEATURES[k].title}</li>)}
      </ul>
      {guest ? <><a href="/login?mode=signup" className="btn">Create a free account</a><p className="sub">You’re browsing as a guest. Sign up first, then upgrade.</p></>
        : billing ? <><UpgradeButton /><p className="sub">{PREMIUM_PRICE_LABEL}</p></> : <p className="sub">{UPGRADE_HINT}</p>}
    </div>
  );
}

/** Modal for a guest who has used up this hour's searches: a free account (unlimited search) or Premium (everything). */
export function GuestLimitPrompt({ resetAt, billing, onClose }: { resetAt: number; billing: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const at = new Date(resetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <div className="scrim" onClick={onClose}>
      <div className="float guest-wall" role="dialog" aria-modal="true" aria-labelledby="guestWallTitle" onClick={(e) => e.stopPropagation()}>
        <p className="sub guest-wall-kicker"><SearchIcon />Guest limit reached</p>
        <p className="h1" id="guestWallTitle">You’ve used your {GUEST_SEARCH_LIMIT} free searches</p>
        <p className="p2 guest-wall-lead">Guests get {GUEST_SEARCH_LIMIT} searches an hour. Make an account to keep going, it takes a few seconds.</p>
        <div className="guest-plans">
          <a href="/login?mode=signup" className="guest-plan">
            <span className="h2">Free account</span>
            <span className="p2">Unlimited searches</span>
            <span className="sub">Free forever</span>
          </a>
          <a href="/login?mode=signup" className="guest-plan premium">
            <span className="h2"><SparkIcon size={13} />Premium</span>
            <span className="p2">Unlimited searches, {(Object.keys(PREMIUM_FEATURES) as Feature[]).map((k) => PREMIUM_FEATURES[k].title.toLowerCase()).join(", ")}</span>
            <span className="sub">{billing ? PREMIUM_PRICE_LABEL : "Upgrade after signing up"}</span>
          </a>
        </div>
        <button type="button" className="link guest-wall-later" onClick={onClose}>Maybe later · searches reset at {at}</button>
      </div>
    </div>
  );
}

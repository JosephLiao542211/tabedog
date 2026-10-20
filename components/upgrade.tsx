"use client";

// What a free user sees when they tap a premium feature: what it is, and how to get it.
import { useEffect, useRef } from "react";
import { PLAN_LABEL, PREMIUM_FEATURES, type Feature, type Plan } from "@/lib/plan";
import { SparkIcon } from "./icons";

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
export function UpgradePrompt({ feature, id, billing, onClose }: { feature: Feature; id?: string; billing: boolean; onClose: () => void }) {
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
      {billing ? <><UpgradeButton /><p className="sub">{PREMIUM_PRICE_LABEL}</p></> : <p className="sub">{UPGRADE_HINT}</p>}
    </div>
  );
}

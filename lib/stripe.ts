// Stripe client and the one product we sell: TabeDog Premium, a monthly subscription.
// Env: STRIPE_SECRET_KEY (required), STRIPE_WEBHOOK_SECRET (required for the webhook),
//      STRIPE_PRICE_ID (optional; otherwise a ¥500/month price is created once and found again by lookup key).
import Stripe from "stripe";

export const PREMIUM_LOOKUP_KEY = "tabedog_premium_monthly";
const DEFAULT_PRICE = { currency: "jpy", unit_amount: 500, interval: "month" as const };

let client: Stripe | null = null;

export class BillingNotConfigured extends Error {}

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingNotConfigured("STRIPE_SECRET_KEY is not set");
  if (!key.startsWith("sk_") && !key.startsWith("rk_")) throw new BillingNotConfigured("STRIPE_SECRET_KEY must be a secret key (sk_…), not a publishable key");
  client ??= new Stripe(key, { appInfo: { name: "TabeDog" } });
  return client;
}

/** True once the server has what it needs to sell Premium. The UI uses this to show or hide the Upgrade button. */
export const billingEnabled = () => /^(sk|rk)_/.test(process.env.STRIPE_SECRET_KEY ?? "");

let priceId: string | null = null;

/** The Premium price: STRIPE_PRICE_ID if set, else the price tagged with our lookup key, created on first use. */
export async function getPremiumPriceId(): Promise<string> {
  if (process.env.STRIPE_PRICE_ID) return process.env.STRIPE_PRICE_ID;
  if (priceId) return priceId;
  const s = stripe();
  const found = await s.prices.list({ lookup_keys: [PREMIUM_LOOKUP_KEY], active: true, limit: 1 });
  if (found.data[0]) return (priceId = found.data[0].id);
  const price = await s.prices.create({
    lookup_key: PREMIUM_LOOKUP_KEY,
    currency: DEFAULT_PRICE.currency,
    unit_amount: DEFAULT_PRICE.unit_amount,
    recurring: { interval: DEFAULT_PRICE.interval },
    product_data: { name: "TabeDog Premium" },
  });
  return (priceId = price.id);
}

/** Where Stripe should send people back to. */
export const appOrigin = (request: Request) => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;

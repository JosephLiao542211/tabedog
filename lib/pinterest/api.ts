// Pinterest API v5: OAuth for the one connected account, token refresh, boards, and creating pins.
// Env: PINTEREST_APP_ID, PINTEREST_APP_SECRET; PINTEREST_SANDBOX=1 to post to the sandbox (Trial access
// apps can only write there). Tokens live in pinterest_account (service role only).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board } from "./design";

export const SCOPES = ["boards:read", "boards:write", "pins:read", "pins:write", "user_accounts:read"];
export const sandbox = () => process.env.PINTEREST_SANDBOX === "1";
const api = () => `https://${sandbox() ? "api-sandbox" : "api"}.pinterest.com/v5`;

export const pinterestConfigured = () => !!(process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET);
export const redirectUri = (origin: string) => `${origin}/api/admin/pinterest/callback`;

export function authorizeUrl(origin: string, state: string) {
  return `https://www.pinterest.com/oauth/?${new URLSearchParams({
    client_id: process.env.PINTEREST_APP_ID!, redirect_uri: redirectUri(origin), response_type: "code", scope: SCOPES.join(","), state,
  })}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; refresh_token_expires_in?: number; refresh_token_expires_at?: number; scope?: string };
export type Account = { username: string; access_token: string; refresh_token: string | null; access_expires_at: string; refresh_expires_at: string | null; sandbox: boolean; scope: string };

async function errorText(res: Response) {
  const body = await res.text().catch(() => "");
  try { const j = JSON.parse(body); return `${res.status} ${j.message ?? body}`; } catch { return `${res.status} ${body.slice(0, 300) || res.statusText}`; }
}

async function token(params: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString("base64");
  const res = await fetch(`${api()}/oauth/token`, {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`Pinterest token: ${await errorText(res)}`);
  return res.json();
}

function tokenRow(t: TokenResponse, prev?: Pick<Account, "refresh_token" | "refresh_expires_at">) {
  const refreshExp = t.refresh_token_expires_at ? new Date(t.refresh_token_expires_at * 1000)
    : t.refresh_token_expires_in ? new Date(Date.now() + t.refresh_token_expires_in * 1000) : null;
  return {
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? prev?.refresh_token ?? null,
    access_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    refresh_expires_at: refreshExp?.toISOString() ?? prev?.refresh_expires_at ?? null,
    ...(t.scope ? { scope: t.scope } : {}),
    refreshed_at: new Date().toISOString(),
  };
}

async function call<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${api()}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Pinterest ${path.split("?")[0]}: ${await errorText(res)}`);
  return res.json();
}

/** Trades the OAuth code for tokens and saves the account. */
export async function connect(admin: SupabaseClient, code: string, origin: string) {
  const t = await token({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin) });
  const me = await call<{ username?: string }>(t.access_token, "/user_account").catch(() => ({ username: "" }));
  const res = await admin.from("pinterest_account").upsert({ id: 1, username: me.username ?? "", sandbox: sandbox(), connected_at: new Date().toISOString(), ...tokenRow(t) });
  if (res.error) throw new Error(res.error.message);
}

export async function getAccount(admin: SupabaseClient): Promise<Account | null> {
  const { data } = await admin.from("pinterest_account").select("username, access_token, refresh_token, access_expires_at, refresh_expires_at, sandbox, scope").eq("id", 1).maybeSingle();
  return data as Account | null;
}

const DAY = 86400_000;

/**
 * A working access token, refreshed when it has under a week left. Pinterest's continuous refresh
 * tokens last 60 days and renew on every refresh, so a pipeline that runs at least monthly stays connected.
 */
export async function accessToken(admin: SupabaseClient): Promise<string> {
  const acct = await getAccount(admin);
  if (!acct) throw new Error("Pinterest isn't connected. Connect it on the Pinterest page.");
  if (acct.sandbox !== sandbox()) throw new Error(`The saved token is for the ${acct.sandbox ? "sandbox" : "live"} API but PINTEREST_SANDBOX says otherwise. Reconnect.`);
  if (new Date(acct.access_expires_at).getTime() - Date.now() > 7 * DAY) return acct.access_token;
  if (!acct.refresh_token) throw new Error("The Pinterest token is expiring and there's no refresh token. Reconnect.");
  try {
    const t = await token({ grant_type: "refresh_token", refresh_token: acct.refresh_token });
    const row = tokenRow(t, acct);
    await admin.from("pinterest_account").update(row).eq("id", 1);
    return row.access_token;
  } catch (e) {
    if (new Date(acct.access_expires_at).getTime() > Date.now()) return acct.access_token; // still valid; retry next time
    throw new Error(`Pinterest login expired (${e instanceof Error ? e.message : e}). Reconnect.`);
  }
}

export async function listBoards(admin: SupabaseClient): Promise<Board[]> {
  const at = await accessToken(admin);
  const boards: Board[] = [];
  let bookmark: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await call<{ items: { id: string; name: string }[]; bookmark?: string | null }>(at, `/boards?${new URLSearchParams({ page_size: "100", ...(bookmark ? { bookmark } : {}) })}`);
    boards.push(...page.items.map((b) => ({ id: b.id, name: b.name })));
    if (!page.bookmark) break;
    bookmark = page.bookmark;
  }
  return boards;
}

export async function createBoard(admin: SupabaseClient, name: string, description = ""): Promise<Board> {
  const b = await call<{ id: string; name: string }>(await accessToken(admin), "/boards", { method: "POST", body: JSON.stringify({ name, description, privacy: "PUBLIC" }) });
  return { id: b.id, name: b.name };
}

export async function createPin(admin: SupabaseClient, pin: { boardId: string; title: string; description: string; altText: string; link: string; jpeg: Buffer }) {
  return call<{ id: string }>(await accessToken(admin), "/pins", {
    method: "POST",
    body: JSON.stringify({
      board_id: pin.boardId, title: pin.title, description: pin.description, alt_text: pin.altText, link: pin.link,
      media_source: { source_type: "image_base64", content_type: "image/jpeg", data: pin.jpeg.toString("base64") },
    }),
  });
}

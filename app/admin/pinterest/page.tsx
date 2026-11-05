import { requireBlogAdmin } from "@/lib/blog-server";
import { AGENT_MODELS } from "@/lib/blog-agent/agent";
import { getAccount, listBoards, pinterestConfigured, sandbox } from "@/lib/pinterest/api";
import { postPhotos, type Board, type Pin, type PinterestSettings, type PostPhoto } from "@/lib/pinterest/design";
import { PinterestDashboard } from "@/components/pinterest/dashboard";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // generating pins is one model call that can take a minute

export default async function PinterestPage({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string; post?: string }> }) {
  const { admin } = await requireBlogAdmin("/admin/pinterest");
  const q = await searchParams;
  const [settings, pins, posts, account] = await Promise.all([
    admin.from("pinterest_settings").select("*").eq("id", 1).maybeSingle(),
    admin.from("pins").select("*").order("position").order("created_at"),
    admin.from("posts").select("id, slug, title, cover_url, cover_alt, content, published_at").eq("status", "published").order("published_at", { ascending: false }),
    getAccount(admin),
  ]);
  if (settings.error || pins.error) {
    return <main className="cms-main"><div className="cms-head"><h1>Pinterest</h1></div><p className="cms-error">{(settings.error ?? pins.error)!.message}. Has the pinterest migration been applied?</p></main>;
  }
  let boards: Board[] = [], boardsError = "";
  if (account) boards = await listBoards(admin).catch((e: Error) => { boardsError = e.message; return []; });

  // photos per post, for swapping a pin's photo in the editor (only posts that have pins, plus the preselected one)
  const pinned = new Set((pins.data as Pin[]).map((p) => p.post_id));
  const photos: Record<string, PostPhoto[]> = {};
  for (const p of posts.data ?? []) if (pinned.has(p.id)) photos[p.id] = postPhotos(p);

  return (
    <PinterestDashboard
      settings={settings.data as PinterestSettings}
      pins={pins.data as Pin[]}
      posts={(posts.data ?? []).map((p) => ({ id: p.id, slug: p.slug, title: p.title, cover_url: p.cover_url, pins: (pins.data as Pin[]).filter((x) => x.post_id === p.id).length }))}
      photos={photos}
      boards={boards}
      account={account && { username: account.username, sandbox: account.sandbox, access_expires_at: account.access_expires_at, refresh_expires_at: account.refresh_expires_at }}
      configured={pinterestConfigured()}
      sandbox={sandbox()}
      cronReady={!!process.env.CRON_SECRET}
      models={AGENT_MODELS}
      notice={{ error: q.error ?? boardsError, connected: q.connected === "1" }}
      preselect={q.post}
    />
  );
}

import { requireBlogAdmin } from "@/lib/blog-server";
import { AGENT_MODELS } from "@/lib/blog-agent/agent";
import type { QueueItem, QueueSettings } from "@/lib/blog-agent/runs";
import { BlogQueue, type QueueRow } from "@/components/blog/admin/queue";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const { admin } = await requireBlogAdmin("/admin/blog/queue");
  const [settings, items] = await Promise.all([
    admin.from("blog_queue_settings").select("enabled, interval_hours, model, auto_publish, last_run_at").eq("id", 1).maybeSingle(),
    admin.from("blog_queue").select("*, run:blog_agent_runs(title, status, post_id)").order("position").order("created_at"),
  ]);
  if (settings.error || items.error) {
    return <main className="cms-main"><div className="cms-head"><h1>Queue</h1></div><p className="cms-error">{(settings.error ?? items.error)!.message}. Has the blog_agent_runs migration been applied?</p></main>;
  }
  return (
    <BlogQueue
      settings={(settings.data ?? { enabled: false, interval_hours: 4, model: "claude-opus-5-5", auto_publish: false, last_run_at: null }) as QueueSettings}
      items={items.data as (QueueItem & { run: QueueRow["run"] })[]}
      models={AGENT_MODELS}
      cronReady={!!process.env.CRON_SECRET}
    />
  );
}

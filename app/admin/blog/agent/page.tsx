import { requireBlogAdmin } from "@/lib/blog-server";
import { CITIES } from "@/lib/seo";
import { AGENT_MODELS, DEFAULT_MODEL } from "@/lib/blog-agent/agent";
import { DraftAgent } from "@/components/blog/admin/draft-agent";

export const dynamic = "force-dynamic";

export default async function DraftAgentPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  await requireBlogAdmin("/admin/blog/agent");
  const { run } = await searchParams;
  return <DraftAgent cities={CITIES.map((c) => ({ slug: c.slug, name: c.name }))} models={AGENT_MODELS} defaultModel={DEFAULT_MODEL} apiKeySet={!!process.env.ANTHROPIC_API_KEY} initialRun={run ?? null} />;
}

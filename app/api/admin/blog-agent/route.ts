// Streams the blog agent to the dashboard. Admins only; everyone else gets a 404.
import { createAgentUIStreamResponse } from "ai";
import { blogAgent, AGENT_MODELS, type AgentModel } from "@/lib/blog-agent/agent";
import { blogAdmin } from "@/lib/blog-server";

export const maxDuration = 300; // research plus writing takes a few minutes

export async function POST(req: Request) {
  if (!(await blogAdmin())) return new Response("Not found", { status: 404 });
  const { messages, model } = await req.json();
  return createAgentUIStreamResponse({
    agent: blogAgent,
    uiMessages: messages,
    options: { model: model in AGENT_MODELS ? (model as AgentModel) : undefined },
    // admin-only, so show the real reason (billing, rate limits, overload) instead of "An error occurred."
    onError: (e) => (e instanceof Error ? e.message : String(e)),
  });
}

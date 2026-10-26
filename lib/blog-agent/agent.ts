// The blog drafting agent: researches on Tabelog and the web, finds photos, and hands back a
// structured draft (presentDraft) the dashboard turns into a post. Runs on the Anthropic API
// directly (ANTHROPIC_API_KEY).
import "server-only"; // holds ANTHROPIC_API_KEY: a client import fails the build
import { anthropic } from "@ai-sdk/anthropic";
import { ToolLoopAgent, isStepCount, type InferAgentUIMessage } from "ai";
import { z } from "zod";
import { instructions } from "./prompt";
import { blogTools } from "./tools";

export const AGENT_MODELS = {
  "claude-opus-5-5": "Claude Opus 5.5 (best writing)",
  "claude-sonnet-5-5": "Claude Sonnet 5.5 (faster, cheaper)",
} as const;
export type AgentModel = keyof typeof AGENT_MODELS;
export const DEFAULT_MODEL: AgentModel = (process.env.BLOG_AGENT_MODEL as AgentModel) in AGENT_MODELS ? (process.env.BLOG_AGENT_MODEL as AgentModel) : "claude-opus-5-5";

export const blogAgent = new ToolLoopAgent({
  model: anthropic(DEFAULT_MODEL),
  instructions: instructions(),
  tools: blogTools,
  stopWhen: isStepCount(40),
  maxOutputTokens: 32000, // thinking counts toward the limit, and a full draft goes out as one presentDraft call
  providerOptions: { anthropic: { effort: "high" } },
  callOptionsSchema: z.object({ model: z.enum(Object.keys(AGENT_MODELS) as [AgentModel, ...AgentModel[]]).optional() }),
  // rebuilt per call so "today" and "ratings as of" stay current on a long-lived instance
  prepareCall: ({ options, ...settings }) => ({ ...settings, instructions: instructions(), ...(options?.model ? { model: anthropic(options.model) } : {}) }),
});

export type BlogAgentMessage = InferAgentUIMessage<typeof blogAgent>;

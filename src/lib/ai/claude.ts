import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const SOP_MODEL = "claude-sonnet-4-20250514";
export const INSIGHT_MODEL = "claude-sonnet-4-20250514";
export const CHAT_MODEL = "claude-sonnet-4-20250514";
export const ENRICHMENT_MODEL = "claude-sonnet-4-20250514";

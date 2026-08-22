import "server-only";

import { getLLMProvider } from "@/lib/llm";

/** Lightweight server smoke check - does not call the network unless asked. */
export async function assertClaudeConfigured(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing");
  }
  // Instantiating provider must not throw; key checked on first call.
  getLLMProvider("claude");
}

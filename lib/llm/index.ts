import "server-only";

import { ClaudeProvider } from "@/lib/llm/claude-provider";
import { LocalModelProvider } from "@/lib/llm/local-provider";
import { OpenAIProvider } from "@/lib/llm/openai-provider";
import type { LLMProvider } from "@/lib/llm/types";

export type LLMProviderId = "claude" | "openai" | "local";

export function getLLMProvider(providerId?: LLMProviderId): LLMProvider {
  const id = (providerId ??
    (process.env.LLM_PROVIDER as LLMProviderId | undefined) ??
    "claude") as LLMProviderId;

  switch (id) {
    case "claude":
      return new ClaudeProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        defaultModel: process.env.ANTHROPIC_MODEL,
      });
    case "openai":
      return new OpenAIProvider();
    case "local":
      return new LocalModelProvider();
    default:
      throw new Error(`Unknown LLM provider: ${String(id)}`);
  }
}

export type {
  LLMContextChannels,
  LLMMessage,
  LLMProvider,
  LLMRequest,
  LLMResponse,
  JSONSchemaLike,
} from "@/lib/llm/types";
export { assembleMessages } from "@/lib/llm/assemble";

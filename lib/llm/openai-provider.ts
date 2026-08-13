import "server-only";

import type { JSONSchemaLike, LLMProvider, LLMRequest, LLMResponse } from "@/lib/llm/types";

/** Placeholder for future OpenAI integration. */
export class OpenAIProvider implements LLMProvider {
  readonly id = "openai";

  async complete(_request: LLMRequest): Promise<LLMResponse> {
    throw new Error("OpenAIProvider is a stub. Use ClaudeProvider for MVP.");
  }

  async completeStructured<T>(
    _request: LLMRequest,
    _schema: JSONSchemaLike,
  ): Promise<{ data: T; response: LLMResponse }> {
    throw new Error("OpenAIProvider is a stub. Use ClaudeProvider for MVP.");
  }
}

import "server-only";

import type { JSONSchemaLike, LLMProvider, LLMRequest, LLMResponse } from "@/lib/llm/types";

/** Placeholder for future open-weight / local models. */
export class LocalModelProvider implements LLMProvider {
  readonly id = "local";

  async complete(_request: LLMRequest): Promise<LLMResponse> {
    throw new Error("LocalModelProvider is a stub.");
  }

  async completeStructured<T>(
    _request: LLMRequest,
    _schema: JSONSchemaLike,
  ): Promise<{ data: T; response: LLMResponse }> {
    throw new Error("LocalModelProvider is a stub.");
  }
}

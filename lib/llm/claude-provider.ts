import "server-only";

import { assembleMessages } from "@/lib/llm/assemble";
import type {
  JSONSchemaLike,
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from "@/lib/llm/types";

/**
 * Claude implementation skeleton.
 * Phase 1 will wire @anthropic-ai/sdk. Phase 0 keeps the boundary without
 * requiring the SDK dependency until the MVP slice needs live calls.
 */
export class ClaudeProvider implements LLMProvider {
  readonly id = "claude";

  constructor(
    private readonly options: {
      apiKey?: string;
      defaultModel?: string;
    } = {},
  ) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model =
      request.model ?? this.options.defaultModel ?? "claude-sonnet-4-20250514";
    const messages = assembleMessages(request);

    if (!this.options.apiKey) {
      throw new Error(
        "ClaudeProvider: ANTHROPIC_API_KEY is not configured. Set it before live calls.",
      );
    }

    // Intentionally not calling Anthropic yet — Phase 1 wires the SDK.
    void messages;
    throw new Error(
      `ClaudeProvider.complete is scaffolded but not live yet (model=${model}). Wire @anthropic-ai/sdk in Phase 1.`,
    );
  }

  async completeStructured<T>(
    request: LLMRequest,
    schema: JSONSchemaLike,
  ): Promise<{ data: T; response: LLMResponse }> {
    void schema;
    const response = await this.complete(request);
    throw new Error(
      `ClaudeProvider.completeStructured not implemented yet. Received text length=${response.text.length}`,
    );
  }
}

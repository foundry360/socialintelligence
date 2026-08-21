import "server-only";

import { assembleMessages } from "@/lib/llm/assemble";
import type {
  JSONSchemaLike,
  LLMMessage,
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from "@/lib/llm/types";
import Anthropic from "@anthropic-ai/sdk";

function toAnthropicMessages(
  messages: LLMMessage[],
): { system?: string; messages: Anthropic.MessageParam[] } {
  const systemParts: string[] = [];
  const out: Anthropic.MessageParam[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(message.content);
      continue;
    }
    if (message.role === "user" || message.role === "assistant") {
      out.push({ role: message.role, content: message.content });
    }
  }

  return {
    system: systemParts.length ? systemParts.join("\n\n") : undefined,
    messages: out,
  };
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export class ClaudeProvider implements LLMProvider {
  readonly id = "claude";
  private client: Anthropic | null = null;

  constructor(
    private readonly options: {
      apiKey?: string;
      defaultModel?: string;
    } = {},
  ) {}

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = this.options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ClaudeProvider: ANTHROPIC_API_KEY is not configured.",
      );
    }
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model =
      request.model ??
      this.options.defaultModel ??
      process.env.ANTHROPIC_MODEL ??
      "claude-sonnet-4-5";

    const assembled = assembleMessages(request);
    const { system, messages } = toAnthropicMessages(assembled);

    if (messages.length === 0) {
      throw new Error("ClaudeProvider: no user/assistant messages to send");
    }

    const result = await this.getClient().messages.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
      system,
      messages,
    });

    return {
      text: extractText(result.content),
      model: result.model,
      providerId: this.id,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
      raw: result,
    };
  }

  async completeStructured<T>(
    request: LLMRequest,
    schema: JSONSchemaLike,
  ): Promise<{ data: T; response: LLMResponse }> {
    const model =
      request.model ??
      this.options.defaultModel ??
      process.env.ANTHROPIC_MODEL ??
      "claude-sonnet-4-5";

    const assembled = assembleMessages(request);
    const { system, messages } = toAnthropicMessages(assembled);

    const toolName = schema.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);

    const result = await this.getClient().messages.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0,
      system,
      messages,
      tools: [
        {
          name: toolName,
          description: schema.description ?? `Return ${schema.name}`,
          input_schema: schema.schema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: toolName },
    });

    const toolBlock = result.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (!toolBlock) {
      throw new Error("ClaudeProvider: structured response missing tool_use");
    }

    const response: LLMResponse = {
      text: JSON.stringify(toolBlock.input),
      model: result.model,
      providerId: this.id,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
      raw: result,
    };

    return { data: toolBlock.input as T, response };
  }
}

/**
 * Model-agnostic LLM contracts.
 * Domain code must depend on these types — never on vendor SDKs.
 */

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

/** Separated prompt channels for injection safety. */
export interface LLMContextChannels {
  systemInstructions: string;
  /** Structured profile/POVs/etc. Trusted curated data. */
  tenantKnowledge?: string;
  /**
   * Accepted knowledge-base sources (notes, imported URLs).
   * Trusted as curated evidence — NOT the same as externalUntrusted market signals.
   */
  acceptedEvidence?: string;
  /** Market signals / raw web not yet accepted — untrusted. */
  externalUntrusted?: string;
  userInput?: string;
}

export interface LLMRequest {
  messages?: LLMMessage[];
  /** Preferred over raw messages when assembling safe prompts. */
  channels?: LLMContextChannels;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: {
    tenantId?: string;
    promptName?: string;
    promptVersion?: string;
    purpose?: string;
  };
}

export interface LLMUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface LLMResponse {
  text: string;
  model: string;
  providerId: string;
  usage?: LLMUsage;
  raw?: unknown;
}

export interface JSONSchemaLike {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
}

export interface LLMProvider {
  readonly id: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
  completeStructured<T>(
    request: LLMRequest,
    schema: JSONSchemaLike,
  ): Promise<{ data: T; response: LLMResponse }>;
}

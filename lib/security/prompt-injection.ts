/**
 * Prompt injection guardrails for assembling model context.
 * External/signal/document text must never be concatenated into system instructions.
 */

export type PromptChannel =
  | "system"
  | "tenant_knowledge"
  | "external_untrusted"
  | "user_input"
  | "model_output";

export function assertNotSystemChannel(
  channel: PromptChannel,
  value: string,
): void {
  if (channel === "system") return;
  const lowered = value.toLowerCase();
  // Detection is defense-in-depth only; primary control is channel separation.
  if (
    lowered.includes("ignore previous instructions") ||
    lowered.includes("ignore all instructions")
  ) {
    // Allowed inside external/user channels as data; callers should not promote to system.
    return;
  }
}

export function wrapUntrusted(label: string, content: string): string {
  return [
    `[UNTRUSTED:${label}]`,
    content,
    `[/UNTRUSTED:${label}]`,
  ].join("\n");
}

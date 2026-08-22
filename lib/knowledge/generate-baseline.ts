import "server-only";

import { buildStructuredKnowledgeText } from "@/lib/knowledge/context";
import { getLLMProvider } from "@/lib/llm";
import { loadPrompt } from "@/lib/prompts/load";
import { createClient } from "@/lib/db/server";

export type GeneratedBaselinePayload = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
  povCoverageNotes: string;
  trustMixNotes: string;
  recommendedActions: string[];
  citationSourceIds: string[];
};

type BaselineStructuredOutput = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
  povCoverageNotes: string;
  trustMixNotes: string;
  recommendedActions: string[];
};

const baselineSchema = {
  name: "authority_baseline",
  description: "Versioned authority baseline draft for human review",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      weaknesses: { type: "array", items: { type: "string" } },
      gaps: { type: "array", items: { type: "string" } },
      povCoverageNotes: { type: "string" },
      trustMixNotes: { type: "string" },
      recommendedActions: { type: "array", items: { type: "string" } },
    },
    required: [
      "summary",
      "strengths",
      "weaknesses",
      "gaps",
      "povCoverageNotes",
      "trustMixNotes",
      "recommendedActions",
    ],
  },
} as const;

export async function isKnowledgeSpineComplete(tenantId: string): Promise<boolean> {
  const supabase = await createClient();

  const [
    { data: profile },
    { count: industryCount },
    { count: capabilityCount },
    { count: personaCount },
    { count: questionCount },
    { count: povCount },
    { count: proofCount },
    { count: termCount },
  ] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("display_name, legal_name, summary, positioning")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("industries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("capabilities")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("personas")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("market_questions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("points_of_view")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("proof_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("terminology_entries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
  ]);

  const profileDone = Boolean(
    profile?.display_name?.trim() &&
      profile?.legal_name?.trim() &&
      (profile?.summary?.trim() || profile?.positioning?.trim()),
  );

  return (
    profileDone &&
    (industryCount ?? 0) > 0 &&
    (capabilityCount ?? 0) > 0 &&
    (personaCount ?? 0) > 0 &&
    (questionCount ?? 0) > 0 &&
    (povCount ?? 0) > 0 &&
    (proofCount ?? 0) > 0 &&
    (termCount ?? 0) > 0
  );
}

export async function generateAuthorityBaselineDraft(
  tenantId: string,
  options: { requireSpineComplete?: boolean } = {},
): Promise<GeneratedBaselinePayload> {
  const requireSpineComplete = options.requireSpineComplete ?? true;
  if (requireSpineComplete) {
    const spineComplete = await isKnowledgeSpineComplete(tenantId);
    if (!spineComplete) {
      throw new Error(
        "Complete all Knowledge categories before generating a baseline.",
      );
    }
  }

  const structured = await buildStructuredKnowledgeText(tenantId);
  if (!structured.trim()) {
    throw new Error("Structured knowledge is empty.");
  }

  const prompt = await loadPrompt("authority-baseline", 1);
  const llm = getLLMProvider("claude");

  const { data } = await llm.completeStructured<BaselineStructuredOutput>(
    {
      channels: {
        systemInstructions: prompt.body,
        tenantKnowledge: structured,
        userInput:
          "Generate the Authority Baseline draft from the structured tenant knowledge only.",
      },
      temperature: 0.2,
      maxTokens: 4096,
      metadata: {
        tenantId,
        promptName: "authority-baseline",
        promptVersion: "1",
        purpose: "authority-baseline-draft",
      },
    },
    baselineSchema,
  );

  return {
    summary: String(data.summary ?? "").trim(),
    strengths: (data.strengths ?? []).map((s) => String(s).trim()).filter(Boolean),
    weaknesses: (data.weaknesses ?? []).map((s) => String(s).trim()).filter(Boolean),
    gaps: (data.gaps ?? []).map((s) => String(s).trim()).filter(Boolean),
    povCoverageNotes: String(data.povCoverageNotes ?? "").trim(),
    trustMixNotes: String(data.trustMixNotes ?? "").trim(),
    recommendedActions: (data.recommendedActions ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean),
    citationSourceIds: [],
  };
}

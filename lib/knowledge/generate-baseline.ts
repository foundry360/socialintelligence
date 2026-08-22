import "server-only";

import {
  buildStructuredKnowledgeText,
  retrieveEvidenceChunks,
} from "@/lib/knowledge/context";
import { clipToSentenceBounds } from "@/lib/knowledge/chunk";
import { getLLMProvider } from "@/lib/llm";
import { loadPrompt } from "@/lib/prompts/load";
import { createClient } from "@/lib/db/server";

const BASELINE_EVIDENCE_QUERY =
  "authority positioning expertise strengths weaknesses proof points case studies thought leadership gaps POV market perception trust credibility";

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
  citationIndexes: number[];
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
      citationIndexes: { type: "array", items: { type: "integer" } },
    },
    required: [
      "summary",
      "strengths",
      "weaknesses",
      "gaps",
      "povCoverageNotes",
      "trustMixNotes",
      "recommendedActions",
      "citationIndexes",
    ],
  },
} as const;

function mapCitationIndexes(
  indexes: number[],
  sourceIdsByIndex: string[],
): string[] {
  const out = new Set<string>();
  for (const index of indexes) {
    const sourceId = sourceIdsByIndex[index - 1];
    if (sourceId) out.add(sourceId);
  }
  return [...out];
}

export async function generateAuthorityBaselineDraft(
  tenantId: string,
): Promise<GeneratedBaselinePayload> {
  const supabase = await createClient();

  const [{ data: sources }, structured, chunks] = await Promise.all([
    supabase
      .from("knowledge_sources")
      .select("id, title, source_type, url, summary")
      .eq("tenant_id", tenantId)
      .eq("evidence_status", "accepted")
      .neq("sensitivity", "confidential")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(40),
    buildStructuredKnowledgeText(tenantId),
    retrieveEvidenceChunks(tenantId, BASELINE_EVIDENCE_QUERY, 16),
  ]);

  if (chunks.length === 0 && !(sources?.length ?? 0)) {
    throw new Error(
      "Add accepted evidence sources in My Library before generating a baseline.",
    );
  }

  const catalogBlock =
    (sources ?? []).length > 0
      ? (sources ?? [])
          .map((s) => {
            const summary = (s.summary ?? "").trim();
            const urlPart = s.url ? ` url="${s.url}"` : "";
            return `- [${s.id}] ${s.title} (${s.source_type})${urlPart}${
              summary ? `\n  summary: ${summary}` : ""
            }`;
          })
          .join("\n")
      : "";

  const sourceIdsByIndex = chunks.map((c) => c.sourceId);

  const evidenceBlock = chunks
    .map((c, i) => {
      const kind = c.sourceType === "url" ? "website" : c.sourceType || "source";
      const urlPart = c.sourceUrl ? ` url="${c.sourceUrl}"` : "";
      const excerpt = clipToSentenceBounds(c.content, { maxChars: 700 });
      return `[#${i + 1} source_id="${c.sourceId}" kind=${kind} title="${c.sourceTitle}"${urlPart}]\n${excerpt}`;
    })
    .join("\n\n");

  const acceptedEvidence = [
    catalogBlock ? `### Source catalog\n${catalogBlock}` : "",
    evidenceBlock ? `### Retrieved excerpts\n${evidenceBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = await loadPrompt("authority-baseline", 1);
  const llm = getLLMProvider("claude");

  const { data } = await llm.completeStructured<BaselineStructuredOutput>(
    {
      channels: {
        systemInstructions: prompt.body,
        tenantKnowledge: structured,
        acceptedEvidence,
        userInput:
          "Generate the Authority Baseline v1 draft for this tenant. Be specific and cite evidence item numbers in citationIndexes.",
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

  const citationSourceIds = mapCitationIndexes(
    data.citationIndexes ?? [],
    sourceIdsByIndex,
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
    citationSourceIds,
  };
}

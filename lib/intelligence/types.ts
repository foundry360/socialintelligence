import type { Persona } from "@/domains/audience/types";
import type { ContentDraft } from "@/domains/content/types";
import type { EntityNode, Topic } from "@/domains/entities/types";
import type { CompanyProfile, TerminologyEntry } from "@/domains/knowledge/types";
import type { PointOfView } from "@/domains/pov/types";
import type { Signal } from "@/domains/signals/types";
import type { UUID } from "@/domains/shared/types";

/**
 * Tenant-scoped proprietary intelligence façade.
 * Implementations read structured + vector stores - never call LLM vendors directly.
 */
export interface IntelligenceLayer {
  getCompanyContext(tenantId: UUID): Promise<CompanyProfile | null>;
  getRelevantPOVs(
    tenantId: UUID,
    query: { text: string; topicIds?: UUID[]; limit?: number },
  ): Promise<PointOfView[]>;
  getAudienceContext(
    tenantId: UUID,
    query: { text: string; personaIds?: UUID[]; limit?: number },
  ): Promise<Persona[]>;
  getRelevantEntities(
    tenantId: UUID,
    query: { text: string; limit?: number },
  ): Promise<EntityNode[]>;
  getTopicContext(tenantId: UUID, topicId: UUID): Promise<Topic | null>;
  getContentHistory(
    tenantId: UUID,
    filters?: { limit?: number; format?: string },
  ): Promise<ContentDraft[]>;
  getRelevantSignals(
    tenantId: UUID,
    filters?: { limit?: number; query?: string },
  ): Promise<Signal[]>;
  getEditorialRules(tenantId: UUID): Promise<EditorialRules>;
  getTerminology(tenantId: UUID): Promise<TerminologyEntry[]>;
  /** Phase 4+ */
  getPerformanceInsights?(
    tenantId: UUID,
    filters?: Record<string, unknown>,
  ): Promise<unknown>;
}

export interface EditorialRules {
  minEditorialScore: number;
  requirePov: boolean;
  banGenericPhrases: string[];
  notes?: string;
}

/** Compose delimited tenant context for LLM channels.tenantKnowledge */
export function formatTenantKnowledgeBlock(input: {
  company?: CompanyProfile | null;
  povs?: PointOfView[];
  personas?: Persona[];
  terminology?: TerminologyEntry[];
}): string {
  const parts: string[] = [];

  if (input.company) {
    parts.push(
      [
        `Company: ${input.company.displayName}`,
        `Positioning: ${input.company.positioning}`,
        `Summary: ${input.company.summary}`,
        `Differentiators: ${input.company.differentiators.join("; ")}`,
        input.company.websiteUrls?.length
          ? `Websites: ${input.company.websiteUrls.join("; ")}`
          : input.company.websiteUrl
            ? `Website: ${input.company.websiteUrl}`
            : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (input.povs?.length) {
    parts.push(
      "Points of view:\n" +
        input.povs
          .map(
            (p) =>
              `- ${p.topicLabel}: ${p.stance}\n  Principles: ${p.principles.join("; ")}\n  Disagrees with: ${p.disagreesWith.join("; ")}`,
          )
          .join("\n"),
    );
  }

  if (input.personas?.length) {
    parts.push(
      "Audiences:\n" +
        input.personas
          .map((p) => `- ${p.name}: goals=${p.goals.join(", ")}; pains=${p.pains.join(", ")}`)
          .join("\n"),
    );
  }

  if (input.terminology?.length) {
    parts.push(
      "Terminology:\n" +
        input.terminology
          .map(
            (t) =>
              `- Prefer "${t.preferredTerm}"` +
              (t.avoidTerms.length ? `; avoid: ${t.avoidTerms.join(", ")}` : ""),
          )
          .join("\n"),
    );
  }

  return parts.join("\n\n");
}

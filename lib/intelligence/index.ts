import type { EditorialRules, IntelligenceLayer } from "@/lib/intelligence/types";
import type { UUID } from "@/domains/shared/types";

/**
 * In-memory stub for Phase 0/early Phase 1 until Supabase repositories land.
 * Not for production.
 */
export class InMemoryIntelligenceLayer implements IntelligenceLayer {
  async getCompanyContext() {
    return null;
  }

  async getRelevantPOVs() {
    return [];
  }

  async getAudienceContext() {
    return [];
  }

  async getRelevantEntities() {
    return [];
  }

  async getTopicContext() {
    return null;
  }

  async getContentHistory() {
    return [];
  }

  async getRelevantSignals() {
    return [];
  }

  async getEditorialRules(_tenantId: UUID): Promise<EditorialRules> {
    return {
      minEditorialScore: 70,
      requirePov: true,
      banGenericPhrases: [
        "in today's fast-paced world",
        "leverage synergies",
        "game-changer",
      ],
    };
  }

  async getTerminology() {
    return [];
  }
}

export type { EditorialRules, IntelligenceLayer } from "@/lib/intelligence/types";
export { formatTenantKnowledgeBlock } from "@/lib/intelligence/types";
export {
  buildTenantContextBundle,
  buildProjectContextBundle,
  clearContextBundleCache,
  invalidateTenantContextBundle,
  invalidateProjectContextBundle,
  type TenantContextBundle,
  type ProjectContextBundle,
} from "@/lib/intelligence/context-bundle";
export {
  formatApprovedBaselineSummary,
  formatProjectMissionFocus,
  formatWatchProfilesSummary,
  mergeTenantKnowledgeForLlm,
} from "@/lib/intelligence/context-bundle-format";

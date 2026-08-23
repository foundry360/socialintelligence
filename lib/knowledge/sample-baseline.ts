/** Static sample baseline for local UI development (no LLM). */

export const SAMPLE_BASELINE = {
  status: "awaiting_approval" as const,
  summary:
    "The organization shows credible domain expertise in B2B thought leadership and content strategy, with a clear point of view on authority-building over volume publishing. Knowledge coverage is strongest on positioning and capabilities, but proof assets and market questions need more depth before the team can claim full-category authority.",
  strengths: [
    "Distinct positioning around authority and expertise, not generic AI content.",
    "Structured knowledge spine with capabilities, personas, and POVs defined.",
    "Editorial workflow assumes human approval, which supports trust and quality.",
    "Multi-tenant product architecture supports repeatable client delivery.",
  ],
  weaknesses: [
    "Proof and evidence library is thin relative to stated capabilities.",
    "POV coverage does not yet span all priority industries.",
    "Limited public-facing content demonstrating the methodology in practice.",
    "Terminology and messaging consistency across assets is uneven.",
  ],
  gaps: [
    "No approved messaging plan downstream of baseline yet.",
    "Case studies and customer outcomes are under-documented in Knowledge.",
    "Market questions lack answers tied to published POVs.",
    "Competitive differentiation is implied but not always explicit in copy.",
  ],
  pov_coverage_notes:
    "Core POVs on authority-first content and knowledge-led strategy are well represented. Industry-specific POVs and objection-handling angles are sparse. Recommend one POV per priority persona before scaling content ops.",
  trust_mix_notes:
    "Trust signals lean on framework and process narrative. Add third-party proof, named customer outcomes, and practitioner credentials to balance opinion with evidence. Avoid over-indexing on product claims without supporting artifacts.",
  recommended_actions: [
    "Complete Proof & Evidence with at least two case-style entries per core capability.",
    "Draft answers for top market questions and link each to a POV.",
    "Approve this baseline, then generate a Messaging Plan before content packages.",
    "Publish one flagship article that demonstrates the authority methodology end to end.",
  ],
  citation_source_ids: [] as string[],
};

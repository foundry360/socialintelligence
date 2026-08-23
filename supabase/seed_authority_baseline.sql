-- Sample authority baseline for UI development (no LLM).
-- Safe to re-run: only inserts when a tenant has no non-deleted baselines.

insert into public.authority_baselines (
  id,
  tenant_id,
  workspace_id,
  version,
  status,
  summary,
  strengths,
  weaknesses,
  gaps,
  pov_coverage_notes,
  trust_mix_notes,
  recommended_actions,
  citation_source_ids
)
select
  'a0000000-0000-4000-8000-000000000005',
  t.id,
  kw.id,
  1,
  'awaiting_approval',
  'The organization shows credible domain expertise in B2B thought leadership and content strategy, with a clear point of view on authority-building over volume publishing. Knowledge coverage is strongest on positioning and capabilities, but proof assets and market questions need more depth before the team can claim full-category authority.',
  '[
    "Distinct positioning around authority and expertise, not generic AI content.",
    "Structured knowledge spine with capabilities, personas, and POVs defined.",
    "Editorial workflow assumes human approval, which supports trust and quality.",
    "Multi-tenant product architecture supports repeatable client delivery."
  ]'::jsonb,
  '[
    "Proof and evidence library is thin relative to stated capabilities.",
    "POV coverage does not yet span all priority industries.",
    "Limited public-facing content demonstrating the methodology in practice.",
    "Terminology and messaging consistency across assets is uneven."
  ]'::jsonb,
  '[
    "No approved messaging plan downstream of baseline yet.",
    "Case studies and customer outcomes are under-documented in Knowledge.",
    "Market questions lack answers tied to published POVs.",
    "Competitive differentiation is implied but not always explicit in copy."
  ]'::jsonb,
  'Core POVs on authority-first content and knowledge-led strategy are well represented. Industry-specific POVs and objection-handling angles are sparse. Recommend one POV per priority persona before scaling content ops.',
  'Trust signals lean on framework and process narrative. Add third-party proof, named customer outcomes, and practitioner credentials to balance opinion with evidence. Avoid over-indexing on product claims without supporting artifacts.',
  '[
    "Complete Proof & Evidence with at least two case-style entries per core capability.",
    "Draft answers for top market questions and link each to a POV.",
    "Approve this baseline, then generate a Messaging Plan before content packages.",
    "Publish one flagship article that demonstrates the authority methodology end to end."
  ]'::jsonb,
  '{}'::uuid[]
from public.tenants t
join public.knowledge_workspaces kw
  on kw.tenant_id = t.id and kw.is_primary = true
where t.deleted_at is null
  and not exists (
    select 1
    from public.authority_baselines ab
    where ab.tenant_id = t.id
      and ab.deleted_at is null
  );

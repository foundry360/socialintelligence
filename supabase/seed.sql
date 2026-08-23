-- Seed Kona Kai Corp as first tenant.
-- Apply after migrations. Safe to re-run (upserts on slug / unique keys).

-- Fixed IDs for local/dev consistency
-- tenant:  a0000000-0000-4000-8000-000000000001
-- brand:   a0000000-0000-4000-8000-000000000002
-- workspace: a0000000-0000-4000-8000-000000000003
-- profile: a0000000-0000-4000-8000-000000000004

insert into public.tenants (id, slug, name, status)
values (
  'a0000000-0000-4000-8000-000000000001',
  'kona-kai',
  'Kona Kai Corp',
  'active'
)
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      updated_at = now(),
      deleted_at = null;

insert into public.brands (id, tenant_id, name, slug, is_primary)
values (
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Kona Kai',
  'kona-kai',
  true
)
on conflict (tenant_id, slug) do update
  set name = excluded.name,
      is_primary = excluded.is_primary,
      updated_at = now(),
      deleted_at = null;

insert into public.knowledge_workspaces (id, tenant_id, name, is_primary)
values (
  'a0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'Kona Kai Authority Workspace',
  true
)
on conflict (id) do update
  set name = excluded.name,
      is_primary = excluded.is_primary,
      updated_at = now(),
      deleted_at = null;

insert into public.company_profiles (
  id,
  tenant_id,
  legal_name,
  display_name,
  tagline,
  summary,
  positioning,
  differentiators,
  website_url
)
values (
  'a0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  'Kona Kai Corp',
  'Kona Kai',
  null,
  '',
  '',
  '[]'::jsonb,
  null
)
on conflict (tenant_id) do update
  set legal_name = excluded.legal_name,
      display_name = excluded.display_name,
      updated_at = now(),
      deleted_at = null;

-- POVs are curated in the Knowledge Workspace (no seed POV).

-- Sample authority baseline for UI development (status: awaiting_approval)
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
values (
  'a0000000-0000-4000-8000-000000000005',
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000003',
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
)
on conflict (tenant_id, version) do update
  set status = excluded.status,
      summary = excluded.summary,
      strengths = excluded.strengths,
      weaknesses = excluded.weaknesses,
      gaps = excluded.gaps,
      pov_coverage_notes = excluded.pov_coverage_notes,
      trust_mix_notes = excluded.trust_mix_notes,
      recommended_actions = excluded.recommended_actions,
      updated_at = now(),
      deleted_at = null;

-- ---------------------------------------------------------------------------
-- Link a Supabase Auth user to Kona Kai (run after the user exists):
--
--   insert into public.tenant_memberships (tenant_id, user_id, role)
--   values (
--     'a0000000-0000-4000-8000-000000000001',
--     '<auth.users.id>',
--     'owner'
--   )
--   on conflict (tenant_id, user_id) do nothing;
--
-- Or sign up while BOOTSTRAP_TENANT_SLUG=kona-kai is set in the app env;
-- the app will auto-create an owner membership for the first linked user flow.
-- ---------------------------------------------------------------------------

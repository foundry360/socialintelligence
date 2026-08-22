-- Conceptual multi-tenant schema for Social Intelligence
-- NOT an applied migration. Phase 1 will convert to supabase/migrations.
-- Requires: pgcrypto, vector extension

-- create extension if not exists "pgcrypto";
-- create extension if not exists "vector";

-- Tenancy
-- tenants(id uuid pk, slug text unique, name text, status text, created_at, updated_at, deleted_at)
-- tenant_memberships(id, tenant_id fk, user_id uuid, role text, created_at, updated_at)
-- brands(id, tenant_id, name, slug, is_primary, ...)
-- executive_voices(id, tenant_id, brand_id null, name, title, voice_notes, ...)

-- Knowledge
-- company_profiles(id, tenant_id, legal_name, display_name, tagline, summary, positioning, differentiators jsonb, website_url, ...)
-- capabilities(id, tenant_id, name, description, ...)
-- terminology_entries(id, tenant_id, preferred_term, avoid_terms jsonb, definition, ...)
-- knowledge_documents(id, tenant_id, title, source_type, storage_path, url, sensitivity, metadata jsonb, ...)
-- document_chunks(id, tenant_id, document_id, chunk_index, content, embedding vector(1536), metadata jsonb, ...)

-- Audience
-- icps(id, tenant_id, name, description, ...)
-- personas(id, tenant_id, name, title_patterns jsonb, goals jsonb, pains jsonb, ...)

-- POV
-- points_of_view(id, tenant_id, topic_id null, topic_label, stance, principles jsonb, disagrees_with jsonb,
--   framework_ids jsonb, evidence_refs jsonb, persona_ids jsonb, capability_ids jsonb, status, confidence, ...)

-- Entities / topics
-- topics(id, tenant_id, slug, name, description, parent_topic_id null, ...)
-- entity_nodes(id, tenant_id, kind, name, aliases jsonb, description, ...)
-- entity_relationships(id, tenant_id, from_entity_id, to_entity_id, relationship_type, weight, metadata jsonb, ...)

-- Signals
-- signals(id, tenant_id, title, source_type, source_name, url, raw_text, occurred_at, fingerprint, metadata jsonb, ...)
-- signal_analyses(id, tenant_id, signal_id, summary, why_it_matters, affected_parties jsonb,
--   relevance_to_tenant bool, relevance_score int, persona_ids jsonb, capability_ids jsonb, pov_ids jsonb,
--   differentiated_angle, content_worthy bool, rationale, model_provider, model_name, prompt_version, ...)

-- Opportunities / content
-- content_opportunities(id, tenant_id, signal_id null, title, summary, score jsonb, audience_persona_ids jsonb,
--   pov_ids jsonb, recommended_formats jsonb, rationale, status, ...)
-- content_packages(id, tenant_id, opportunity_id, title, status, ...)
-- content_drafts(id, tenant_id, package_id, opportunity_id, format, title, body, structured_payload jsonb,
--   status, prompt_name, prompt_version, model_provider, model_name, embedding vector(1536) null, ...)

-- Editorial
-- editorial_reviews(id, tenant_id, draft_id, score jsonb, flags jsonb, summary, passes_threshold bool, threshold_used, ...)
-- approval_decisions(id, tenant_id, draft_id, decided_by_user_id, decision, notes, ...)

-- Analytics (later)
-- performance_events(id, tenant_id, draft_id null, opportunity_id null, kind, source, value, metadata jsonb, occurred_at, ...)

-- Audit
-- audit_events(id, tenant_id null, actor_user_id null, action, resource_type, resource_id, metadata jsonb, created_at)

-- RLS (required before production data):
--   enable RLS on all tenant-scoped tables
--   policy: tenant_id in (select tenant_id from tenant_memberships where user_id = auth.uid())

select 'conceptual schema only - see docs/DOMAIN_MODEL.md' as note;

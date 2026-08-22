# Phase 2 - Knowledge Workspace setup

Phase 2 is **complete**. Use this page for local/prod verification and polish checks.

## Migrations

In the Supabase SQL Editor, run in order (if not already applied):

1. `supabase/migrations/20260821000004_knowledge_workspace.sql`
2. `supabase/migrations/20260821000005_knowledge_uploads.sql` - upload columns + private `knowledge-uploads` bucket
3. `supabase/migrations/20260821000006_user_avatars.sql` - public `avatars` bucket for profile photos
4. `supabase/migrations/20260821000007_company_website_urls.sql` - multi website URLs on company profile
5. `supabase/migrations/20260821000008_industries_and_proof.sql` - industries + proof items
6. `supabase/migrations/20260821000009_market_questions.sql` - questions & conversations
7. `supabase/migrations/20260821000010_missions.sql` - projects (missions table)
8. `supabase/migrations/20260821000011_mission_sources.sql` - project ↔ source links
9. `supabase/migrations/20260821000012_mission_sort_order.sql` - custom project ordering
10. `supabase/migrations/20260821000013_library_catalog_tags.sql` - library summary, metadata, tags
11. `supabase/migrations/20260821000014_library_catalogs.sql` - tenant custom catalog folders
12. `supabase/migrations/20260821000015_knowledge_source_catalogs.sql` - multi-catalog junction
13. `supabase/migrations/20260821000016_chunk_embeddings.sql` - pgvector embeddings on chunks

## App routes

- http://localhost:3001/workspace - **Projects** dashboard (topic-scoped chats)
- http://localhost:3001/workspace/missions/[id] - project chat with grounded Q&A
- http://localhost:3001/workspace/knowledge - structured editors (full spine)
- http://localhost:3001/workspace/library - **My Library** (sources, catalogs, tags)
- http://localhost:3001/workspace/overview - readiness hub (spine progress + evidence)

**Legacy redirects**

- `/workspace/chat` → `/workspace`
- `/workspace/sources` → `/workspace/library`
- `/workspace/sources/[id]` → `/workspace/library?source=[id]`

## Retrieval

Chat evidence retrieval order:

1. **Vector search** (when `OPENAI_API_KEY` is set and migration 16 applied)
2. **Postgres FTS** on `knowledge_chunks.fts`
3. Sequential chunk fallback

Set `OPENAI_API_KEY` to enable embeddings on chunk rebuild (accept/re-ingest sources to backfill vectors).

## Library polish

- Missing `summary` / `metadata` on older sources is backfilled automatically when My Library loads.
- Add sources via the **Add sources** pill on My Library or from inside a project chat.

## Security & uploads

**Sensitivity:** `confidential` sources are stored but **not** sent to Claude.

**Uploads:** max 10MB; text extracted server-side; files stored under `{tenant_id}/{source_id}/…` in the private bucket.

## Exit criteria (met)

- [x] Structured knowledge spine editable per tenant
- [x] Sources accepted as evidence
- [x] Grounded chat with citations
- [x] Overview shows readiness across categories + evidence
- [x] Projects workspace with per-project source scope
- [x] My Library with catalogs, tags, and metadata inspector

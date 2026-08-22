# Phase 2 - Knowledge Workspace setup

Phase 2 is **complete**. Use this page for local/prod verification.

## Migrations

In the Supabase SQL Editor for project `frzuiqafemdmmkqivewi`, run in order (if not already applied):

1. `supabase/migrations/20260821000004_knowledge_workspace.sql`
2. `supabase/migrations/20260821000005_knowledge_uploads.sql` - upload columns + private `knowledge-uploads` bucket
3. `supabase/migrations/20260821000006_user_avatars.sql` - public `avatars` bucket for profile photos
4. `supabase/migrations/20260821000007_company_website_urls.sql` - multi website URLs on company profile
5. `supabase/migrations/20260821000008_industries_and_proof.sql` - industries + proof items
6. `supabase/migrations/20260821000009_market_questions.sql` - questions & conversations

## App routes

- http://localhost:3001/workspace - overview readiness hub
- http://localhost:3001/workspace/knowledge - structured editors (full spine)
- http://localhost:3001/workspace/library - My Library (sources)
- http://localhost:3001/workspace/sources - notes, URL import, document upload (PDF/TXT/MD)
- http://localhost:3001/workspace/chat - grounded Q&A with citations

**Sensitivity:** `confidential` sources are stored but **not** sent to Claude.

**Uploads:** max 10MB; text extracted server-side; files stored under `{tenant_id}/{source_id}/…` in the private bucket.

## Exit criteria (met)

- [x] Structured knowledge spine editable per tenant
- [x] Sources accepted as evidence
- [x] Grounded chat with citations
- [x] Overview shows readiness across categories + evidence

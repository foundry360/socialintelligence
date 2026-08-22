# Phase 2 - Knowledge Workspace setup

## Migrations

In the Supabase SQL Editor for project `frzuiqafemdmmkqivewi`, run in order (if not already applied):

1. `supabase/migrations/20260821000004_knowledge_workspace.sql`
2. `supabase/migrations/20260821000005_knowledge_uploads.sql` - upload columns + private `knowledge-uploads` bucket
3. `supabase/migrations/20260821000006_user_avatars.sql` - public `avatars` bucket for profile photos

## App routes

- http://localhost:3001/workspace - overview
- http://localhost:3001/workspace/knowledge - structured editors
- http://localhost:3001/workspace/sources - notes, URL import, **document upload** (PDF/TXT/MD)
- http://localhost:3001/workspace/chat - grounded Q&A with citations

**Sensitivity:** `confidential` sources are stored but **not** sent to Claude.

**Uploads:** max 10MB; text extracted server-side; files stored under `{tenant_id}/{source_id}/…` in the private bucket.

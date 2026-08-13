# Architecture Decision Record

Format: short ADR entries. Newest first.

---

## ADR-006 — Auth provider for MVP

**Status:** Accepted (default; refine if needed)  
**Date:** 2026-08-13

**Decision:** Supabase Auth with email/password for MVP. SSO/OAuth can be added later without changing tenancy model.

**Rationale:** Matches chosen backend; lowest friction for first internal users.

---

## ADR-005 — GitHub repository

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** Canonical remote is [foundry360/socialintelligence](https://github.com/foundry360/socialintelligence).

---

## ADR-004 — Scaffold & package manager

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** pnpm + Next.js App Router + TypeScript + Tailwind.

**Notes:** Next.js 16 agent rules block in `AGENTS.md` must be preserved.

---

## ADR-003 — SocialRadar reuse

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** Reuse **patterns** only (AI provider interface, repositories, scoring). Do not port Sheets storage, Discord/Reddit collectors, or OpenAI-first prompts into this codebase.

**Rationale:** Different product (thought leadership OS vs community radar); different persistence and LLM strategy.

---

## ADR-002 — Supabase as backend

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** Supabase for Auth, Postgres, and pgvector. Use Supabase client on server; RLS for tenant isolation.

**Rationale:** Fits modular monolith, reduces ops, supports vector search without extra infra.

---

## ADR-001 — Multi-tenancy from day one

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** Schema and APIs are multi-tenant. Kona Kai Corp is the first tenant/client, not a hardcoded single-tenant app.

**Consequences:**

- `tenant_id` on tenant-owned tables
- RLS required before production data
- Intelligence Layer is tenant-scoped
- Seed scripts create a Kona Kai tenant

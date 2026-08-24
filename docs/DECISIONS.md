# Architecture Decision Record

Format: short ADR entries. Newest first.

---

## ADR-010 - Automated signaling before messaging plan

**Status:** Accepted  
**Date:** 2026-08-23

**Decision:** Build **automated Signal Intelligence** (watch profiles, RSS ingest, qualification, project Signal Inbox) as the next major capability. Signals are **project-scoped** and ingested on a schedule, not entered manually. Messaging Plan generation follows qualified market signals. Content generation follows an approved messaging plan.

**Rationale:** A signaling intelligence layer that requires manual paste is not signaling. Market-aligned messaging requires external market intelligence. The product sequence is: organizational authority (knowledge + baseline) → automated market signals → messaging plan → content ops.

**Consequences:**

- Canonical architecture: `docs/SIGNALING_ARCHITECTURE.md`
- **Three-tier signal model:** Source → Candidate Signal → Qualified Signal (RSS items are sources, never signals)
- Supersedes manual-first MVP language in `docs/SIGNAL_ENGINE.md` and `AGENTS.md` §12 (when accepted)
- New tables: `signal_sources`, `candidate_signals`, `qualified_signals`, `watch_profiles`, etc.
- Future: N qualified signals → emerging pattern (schema hook documented, not MVP)

---

## ADR-009 - Tenant onboarding creates org + workspace

**Status:** Accepted  
**Date:** 2026-08-21

**Decision:** New users create their own organization (tenant) and primary knowledge workspace after signup. Kona Kai is a normal seeded tenant for demos, not a bootstrap default for every account. Remove `BOOTSTRAP_TENANT_SLUG` auto-membership.

**Rationale:** Multi-tenant SaaS requires each client to own an isolated tenant. Special-casing the first client breaks the product model.

**Consequences:**

- `/onboarding` provisions tenant, brand, primary workspace, empty company profile, and owner membership via service role
- `requireWorkspaceContext` redirects users without memberships to `/onboarding`
- Invites / multi-tenant switcher remain future work; first membership still defines active tenant for MVP

---

## ADR-008 - Knowledge-first delivery sequence

**Status:** Accepted  
**Date:** 2026-08-21

**Decision:** Ship in this order: curated knowledge workspace → Authority Baseline → Messaging Plan → content ops (signals/drafts). Do not generate thought-leadership content packages until baseline + plan are human-approved.

**Rationale:** Authority and differentiation depend on company-true knowledge. Generating posts before a baseline produces generic AI content and undermines the product thesis.

**Consequences:**

- `docs/ROADMAP.md` phases renumbered (Phase 1 = platform spine; content ops = Phase 5)
- Stage 1 UX follows a NotebookLM-like workspace pattern (sources + grounded chat + citations)
- Durable artifacts: `AuthorityBaseline`, `MessagingPlan` (domain docs updated accordingly)

---

## ADR-007 - NotebookLM-style knowledge workspace for Stage 1

**Status:** Accepted  
**Date:** 2026-08-21

**Decision:** Phase 2 Knowledge Workspace borrows NotebookLM interaction patterns (curated sources, grounded Q&A, derived briefs) while remaining a multi-tenant authority OS - not a NotebookLM clone.

**Rationale:** Familiar, high-leverage UX for building and interrogating a curated knowledge base before market messaging and content generation.

---

## ADR-006 - Auth provider for MVP

**Status:** Accepted (default; refine if needed)  
**Date:** 2026-08-13

**Decision:** Supabase Auth with email/password for MVP. SSO/OAuth can be added later without changing tenancy model.

**Rationale:** Matches chosen backend; lowest friction for first internal users.

---

## ADR-005 - GitHub repository

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** Canonical remote is [foundry360/socialintelligence](https://github.com/foundry360/socialintelligence).

---

## ADR-004 - Scaffold & package manager

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** pnpm + Next.js App Router + TypeScript + Tailwind.

**Notes:** Next.js 16 agent rules block in `AGENTS.md` must be preserved.

---

## ADR-003 - SocialRadar reuse

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** Reuse **patterns** only (AI provider interface, repositories, scoring). Do not port Sheets storage, Discord/Reddit collectors, or OpenAI-first prompts into this codebase.

**Rationale:** Different product (thought leadership OS vs community radar); different persistence and LLM strategy.

---

## ADR-002 - Supabase as backend

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** Supabase for Auth, Postgres, and pgvector. Use Supabase client on server; RLS for tenant isolation.

**Rationale:** Fits modular monolith, reduces ops, supports vector search without extra infra.

---

## ADR-001 - Multi-tenancy from day one

**Status:** Accepted  
**Date:** 2026-08-13

**Decision:** Schema and APIs are multi-tenant. Kona Kai Corp is the first tenant/client, not a hardcoded single-tenant app.

**Consequences:**

- `tenant_id` on tenant-owned tables
- RLS required before production data
- Intelligence Layer is tenant-scoped
- Seed scripts create a Kona Kai tenant

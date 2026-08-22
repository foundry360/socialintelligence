# Roadmap

## Strategy (knowledge-first)

```text
Curated knowledge → Authority Baseline → Messaging Plan → Content Ops
```

Do **not** generate LinkedIn/content packages until an approved baseline and messaging plan exist for the tenant.

Stage 1 UX is a **NotebookLM-style Knowledge Workspace** (sources + structured knowledge + grounded chat with citations). Durable outputs are Authority Baseline and Messaging Plan - not chat alone.

---

## Phase 0 - Foundation ✅

- Repository, AGENTS.md, docs
- Domain TypeScript models & interfaces
- LLM abstraction + Claude skeleton + stubs
- Conceptual schema (multi-tenant)
- Prompt folder stubs
- Workflow type definitions
- GitHub remote: [foundry360/socialintelligence](https://github.com/foundry360/socialintelligence)

---

## Phase 1 - Platform spine ✅

Make the app real enough to hold tenant knowledge safely.

**Deliverables**

- Supabase: Auth (email/password), Postgres, Storage, pgvector
- Migrations + RLS (`tenant_id` on tenant-owned tables)
- Seed tenant: **Kona Kai Corp**
- Memberships/roles: `owner` | `admin` | `editor` | `viewer`
- Live `ClaudeProvider` (`complete` + structured JSON)
- Server-only Supabase clients; secrets never on the client
- Minimal auth + post-login workspace shell

**Exit criteria:** User can log in, belong to Kona Kai tenant, empty workspace loads. ✅

---

## Phase 2 - Knowledge Workspace (“Notebook”) (current)

NotebookLM-style core - sources in, grounded answers out.

**Deliverables**

- Workspace per tenant (one primary notebook for MVP)
- Structured spine: company profile, capabilities, personas/ICP, terminology, POVs
- Sources: notes, URL import, document upload (PDF/TXT/Markdown); sensitivity + accept/reject as authority evidence
- Chunk + Postgres FTS retrieval (pgvector embeddings next iteration)
- Grounded chat with citations
- Confidential sources excluded from model context

**Apply migration:** `supabase/migrations/20260821000004_knowledge_workspace.sql`

**Exit criteria:** Team can load curated notes + structured profile and ask cited questions.

---

## Phase 3 - Authority Baseline

**Deliverables**

- Versioned, human-approvable `AuthorityBaseline`
- Strengths, weaknesses, gaps, POV coverage, trust mix, recommended actions
- Citations to sources; approve/reject/edit gate

**Exit criteria:** Kona Kai has an approved v1 baseline.

---

## Phase 4 - Market alignment & messaging plan

**Deliverables**

- `MessagingPlan` from approved baseline (+ optional light market notes as untrusted)
- Priority topics, ownable POVs, pillars, say/don’t say, 30-90 day themes
- Human approval; plan becomes default context for later generation

**Exit criteria:** Approved messaging plan linked to baseline v1.

---

## Phase 5 - Content ops MVP

Only after baseline + plan exist.

**Deliverables**

- Manual signal intake
- Analysis → scored content opportunity (vs plan + POVs)
- Package: LinkedIn draft + AEO Q&A + editorial/GEO notes
- Editorial threshold + human approval (**no publish**)

**Exit criteria:** One signal → opportunity → draft package → approve/reject, grounded in baseline/plan.

---

## Phase 6 - Harden & productize

- Better ingestion, re-embed on update, baseline refresh cadence
- Multi-workspace/brands as needed
- Automated signals, publishing, analytics (later)

---

## Later (unchanged intent)

- Signal automation (authorized APIs/RSS)
- LinkedIn/CMS publishing
- Performance / AI-visibility learning loop
- Additional LLM providers / open-weight models
- Autonomous planning (optional, gated)

---

## Non-goals until Phase 5+

- Autonomous publishing
- Bulk web crawl as “knowledge”
- Content generation without approved baseline + messaging plan

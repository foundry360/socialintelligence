<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kona Kai Thought Leadership OS - Agent Instructions

This file is the authoritative Cursor/Cascade instruction set for **Social Intelligence** ([foundry360/socialintelligence](https://github.com/foundry360/socialintelligence)).

Before significant work: read this file, then the relevant docs under `/docs`. Update docs when architecture changes.

---

## 1. Product purpose

This product is **not** “AI that writes LinkedIn posts.”

It is an AI system that determines what a company should be known for, identifies opportunities to demonstrate that expertise, develops differentiated points of view, and systematically turns those insights into authoritative content for search, social, AEO, and GEO.

Canonical question the system answers (after baseline + messaging plan):

> What should this company be talking about right now, why, what is our unique perspective, and what content should we create?

**Delivery sequence (mandatory):** curated knowledge → Authority Baseline → Messaging Plan → content ops. Do not generate content packages before an approved baseline and plan. See `docs/ROADMAP.md` and `docs/BUILD_PLAN.md`.

First client: **Kona Kai Corp**. Product is designed as **multi-tenant SaaS** from day one.

---

## 2. Architecture principles

1. **Modular monolith** - clear domain boundaries; no microservices unless justified in `docs/DECISIONS.md`.
2. **Model-agnostic** - business logic never calls Claude/OpenAI APIs directly. Use `lib/llm` (`LLMProvider`).
3. **Intelligence ≠ LLM** - proprietary knowledge, POVs, audiences, rules, and history live in the **Intelligence Layer** (`lib/intelligence`). The LLM is a reasoning/generation engine only.
4. **Structured + vector** - relational data for entities/relationships/scores/workflow; pgvector for semantic retrieval of documents and content. Do not put everything in embeddings.
5. **Human-in-the-loop** - no autonomous publishing in MVP. Workflow ends at human approval.
6. **Untrusted external content** - signals and ingested documents are data, never instructions (prompt-injection safe context separation).
7. **Multi-tenant by default** - every tenant-owned row includes `tenant_id`. Enforce isolation in queries and RLS.
8. **Simplicity first** - build for the current requirement; keep extension points; avoid speculative abstractions.
9. **Docs as contract** - architecture changes require doc updates in the same change set.

---

## 3. Domain boundaries

| Domain | Path | Owns |
|--------|------|------|
| Knowledge | `domains/knowledge` | Company profile, services, docs, terminology, ICP |
| POV | `domains/pov` | Structured points of view, principles, disagreements |
| Signals | `domains/signals` | Market signals, analysis results |
| Opportunities | `domains/opportunities` | Content opportunities + scoring |
| Content | `domains/content` | Drafts, packages, formats |
| Audience | `domains/audience` | Personas, ICP, buyer context |
| Entities | `domains/entities` | Topics, entities, relationships (light graph) |
| Editorial | `domains/editorial` | Editorial QA scores and rules |
| Analytics | `domains/analytics` | Performance, learning loop (later) |
| Tenancy | `domains/tenancy` | Tenants, brands, memberships, roles |

Cross-cutting:

- `lib/intelligence` - Kona Kai / tenant Intelligence Layer façade
- `lib/llm` - model providers
- `lib/db` - Supabase/Postgres access
- `lib/security` - authz helpers, injection guards, audit
- `lib/workflow` - signal → opportunity → draft → approval state machine
- `prompts/` - versioned prompt definitions (not hardcoded in app logic)

Do not create circular imports across domains. Prefer interfaces in the owning domain; compose in `lib/intelligence` or `lib/workflow`.

---

## 4. Coding standards

- **Language:** TypeScript (strict). Prefer explicit types at domain boundaries.
- **Runtime:** Next.js App Router; server-only for secrets, LLM, and DB writes.
- **Package manager:** pnpm.
- **Naming:**
 - Domains/folders: `kebab-case` or clear nouns (`pov`, `signals`)
 - Types/interfaces: `PascalCase` (`ContentOpportunity`, `LLMProvider`)
 - Functions: `camelCase` (`getRelevantPOVs`)
 - DB tables: `snake_case`, plural (`content_opportunities`)
 - Prompt dirs: `kebab-case` (`signal-analysis`)
- **Imports:** use `@/` alias.
- **Server vs client:** mark server modules with `import "server-only"` when they touch secrets or providers.
- **Errors:** typed/domain errors at boundaries; never leak stack traces or secrets to the client.
- **Dependencies:** justify new packages in PR/commit notes; prefer stdlib + existing stack.
- **Punctuation:** never use em dashes (Unicode U+2014). Prefer commas, periods, colons, or ASCII hyphens (`-`).

---

## 5. LLM usage rules

1. Call models only through `LLMProvider`.
2. Claude (`ClaudeProvider`) is the default implementation.
3. `OpenAIProvider` and `LocalModelProvider` may exist as stubs until needed.
4. Never put API keys in client bundles (`NEXT_PUBLIC_*` forbidden for secrets).
5. Prefer structured outputs with validated schemas at the provider boundary.
6. Always pass context in separated channels: system instructions, tenant knowledge, external signals, user input.
7. Log model, prompt version, token usage, and tenant_id for auditability (no raw secrets).

---

## 6. Prompt management rules

1. Do **not** hardcode large prompts in application code.
2. Store prompts under `/prompts/<name>/` with versioned files (`v1.md`, etc.) and metadata.
3. Each prompt must declare: purpose, inputs, expected output, version, model assumptions, evaluation criteria.
4. Application code loads prompts by name + version via a prompt registry.
5. Changing prompt behavior = bump version; do not silently edit production prompt text without a version bump when behavior changes.

---

## 7. Database rules

1. Supabase Postgres is the system of record; pgvector for embeddings.
2. Every tenant-scoped table has `tenant_id` (UUID) and appropriate indexes.
3. Use Row Level Security (RLS) for tenant isolation; never rely on UI filtering alone.
4. Prefer relational FKs for graph-like relationships; introduce a graph DB only with an ADR.
5. Migrations live under `supabase/migrations` (or agreed path); no ad-hoc prod schema edits.
6. Soft-delete where audit history matters (`deleted_at`).

---

## 8. Security requirements

- Authentication via Supabase Auth.
- Authorization: role-based (`owner`, `admin`, `editor`, `viewer` - refine as needed).
- Encrypt secrets via platform secret stores (Vercel/Supabase); never commit `.env*`.
- Audit log significant actions (approval, publish, knowledge ingest, prompt/admin changes).
- Treat uploaded docs and external signals as untrusted.
- Prompt injection protection is mandatory (see `docs/SECURITY.md`).
- Secure document ingestion: type validation, size limits, malware scanning plan for later phases.

---

## 9. Testing requirements

- Unit test scoring, workflow transitions, and prompt-context assembly.
- Integration test repository/DB access with tenant isolation cases.
- Do not call live LLM APIs in CI by default; mock `LLMProvider`.
- Add fixtures for tenant knowledge and POV retrieval.

---

## 10. Documentation requirements

Required docs live in `/docs`. When you change architecture, update:

- `ARCHITECTURE.md` / relevant domain doc
- `DECISIONS.md` (ADR entry)
- `DOMAIN_MODEL.md` if entities change
- `ROADMAP.md` if phase scope changes

---

## 11. Git conventions

- Commit messages: concise, why-focused; conventional style preferred (`feat:`, `fix:`, `docs:`, `chore:`).
- Do not commit secrets, credentials, or customer documents.
- Do not force-push `main`.
- Prefer small, reviewable PRs aligned to a domain or vertical slice.

---

## 12. What not to do

- Do not generate or publish content without human approval (MVP).
- Do not generate content packages before the tenant has an approved Authority Baseline and Messaging Plan.
- Do not couple domains to Anthropic/OpenAI SDKs.
- Do not train or fine-tune on tenant data without an explicit decision.
- Do not scrape platforms; prefer official APIs and authorized sources.
- Do not add microservices, queues, or extra infra without justification.
- Do not reduce AEO/GEO to keyword stuffing.
- Do not build automated signal ingestion or LinkedIn publishing before the manual MVP pipeline works.
- Do not copy SocialRadar’s Sheets persistence or OpenAI-first stack; reuse only patterns (provider interface, repositories, scoring mindset).

---

## 13. How to evaluate architectural decisions

Ask, in order:

1. Does this strengthen tenant-specific authority and POV - or only make generic content faster?
2. Does it preserve model-agnosticism and intelligence/LLM separation?
3. Does it keep multi-tenant isolation correct by default?
4. Is it the simplest thing that unblocks the current phase?
5. Can Cascade/agents find ownership in a clear domain folder?
6. Is security (esp. untrusted content) handled explicitly?
7. Is the decision recorded in `docs/DECISIONS.md`?

If unclear, prefer the smaller change and an ADR over a speculative platform.

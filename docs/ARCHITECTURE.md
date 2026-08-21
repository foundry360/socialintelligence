# Architecture

## Style

**Modular monolith** on Next.js (App Router) + TypeScript + Supabase (Auth, Postgres, pgvector), deployable on Vercel.

One deployable app. Domains are folders with clear ownership, not separate services.

## High-level diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (UI + API)                   │
│              Auth session via Supabase Auth                  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     Workflow Layer                           │
│   Signal → Analysis → Opportunity → Draft → Editorial →      │
│                   Human Approval → (Publish later)           │
└──────────────┬─────────────────────────────┬────────────────┘
               │                             │
┌──────────────▼──────────────┐ ┌────────────▼────────────────┐
│   Intelligence Layer         │ │   LLMProvider               │
│   tenant knowledge, POVs,    │ │   ClaudeProvider (default)  │
│   audiences, entities,       │ │   OpenAI / Local (stubs)    │
│   editorial rules, history   │ │                             │
└──────────────┬──────────────┘ └─────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Supabase Postgres + pgvector + Storage (docs later)         │
│  RLS tenant isolation                                        │
└─────────────────────────────────────────────────────────────┘
```

## Repository layout

```text
/app                 Next.js routes & API
/components          UI components (minimal until MVP UI)
/domains             Domain logic by bounded context
/lib
  /intelligence      Tenant intelligence façade
  /llm               Model abstraction
  /db                Supabase clients & helpers
  /security          Authz, injection, audit helpers
  /workflow          Pipeline orchestration
/prompts             Versioned prompts
/supabase            Schema / migrations
/docs                Architecture & product docs
/scripts             Ops scripts
/tests               Tests
```

## Core workflow

**Knowledge-first (current roadmap):**

```text
Curated knowledge (workspace)
  → Authority Baseline (human-approved)
  → Messaging Plan (human-approved)
  → Manual Signal → Opportunity → Drafts → Editorial → Human Approval
  → Publish (future)
```

Do not run content generation until baseline + messaging plan exist.

## Multi-tenancy

- `tenants`, `tenant_memberships`, `brands`, optional `executive_voices`
- All tenant data keyed by `tenant_id`
- Supabase RLS policies enforce isolation
- Intelligence Layer always scoped to the active tenant

## Patterns borrowed from SocialRadar (concepts only)

- Provider-agnostic AI interface
- Repository interfaces over storage
- Opportunity scoring mindset
- Collector interface shape for *future* signal sources

**Not reused:** Google Sheets persistence, OpenAI-first stack, hardcoded prompts, single-tenant assumptions.

## Extension points (do not build yet)

Automated collectors, LinkedIn/CMS publishing, analytics ingestion, multi-brand UX, open-weight models, autonomous planning.

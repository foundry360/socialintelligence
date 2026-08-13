# Social Intelligence

Multi-tenant **Thought Leadership Intelligence OS** by Foundry360.

First client: **Kona Kai Corp**.

This system identifies market signals, forms tenant-specific points of view, and turns opportunities into authoritative content for LinkedIn, web, AEO, GEO, and sales enablement — with human approval required.

> Not “AI that writes LinkedIn posts.” An intelligence layer that decides what a company should be known for, and how to demonstrate it.

## Status

**Phase 0 — Foundation.** Documentation, domain model, LLM abstraction, conceptual schema. MVP feature work has not started.

## Stack

- Next.js (App Router) · React · TypeScript · pnpm
- Supabase (Auth, Postgres, pgvector)
- Claude via model-agnostic `LLMProvider` (OpenAI/local stubs)
- Vercel for deployment (when ready)

## Docs

Start at [`docs/README.md`](./docs/README.md). Agent rules: [`AGENTS.md`](./AGENTS.md).

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Configure Supabase and `ANTHROPIC_API_KEY` before Phase 1 live LLM calls.

## Repository layout

```text
app/           Next.js UI + API
domains/       Bounded contexts (knowledge, pov, signals, …)
lib/           intelligence, llm, db, security, workflow
prompts/       Versioned prompt definitions
supabase/      Conceptual schema → migrations in Phase 1
docs/          Architecture & product docs
```

## Remote

[github.com/foundry360/socialintelligence](https://github.com/foundry360/socialintelligence)

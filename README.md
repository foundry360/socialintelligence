# Social Intelligence

Multi-tenant **Thought Leadership Intelligence OS** by Foundry360.

First client: **Kona Kai Corp**.

> Not “AI that writes LinkedIn posts.” Curate company-true knowledge, establish an authority baseline, align messaging, then systematically create authoritative content.

## Status

**Phase 1 — Platform spine** (in progress): Supabase auth/DB, RLS, Kona Kai seed, live Claude provider, workspace shell.

Knowledge-first sequence: see [`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md) and [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Stack

- Next.js (App Router) · React · TypeScript · pnpm
- Supabase (Auth, Postgres, pgvector, Storage)
- Claude via model-agnostic `LLMProvider`
- Vercel for deployment (when ready)

## Setup

```bash
pnpm install
cp .env.example .env.local
# Fill Supabase + ANTHROPIC_API_KEY
# Apply migrations in supabase/migrations via Supabase SQL editor or CLI
pnpm dev
```

### Supabase

1. Create a Supabase project.
2. Run SQL files in `supabase/migrations/` in order, then `supabase/seed.sql`.
3. Enable Email auth.
4. Create a user, then link them to Kona Kai (see seed file comments) or set `BOOTSTRAP_TENANT_SLUG=kona-kai` and sign up with an email you control — first membership auto-links when configured.

## Docs

[`docs/README.md`](./docs/README.md) · [`AGENTS.md`](./AGENTS.md)

## Remote

[github.com/foundry360/socialintelligence](https://github.com/foundry360/socialintelligence)

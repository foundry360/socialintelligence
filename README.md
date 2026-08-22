# Social Intelligence

Multi-tenant **Thought Leadership Intelligence OS** by Foundry360.

Demo / seed tenant: **Kona Kai Corp** (optional). Every real customer gets their own tenant + workspace.

> Not “AI that writes LinkedIn posts.” Curate company-true knowledge, establish an authority baseline, align messaging, then systematically create authoritative content.

## Status

**Phase 2 complete / Phase 3 next:** Knowledge workspace with per-tenant onboarding (create org + primary workspace), structured knowledge, grounded chat.

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
2. Run SQL files in `supabase/migrations/` in order. Optionally run `supabase/seed.sql` for the Kona Kai demo tenant.
3. Enable Email auth.
4. Sign up in the app, then create your organization on `/onboarding`. That creates your tenant, primary workspace, and owner membership.

## Docs

[`docs/README.md`](./docs/README.md) · [`AGENTS.md`](./AGENTS.md)

## Remote

[github.com/foundry360/socialintelligence](https://github.com/foundry360/socialintelligence)

# Phase 1 Setup

## 1. Create Supabase project

Project ref: **`frzuiqafemdmmkqivewi`**  
URL: `https://frzuiqafemdmmkqivewi.supabase.co`

Dashboard: https://supabase.com/dashboard/project/frzuiqafemdmmkqivewi

## 2. Apply migrations

In the SQL editor (or via CLI), run in order:

1. `supabase/migrations/20260821000001_extensions.sql`
2. `supabase/migrations/20260821000002_tenancy.sql`
3. `supabase/migrations/20260821000003_knowledge_spine.sql`
4. `supabase/seed.sql`

CLI (if linked):

```bash
pnpm exec supabase db push
# or
pnpm exec supabase db reset  # local only
```

## 3. Auth

- Authentication → Providers → Email enabled
- For local/dev you may disable “Confirm email”
- **URL configuration** (Authentication → URL configuration):
 - Site URL: `http://localhost:3001` (or your deployed URL)
 - Redirect URLs allowlist must include:
 - `http://localhost:3001/auth/callback`
 - `http://localhost:3001/auth/callback?next=/auth/update-password`
 - `http://localhost:3001/**` (optional wildcard for local)
- Password reset: `/login/forgot` → email link → `/auth/update-password`

## 4. Env

```bash
cp .env.example .env.local
```

Fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (needed when calling Claude; workspace shell works without it)

## 5. Run

```bash
pnpm dev
```

1. Open `/login` → create an account
2. Create your organization on `/onboarding` (tenant + primary workspace)
3. Optional: seed Kona Kai via `supabase/seed.sql` only if you want that demo tenant; membership is no longer auto-bootstrapped

## Exit criteria

- [ ] Authenticated user
- [ ] Membership on a tenant they created (or were invited to)
- [ ] Workspace shell shows that tenant’s primary knowledge workspace
- [ ] `ClaudeProvider.complete` works when API key is set (smoke via future Phase 2 chat or a small script)

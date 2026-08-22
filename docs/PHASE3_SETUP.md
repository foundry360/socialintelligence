# Phase 3 - Authority Baseline

## Goal

Versioned, human-approvable **Authority Baseline** derived from structured knowledge and accepted library sources.

## Routes

| Route | Purpose |
|-------|---------|
| `/workspace/baseline` | Generate, review, approve/reject baseline versions |
| `/workspace/overview` | Delivery sequence progress and CTA |

## Migration

Apply `supabase/migrations/20260821000017_authority_baselines.sql`.

## Generation

- Prompt: `prompts/authority-baseline/v1.md`
- Logic: `lib/knowledge/generate-baseline.ts`
- Requires `ANTHROPIC_API_KEY` (default LLM provider)
- Optional: `OPENAI_API_KEY` improves evidence retrieval via chunk embeddings (migration `016`)

## Workflow

1. Complete structured knowledge (Overview spine).
2. Accept evidence sources in My Library.
3. **Generate draft** on Baseline page (creates `awaiting_approval` version).
4. **Approve** or **Reject** the draft.
5. Only one **approved** baseline per tenant at a time; approving a new version supersedes the prior.

## Exit criteria

Kona Kai has an approved v1 baseline before Phase 4 (Messaging Plan).

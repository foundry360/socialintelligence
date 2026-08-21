# Build Plan

Canonical phased plan: see [ROADMAP.md](./ROADMAP.md).

## Sequence

```text
Phase 1  Platform spine (auth, DB, Claude, Kona Kai seed)
Phase 2  Knowledge Workspace (NotebookLM-like)
Phase 3  Authority Baseline
Phase 4  Messaging / market-alignment plan
Phase 5  Content ops MVP (signals → drafts → approval)
Phase 6  Harden & productize
```

## Rules

1. Structured knowledge before bulk crawl.
2. Citations on baseline and knowledge chat.
3. Human approve on baseline, plan, and drafts.
4. No autonomous publishing.
5. No LinkedIn/content package generation until baseline + plan are approved.
6. Multi-tenant + RLS from Phase 1.

## Kona Kai Stage 1 content pack (non-engineering)

- Positioning draft, 5–10 capabilities, 3–5 personas
- 5–10 explicit POVs
- 10–20 best evidence docs (cases, frameworks, flagship articles)
- Optional: key public URLs

ADRs: [DECISIONS.md](./DECISIONS.md) (ADR-007, ADR-008).

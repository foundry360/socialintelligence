# Signal Engine

## Role

Ingest and analyze market/industry signals, then decide relevance and content worthiness for the tenant.

## MVP

**Manual signal entry only** (title, source, URL, raw text, occurred_at, optional tags).

No automated collectors in Phase 0/MVP core.

## Analysis outputs

For each signal, produce structured `SignalAnalysis`:

| Field | Question |
|-------|----------|
| summary | What happened? |
| whyItMatters | Why does it matter? |
| affectedParties | Who does it affect? |
| relevanceToTenant | Is it relevant? |
| relevanceScore | 0–100 |
| personas | Which buyers care? |
| capabilities | Which offerings relate? |
| povFit | Do we have a legitimate POV? |
| differentiatedAngle | Can we say something different? |
| contentWorthy | Worth creating content? |
| rationale | Short explanation |

Analysis uses `LLMProvider` + Intelligence Layer context. External signal text is labeled **untrusted**.

## Future sources (interfaces only for now)

Healthcare/life sciences news, Salesforce ecosystem, AI/governance/regulatory, reports, competitor activity, search/social trends.

Collector pattern (inspired by SocialRadar, not ported): `SignalCollector` with `pull()` / `normalize()` behind feature flags.

## Dedup & identity

Normalize URL/external ids; store `fingerprint` for dedup within a tenant.

# Signal Engine

> **Canonical architecture:** See [SIGNALING_ARCHITECTURE.md](./SIGNALING_ARCHITECTURE.md) for the full proposed design (review before implementation).

## Role

Continuously ingest external market intelligence, detect meaningful changes, qualify them against organizational context, and surface them in a Project Signal Inbox.

A **signal** is not a news article. It is a meaningful change, development, event, trend, or emerging pattern that may matter to the organization. One signal may have multiple supporting feed items (sources).

## Three-tier model

```text
Source  →  Candidate Signal  →  Qualified Signal
(raw)       (clustered)          (AI-qualified, inbox-ready)
```

| Tier | What it is | Created by |
|------|------------|------------|
| **Source** | RSS/feed item, untrusted artifact | Deterministic collector |
| **Candidate Signal** | Clustered event hypothesis (N sources → 1) | Deterministic clustering |
| **Qualified Signal** | Meaningful change with scores + disposition | Signal Intelligence Agent (Claude) |

An RSS item is never a signal. The Signal Inbox shows **qualified signals** only.

**Future:** N qualified signals → 1 emerging pattern → insight → opportunity.

## MVP scope

1. Watch Profiles (per Project)
2. RSS / structured feed collection (no web crawler)
3. Scheduled ingest (cron)
4. Normalization and deduplication
5. Signal Qualification (Claude, structured)
6. Signal Inbox (human triage)

**Not in MVP:** manual signal entry as primary path, content generation, autonomous opportunity agents.

## Intelligence loop

```text
Feeds → Sources → Candidate Signals → Qualification → Qualified Signals → Inbox
                                                              ↓
                                                    (future) Patterns → Insights
```

## Qualification outputs

The Signal Intelligence Agent evaluates:

| Question | Output field |
|----------|--------------|
| Is this actually a signal? | `is_meaningful` |
| What happened? | `what_happened` |
| Why does it matter? | `why_it_matters` |
| Who is affected? | `who_is_affected` |
| Relevance to project/org? | `scores.relevance` + rationale |
| Authority to speak? | `scores.authority` + rationale |
| Differentiated angle? | `scores.differentiation` + rationale |
| Timeliness? | `scores.timeliness` |
| What should happen? | `disposition`, `recommended_action` |

**Dispositions:** `ignore`, `monitor`, `research`, `discuss`, `develop_pov`, `opportunity`

## Trust model

- Feed items: **untrusted** (`externalUntrusted` LLM channel)
- Knowledge, baseline, accepted library sources: **trusted** context for qualification
- Never fabricate facts, sources, or URLs

## Collectors

MVP: RSS via `watch_feeds` on a schedule. Interface: `domains/signals/collector.ts`.

Future: `news_api`, authorized APIs. No unauthorized scraping.

## Dedup and clustering

- **Sources:** URL fingerprint (exact duplicate prevention)
- **Candidates:** event fingerprint (multiple articles → one candidate)
- **Qualified:** one qualified signal per meaningful candidate (MVP)

See [SIGNALING_ARCHITECTURE.md](./SIGNALING_ARCHITECTURE.md) for full strategy.

## Related docs

- [SIGNALING_ARCHITECTURE.md](./SIGNALING_ARCHITECTURE.md) - full data model, API, agent, UI, phases
- [CONTENT_ENGINE.md](./CONTENT_ENGINE.md) - opportunities and packages (post-signaling)
- [ADR-010](./DECISIONS.md#adr-010-automated-signaling-before-messaging-plan) - delivery sequence

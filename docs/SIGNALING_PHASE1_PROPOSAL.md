# Signaling Phase 1 — Schema & Watch Profiles Proposal

**Status:** Approved — Phase 1 implemented 2026-08-23  
**Date:** 2026-08-23  
**Scope:** Database foundation + Watch Profile UI only  
**Does not include:** ingest, clustering logic, qualification agent, inbox UI

---

## Repository verification summary

| Area | Current state | Phase 1 impact |
|------|---------------|----------------|
| Projects | `missions` table + `mission_sources` + `mission_messages` | Watch profiles FK → `missions.id` |
| Library sources | `knowledge_sources` (curated evidence) | **Do not extend.** Separate `signal_sources` table |
| Signaling DB | **No tables exist** | Clean migration |
| Domain types | `domains/signals/types.ts` conflates `Signal` + `SignalAnalysis` | Refactor types in implementation PR; no DB conflict |
| Conceptual schema | `schema.conceptual.sql` lists legacy `signals` / `signal_analyses` | Update comment block after migration; not applied |
| Cron / jobs | **No** `vercel.json`, no cron routes | `ingestion_runs` table reserved; no job code in Phase 1 |
| Chat | `/api/knowledge/chat` — no signals yet | No chat changes in Phase 1 |
| Baseline | `authority_baselines` tenant-scoped | Future watch-profile generation context; no FK in Phase 1 |
| Auth/RLS | `is_tenant_member()`, editor role checks on mutations | Reuse existing pattern |
| UI patterns | `missions/actions.ts`, modals in `missions-dashboard.tsx`, library catalog CRUD | Watch profile UI follows same patterns |

**Conflicts to resolve before coding:**

1. **`domains/signals/types.ts`** — replace conflated `Signal` with `SignalSource`, `CandidateSignal`, `QualifiedSignal`, `SignalQualification`.
2. **`SIGNALING_ARCHITECTURE.md` candidate statuses** — align to `pending | qualifying | qualified | rejected | expired | merged` (doc currently uses `open | pending_qualification`).
3. **`signal_qualifications` lineage** — add nullable `qualified_signal_id` so rejected qualifications attach to `candidate_signal_id` only (rejected candidates retain audit trail).
4. **Terminology** — code/UI says "Project"; DB says `missions`. No `projects` table.

**Reusable (extend, do not duplicate):**

- `missions`, `tenants`, `tenant_memberships`
- `set_updated_at` trigger function
- `requireWorkspaceContext()` + `createClient()`
- Server action + modal patterns from missions/library

---

## 1. Proposed database entities (Phase 1)

| # | Table | Phase 1 purpose |
|---|-------|-----------------|
| 1 | `watch_profiles` | Project monitoring configuration |
| 2 | `watch_criteria` | Topics, keywords, entities, exclusions, etc. |
| 3 | `watch_feeds` | RSS/feed URLs (configured now; consumed in Phase 2) |
| 4 | `signal_sources` | Tier 1 — raw external items |
| 5 | `candidate_signals` | Tier 2 — clustered event hypotheses |
| 6 | `candidate_signal_sources` | M:N provenance link |
| 7 | `qualified_signals` | Tier 3 — inbox/chat-ready signals |
| 8 | `signal_qualifications` | Versioned AI interpretation (schema only) |
| 9 | `signal_inbox_entries` | Per-project inbox state (schema only) |

**Deferred to Phase 2+ (not in Phase 1 migration):**

- `ingestion_runs` — add when cron ingest ships
- `signal_patterns`, `pattern_qualified_signals` — future clustering layer

---

## 2–4. Fields, keys, and relationships

### ER diagram

```text
tenants
  └── missions (Project)
        └── watch_profiles
              ├── watch_criteria
              └── watch_feeds
                    └── signal_sources (Tier 1)
                          └── candidate_signal_sources
                                    └── candidate_signals (Tier 2)
                                              ├── signal_qualifications
                                              └── qualified_signals (Tier 3)
                                                    ├── signal_qualifications (FK back)
                                                    └── signal_inbox_entries
```

### `watch_profiles`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL, FK → `tenants(id)` ON DELETE CASCADE |
| `mission_id` | uuid | NOT NULL, FK → `missions(id)` ON DELETE CASCADE |
| `name` | text | NOT NULL |
| `description` | text | NOT NULL, default `''` |
| `enabled` | boolean | NOT NULL, default `true` |
| `config` | jsonb | NOT NULL, default `'{}'` — future: baseline-informed settings |
| `created_by` | uuid | FK → `auth.users(id)` ON DELETE SET NULL |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | trigger |
| `deleted_at` | timestamptz | soft delete |

**Indexes:** `(tenant_id, mission_id)` WHERE `deleted_at IS NULL`  
**Unique:** none (multiple profiles per project allowed)

**Future hook:** `config` jsonb can store snapshot refs to baseline version, knowledge hash, project objective without schema migration.

---

### `watch_criteria`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL, FK → `tenants` |
| `watch_profile_id` | uuid | NOT NULL, FK → `watch_profiles(id)` ON DELETE CASCADE |
| `criterion_type` | text | NOT NULL, CHECK (see enums) |
| `value` | text | NOT NULL |
| `value_normalized` | text | NOT NULL — lowercase/trimmed for matching |
| `metadata` | jsonb | NOT NULL, default `'{}'` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | trigger |

**Indexes:** `(watch_profile_id, criterion_type)`, `(watch_profile_id, value_normalized)`  
**Unique:** `(watch_profile_id, criterion_type, value_normalized)` — prevent duplicate criteria

---

### `watch_feeds`

Configured in Phase 1 UI; consumed in Phase 2 ingest.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL, FK → `tenants` |
| `watch_profile_id` | uuid | NOT NULL, FK → `watch_profiles(id)` ON DELETE CASCADE |
| `feed_type` | text | NOT NULL, default `'rss'`, CHECK |
| `feed_url` | text | NOT NULL |
| `label` | text | nullable |
| `enabled` | boolean | NOT NULL, default `true` |
| `last_fetched_at` | timestamptz | nullable |
| `last_etag` | text | nullable |
| `last_modified` | text | nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | trigger |
| `deleted_at` | timestamptz | nullable |

**Unique:** `(watch_profile_id, feed_url)` WHERE `deleted_at IS NULL`

---

### `signal_sources` (Tier 1)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL, FK → `tenants` |
| `mission_id` | uuid | NOT NULL, FK → `missions(id)` ON DELETE CASCADE |
| `watch_profile_id` | uuid | NOT NULL, FK → `watch_profiles(id)` ON DELETE CASCADE |
| `watch_feed_id` | uuid | nullable, FK → `watch_feeds(id)` ON DELETE SET NULL |
| `title` | text | NOT NULL |
| `description` | text | NOT NULL, default `''` |
| `url` | text | NOT NULL |
| `canonical_url` | text | NOT NULL |
| `publisher` | text | NOT NULL, default `''` |
| `author` | text | nullable |
| `published_at` | timestamptz | nullable |
| `ingested_at` | timestamptz | NOT NULL, default `now()` |
| `source_type` | text | NOT NULL, CHECK — `rss`, `news_api`, `web`, `other` |
| `domain` | text | NOT NULL, default `''` |
| `authority_level` | text | NOT NULL, default `'unknown'`, CHECK |
| `content_hash` | text | NOT NULL |
| `url_fingerprint` | text | NOT NULL |
| `raw_payload` | jsonb | NOT NULL, default `'{}'` |
| `processing_status` | text | NOT NULL, default `'pending'`, CHECK |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | trigger |

**No `candidate_signal_id` on source** — provenance flows through `candidate_signal_sources` only (avoids redundant FK drift).

**Unique:** `(tenant_id, url_fingerprint)`  
**Indexes:** `(mission_id, ingested_at DESC)`, `(watch_profile_id, ingested_at DESC)`

---

### `candidate_signals` (Tier 2)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL, FK → `tenants` |
| `mission_id` | uuid | NOT NULL, FK → `missions(id)` ON DELETE CASCADE |
| `watch_profile_id` | uuid | nullable, FK → `watch_profiles(id)` ON DELETE SET NULL |
| `title` | text | NOT NULL |
| `event_fingerprint` | text | NOT NULL |
| `canonical_event_key` | text | nullable — optional human/debug identifier |
| `status` | text | NOT NULL, default `'pending'`, CHECK |
| `source_count` | int | NOT NULL, default `0` |
| `cluster_confidence` | numeric(4,3) | nullable — 0–1, set by clustering (Phase 2) |
| `first_seen_at` | timestamptz | NOT NULL, default `now()` |
| `last_seen_at` | timestamptz | NOT NULL, default `now()` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | trigger |

**Unique:** `(tenant_id, mission_id, event_fingerprint)`  
**Indexes:** `(mission_id, status, last_seen_at DESC)`, `(watch_profile_id, status)`

---

### `candidate_signal_sources`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL, FK → `tenants` |
| `candidate_signal_id` | uuid | NOT NULL, FK → `candidate_signals(id)` ON DELETE CASCADE |
| `signal_source_id` | uuid | NOT NULL, FK → `signal_sources(id)` ON DELETE CASCADE |
| `link_reason` | text | NOT NULL, default `'initial'`, CHECK |
| `linked_at` | timestamptz | NOT NULL, default `now()` |

**Unique:** `(candidate_signal_id, signal_source_id)`  
**Indexes:** `(signal_source_id)` — reverse provenance lookup

---

### `qualified_signals` (Tier 3)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL, FK → `tenants` |
| `mission_id` | uuid | NOT NULL, FK → `missions(id)` ON DELETE CASCADE |
| `candidate_signal_id` | uuid | NOT NULL, FK → `candidate_signals(id)` — **immutable provenance** |
| `watch_profile_id` | uuid | nullable, FK → `watch_profiles(id)` ON DELETE SET NULL |
| `title` | text | NOT NULL |
| `summary` | text | NOT NULL, default `''` |
| `signal_type` | text | NOT NULL, default `'event'`, CHECK |
| `status` | text | NOT NULL, default `'active'`, CHECK |
| `workflow_state` | text | NOT NULL, default `'signal.analyzed'` |
| `latest_qualification_id` | uuid | nullable — denormalized pointer (set by app) |
| `qualified_at` | timestamptz | NOT NULL, default `now()` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | trigger |
| `deleted_at` | timestamptz | nullable |

**Indexes:** `(mission_id, qualified_at DESC)` WHERE `deleted_at IS NULL`, `(candidate_signal_id)`  
**Unique (MVP):** `(candidate_signal_id)` WHERE `deleted_at IS NULL` — one active qualified signal per candidate; re-qualify supersedes via `status = 'superseded'`

---

### `signal_qualifications`

Immutable interpretation records. Supports rejected candidates (no qualified signal).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL, FK → `tenants` |
| `candidate_signal_id` | uuid | NOT NULL, FK → `candidate_signals(id)` ON DELETE CASCADE |
| `qualified_signal_id` | uuid | nullable, FK → `qualified_signals(id)` ON DELETE SET NULL |
| `version` | int | NOT NULL |
| `is_meaningful` | boolean | NOT NULL, default `false` |
| `what_happened` | text | NOT NULL, default `''` |
| `why_it_matters` | text | NOT NULL, default `''` |
| `who_is_affected` | jsonb | NOT NULL, default `'[]'` |
| `is_new_development` | boolean | nullable |
| `relevance_rationale` | text | NOT NULL, default `''` |
| `authority_rationale` | text | NOT NULL, default `''` |
| `differentiation_rationale` | text | NOT NULL, default `''` |
| `timeliness_rationale` | text | NOT NULL, default `''` |
| `recommended_action` | text | NOT NULL, default `''` |
| `disposition` | text | NOT NULL, default `'ignore'`, CHECK |
| `confidence` | numeric(4,3) | nullable — **assessment confidence** (0–1) |
| `scores` | jsonb | NOT NULL, default `'{}'` — **signal scores** (see below) |
| `overall_score` | int | nullable — **signal score** 0–100 (not confidence) |
| `persona_ids` | uuid[] | NOT NULL, default `'{}'` |
| `capability_ids` | uuid[] | NOT NULL, default `'{}'` |
| `pov_ids` | uuid[] | NOT NULL, default `'{}'` |
| `structured_result` | jsonb | NOT NULL, default `'{}'` — extensible agent output |
| `model_provider` | text | nullable |
| `model_name` | text | nullable |
| `prompt_name` | text | nullable |
| `prompt_version` | text | nullable |
| `qualified_at` | timestamptz | NOT NULL, default `now()` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

**Unique:** `(candidate_signal_id, version)`  
**Indexes:** `(qualified_signal_id)` WHERE `qualified_signal_id IS NOT NULL`

**`scores` jsonb shape (fixed keys, extensible):**

```json
{
  "relevance": 0,
  "authority": 0,
  "impact": 0,
  "timeliness": 0,
  "differentiation": 0
}
```

---

### `signal_inbox_entries`

Schema in Phase 1; UI in Phase 4.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL, FK → `tenants` |
| `mission_id` | uuid | NOT NULL, FK → `missions(id)` ON DELETE CASCADE |
| `qualified_signal_id` | uuid | NOT NULL, FK → `qualified_signals(id)` ON DELETE CASCADE |
| `read_at` | timestamptz | nullable |
| `archived_at` | timestamptz | nullable |
| `followed` | boolean | NOT NULL, default `false` |
| `user_disposition` | text | nullable, CHECK |
| `notes` | text | NOT NULL, default `''` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | trigger |

**Unique:** `(mission_id, qualified_signal_id)`

---

## 5. Proposed enums / status checks

### `watch_criteria.criterion_type`

`topic`, `keyword`, `entity`, `company`, `competitor`, `technology`, `product`, `industry`, `regulatory_body`, `organization`, `market_category`, `geography`, `domain`, `exclusion`

### `watch_feeds.feed_type`

`rss` (Phase 1), later: `news_api`, `atom`

### `signal_sources.source_type`

`rss`, `news_api`, `web`, `other`

### `signal_sources.authority_level`

`unknown`, `low`, `medium`, `high`, `primary` — set by rules or future scoring; default `unknown`

### `signal_sources.processing_status`

`pending`, `clustered`, `ignored`, `failed`

### `candidate_signals.status`

`pending`, `qualifying`, `qualified`, `rejected`, `expired`, `merged`

- **Rejected/expired candidates are retained** for analytics and learning.
- **Merged** when absorbed into another candidate (future clustering).

### `candidate_signal_sources.link_reason`

`initial`, `same_url`, `near_duplicate`, `same_event`, `corroboration`

### `qualified_signals.signal_type`

`event`, `announcement`, `trend`, `regulatory`, `competitive`, `technology`, `market`, `conversation`, `other`

### `qualified_signals.status`

`active`, `archived`, `superseded`

### `signal_qualifications.disposition`

`ignore`, `monitor`, `research`, `discuss`, `develop_pov`, `opportunity`

---

## 6–7. Indexes and constraints (summary)

| Constraint | Rationale |
|------------|-----------|
| `tenant_id` on every table | RLS + query scoping |
| FK cascade on mission delete | Project deletion cleans signaling data |
| `url_fingerprint` unique per tenant | Prevent duplicate sources |
| `event_fingerprint` unique per mission | One candidate per event cluster |
| `(candidate_signal_id, signal_source_id)` unique | Provenance integrity |
| `(candidate_signal_id, version)` unique on qualifications | Versioning |
| CHECK constraints on all status/type enums | DB-level validation |
| Soft delete on `watch_profiles`, `watch_feeds`, `qualified_signals` | Audit retention |
| No soft delete on `signal_sources`, `candidate_signals` | Immutable lineage |

**Tenant consistency triggers (recommended):**  
Before insert/update on child rows, verify `mission_id` and `watch_profile_id` belong to same `tenant_id` as parent (matches `mission_messages` pattern). Can be app-enforced in Phase 1; DB trigger optional.

---

## 8. Provenance / lineage model

Immutable chain:

```text
watch_feed → signal_source → candidate_signal_source → candidate_signal
                                                              ↓
                                                    signal_qualification
                                                              ↓
                                                    qualified_signal (if meaningful)
                                                              ↓
                                                    signal_inbox_entry
```

**Queryable answers:**

| Question | How |
|----------|-----|
| Where did this originate? | `qualified_signals.candidate_signal_id` → `candidate_signal_sources` → `signal_sources` → `watch_feeds` |
| Which sources contributed? | JOIN `candidate_signal_sources` ON candidate |
| First detected? | `candidate_signals.first_seen_at` (min of linked source `ingested_at`) |
| Last corroborated? | `candidate_signals.last_seen_at` (updated on new source link) |
| Which candidate produced qualified? | `qualified_signals.candidate_signal_id` |
| Which qualification produced interpretation? | `qualified_signals.latest_qualification_id` or MAX version on `signal_qualifications` |
| Rejected attempt history? | `signal_qualifications` WHERE `qualified_signal_id IS NULL` |

**No source content duplication** on candidate or qualified rows. Title on candidate is a deterministic display copy; canonical text stays on `signal_sources`.

---

## 9. Qualification versioning model

- Versions are per **`candidate_signal_id`**, not per qualified signal.
- Version increments on each qualification run (including re-runs after merge).
- **Promotion flow (Phase 3):**
  1. Insert `signal_qualifications` (version N).
  2. If `is_meaningful`: create `qualified_signals`, set `qualified_signal_id` on qualification, update `latest_qualification_id`, candidate → `qualified`.
  3. If not meaningful: `qualified_signal_id` stays NULL, candidate → `rejected`.
- **Re-qualify:** new version; may supersede prior `qualified_signals.status`.
- Model/prompt fields are per-row — no hard-coded version.

---

## 10. Future signal patterns (schema hook, no tables yet)

Phase 1 establishes stable FK targets:

```text
-- FUTURE (Phase 6+)
signal_patterns (
  id, tenant_id, mission_id, title, summary, status, ...
)

pattern_qualified_signals (
  pattern_id FK → signal_patterns,
  qualified_signal_id FK → qualified_signals,
  link_reason, confidence, ...
)
```

`qualified_signals.id` is the join target. No pattern columns on qualified signals in Phase 1.

---

## 11. Future agent orchestration (schema hook)

| Future capability | Supported by |
|-------------------|--------------|
| Signal Scout (collect) | `watch_feeds`, `signal_sources` |
| Signal Clustering | `candidate_signals.event_fingerprint`, `cluster_confidence`, `merged` status |
| Signal Intelligence Agent | `signal_qualifications` + `structured_result` jsonb |
| Pattern Agent | future `signal_patterns` M:N |
| Opportunity Agent | future `content_opportunities.signal_id` → `qualified_signals.id` |

`signal_qualifications.structured_result` and `watch_profiles.config` provide extension without migrations.

`workflow_state` on `qualified_signals` aligns with `lib/workflow/states.ts`.

---

## 12. Entities NOT to extend

| Existing entity | Reason |
|-----------------|--------|
| `knowledge_sources` | Different trust model (curated evidence vs untrusted external) |
| `missions` | Use FKs; do not add signal columns to missions |
| `authority_baselines` | Context for future watch generation; no direct FK in Phase 1 |
| Legacy `domains/signals/types.ts` `Signal` | Replace with tier-specific types |

---

## 13. Migration sequence (proposed)

**Single migration** (recommended for Phase 1 foundation):

```
supabase/migrations/20260823000020_signaling_foundation.sql
```

Contents in order:

1. `watch_profiles`
2. `watch_criteria`
3. `watch_feeds`
4. `signal_sources`
5. `candidate_signals`
6. `candidate_signal_sources`
7. `qualified_signals`
8. `signal_qualifications`
9. `signal_inbox_entries`
10. RLS policies (select: tenant member; insert/update/delete: editor+)
11. `set_updated_at` triggers on mutable tables

**Optional seed** (dev only, separate file or conditional):

`supabase/seed_signaling_dev.sql` — example watch profile + criteria for Kona Kai test mission. **No fabricated signal_sources or signals.**

**Phase 2 migration** (later):

`20260823000021_ingestion_runs.sql` — when cron ingest ships.

**Not splitting** watch vs signal tiers into separate migrations unless you prefer smaller PRs. Single migration keeps FK integrity atomic.

---

## Phase 1 implementation plan (after approval)

| Step | Deliverable |
|------|-------------|
| 7 | Approved migration SQL |
| 8 | `domains/signals/` type refactor |
| 8 | `lib/workspace/watch-profiles.ts` mappers |
| 8 | `app/workspace/missions/signals/actions.ts` — CRUD |
| 8 | Project sub-nav: Chat \| Watch Profiles |
| 8 | Watch profile list + create/edit modal + criteria tags + feed URL fields |
| 9 | Unit tests: criterion normalization, type mappers |
| 9 | Integration test: RLS tenant isolation on watch_profiles |
| 10 | `pnpm typecheck`, lint, existing tests |
| 11 | Manual verify: CRUD, enable/disable, soft delete, mission FK cascade |

**Explicitly NOT built:** ingest routes, clustering, qualification, inbox UI, seed signal data.

---

## Open decisions for approval

1. **Single vs split migration** — recommend one file `000020_signaling_foundation.sql`.
2. **`watch_feeds` in Phase 1 UI** — include feed URL fields in watch profile form (configured but inactive until Phase 2)?
3. **Rejected qualification storage** — approve `signal_qualifications.qualified_signal_id` nullable pattern?
4. **One active qualified signal per candidate** — approve unique `(candidate_signal_id)` on qualified_signals?
5. **Seed data** — watch profile only for dev tenant, or no seed at all?

---

## Approval checklist

- [ ] Three-tier tables approved as specified
- [ ] Enums/statuses approved
- [ ] Provenance model approved
- [ ] Qualification versioning model approved
- [ ] Migration sequence approved
- [ ] Changes to `SIGNALING_ARCHITECTURE.md` noted (candidate statuses, qualification FK) approved

**Awaiting your approval before any migration or implementation code.**

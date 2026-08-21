# Knowledge Architecture

## Principle

Do **not** “train an LLM on the company.” Own a proprietary intelligence layer; retrieve and compose it into prompts as **data**.

## Three stores

### 1. Structured relational (Postgres)

Use for: companies, people, industries, topics, POVs, content metadata, signals, audiences, entities, relationships, scores, workflow, approvals.

Relationships and scores belong here.

### 2. Vector (pgvector)

Use for: document chunks, article bodies, research snippets, semantic similarity, contextual retrieval.

Embeddings are an index over content — not the system of record for identity or relationships.

### 3. Metadata

On documents/signals/content: source, date, author, confidence, authority, relevance, freshness, tenant_id, sensitivity classification.

## Intelligence Layer façade

`lib/intelligence` exposes tenant-scoped operations such as:

- `getCompanyContext(tenantId)`
- `getRelevantPOVs(tenantId, query)`
- `getAudienceContext(tenantId, signalOrTopic)`
- `getRelevantEntities(tenantId, query)`
- `getTopicContext(tenantId, topicId)`
- `getContentHistory(tenantId, filters)`
- `getRelevantSignals(tenantId, filters)`
- `getEditorialRules(tenantId)`
- `getPerformanceInsights(tenantId, filters)` — later

Names may evolve; the separation from `LLMProvider` must not.

## Ingestion (phased)

**Phase 1:** seed tenant + empty workspace; structured tables ready.  
**Phase 2:** guided structured entry + uploads/URLs/notes → chunk → embed → link to topics/capabilities; grounded chat with citations.  
**Phase 3–4:** derive Authority Baseline and Messaging Plan from curated knowledge (human-approved).  
**Later:** continuous content history sync, richer crawls (still curated).

## Knowledge layers

1. **Structured spine** — profile, capabilities, personas, terminology, POVs (system of record for claims).  
2. **Evidence corpus** — uploads, URLs, notes (proof; ranked by trust).  
3. **Derived intelligence** — baselines, plans, chat answers (always citable; never silent “truth”).

## Trust ranking (retrieval & baseline)

1. Human-entered POV / terminology  
2. Approved case studies / delivery artifacts  
3. Executive-authored content  
4. Published company articles  
5. Generic website marketing pages  
6. External mentions (market signal — not core knowledge)

## Sensitivity

Assume confidential business information. Classification fields + RLS + audit. Never send unnecessary sensitive chunks to the model.

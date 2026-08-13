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

**MVP:** seed/manual load of company profile, POVs, personas, terminology.  
**Later:** secure document upload → chunk → embed → link to entities/topics.

## Sensitivity

Assume confidential business information. Classification fields + RLS + audit. Never send unnecessary sensitive chunks to the model.

# LLM Architecture

## Abstraction

```text
interface LLMProvider {
  readonly id: string
  complete(request: LLMRequest): Promise<LLMResponse>
  completeStructured<T>(request: LLMRequest, schema: …): Promise<T>
}
```

Implementations:

| Provider | Status |
|----------|--------|
| `ClaudeProvider` | First real implementation |
| `OpenAIProvider` | Stub |
| `LocalModelProvider` | Stub |

Factory selects provider from env (`LLM_PROVIDER`, default `claude`).

## Rules

- Domains and workflows depend on `LLMProvider`, never on Anthropic SDK types.
- Server-only modules; keys in env secrets.
- Record `provider`, `model`, `promptName`, `promptVersion` on generations.

## Prompt architecture

```text
/prompts
  signal-analysis/
  opportunity-scoring/
  pov-development/
  linkedin-generation/
  article-generation/
  aeo-analysis/
  geo-analysis/
  editorial-review/
```

Each version file includes frontmatter-like metadata: purpose, inputs, expected output, version, model assumptions, evaluation criteria.

## Context separation (mandatory)

```text
SYSTEM INSTRUCTIONS     product + safety rules
TENANT KNOWLEDGE        POVs, terminology, profiles (trusted internal data)
EXTERNAL SIGNALS        untrusted; clearly delimited
USER INPUT              editor instructions
MODEL OUTPUT            validated against schema
```

External text that says “ignore previous instructions” is content to analyze, never authority.

## Preferred model

Claude for reasoning and content. Swap via provider config without rewriting domain logic.

See [ADR-011](./DECISIONS.md#adr-011---llm-tiering-and-context-caching) for the approved tiering and caching strategy.

## Usage tiers (ADR-011)

| Tier | Mechanism | Examples |
|------|-----------|----------|
| **0 - Deterministic** | Code, SQL, embeddings | RSS ingest, URL dedup, event clustering, `retrieveEvidenceChunks`, inbox filters |
| **1 - Local (optional)** | `LocalModelProvider` / Ollama | Pre-qualification relevance gate, feed tagging (not MVP) |
| **2 - Cached context** | `ContextBundle` + version keys | Structured knowledge, approved baseline, project + watch profile blocks |
| **3 - Claude** | `ClaudeProvider` | Signal qualification, Insights chat, baseline draft, messaging/content |

**Rule:** Do not use Tier 3 for work that belongs in Tier 0 or Tier 2.

## Context bundles (planned)

Stable context must not be rebuilt and resent on every LLM call. Use versioned bundles:

```text
buildTenantContextBundle(tenantId)
  → structured knowledge + approved baseline summary
  → invalidate when knowledge or baseline version changes

buildProjectContextBundle(missionId)
  → mission title/description + watch profile summary
  → invalidate when mission or watch profiles change
```

Per-request variables (always fresh):

- **Chat:** retrieval query → evidence chunks; conversation history; user question
- **Qualification:** candidate signal + linked `signal_sources` in `externalUntrusted`

Implementation target: `lib/intelligence/context-bundle.ts` before Phase 3 signal qualification.

Optional: Anthropic prompt caching on stable prefixes in `ClaudeProvider` after bundles land.

## Signaling-specific rules

- **Ingest and cluster:** Tier 0 only. No LLM in the collector path.
- **Qualification:** Tier 3 (Claude), one call per **candidate signal**, not per RSS item.
- **Context for qualification:** reuse tenant + project bundles (Tier 2); only candidate sources vary per call.

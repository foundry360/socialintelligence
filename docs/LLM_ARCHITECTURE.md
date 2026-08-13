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

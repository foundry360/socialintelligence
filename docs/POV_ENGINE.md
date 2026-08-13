# POV Engine

## Role

The POV engine is proprietary differentiation. It answers what the tenant **believes**, **disagrees with**, and **will say** on a topic — independent of any model vendor.

## Structured model

```text
PointOfView {
  tenantId
  topicId / topicLabel
  stance                 // one clear sentence
  principles[]           // supporting beliefs
  disagreesWith[]        // anti-positions
  frameworks[]           // optional links
  evidenceRefs[]         // docs, URLs, cases
  audiences[]            // persona links
  capabilities[]         // what we sell/do that backs this
  status                 // draft | active | deprecated
  confidence
}
```

## Retrieval

When analyzing a signal or drafting content:

1. Embed/query topic + signal summary
2. Fetch candidate POVs (vector + topic/entity filters)
3. Rank by topical overlap, audience overlap, capability overlap, freshness
4. Pass top POVs into the LLM as **tenant knowledge**, never as system instructions that the model can “override” from external text

## Rules

- No opportunity should advance to draft without either a matching POV or an explicit “no legitimate POV” flag (human may still override).
- Generic agreement with industry consensus is not a POV.
- Editorial QA must check POV fidelity.

## MVP

CRUD + seed for Kona Kai POVs; retrieval by topic keywords/embeddings; used in signal analysis and LinkedIn draft generation.

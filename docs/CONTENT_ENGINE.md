# Content Engine

## Principle

A signal does **not** automatically become a post. Signals become **Content Opportunities**, then optional **Content Packages**.

## Content Opportunity

Derived from signal analysis + POVs + audiences + commercial fit.

Includes: title, summary, scores, audiences, linked signal, linked POVs, recommended formats, rationale.

### Scoring model (0–100 weighted)

| Dimension | Intent |
|-----------|--------|
| Relevance | Matters to tenant |
| Audience | Clear buyer/persona care |
| Authority | Legitimate expertise |
| Differentiation | Non-generic angle |
| Timeliness | Why now |
| Commercial | Ties to problems we solve |
| Search/AEO/GEO | Authority-building value |
| Package potential | Supports multiple assets |

Weights are configurable per tenant later; ship sensible defaults first.

## Content Package

One opportunity → multiple related drafts:

- LinkedIn POV / executive / company variants
- Long-form article outline or draft
- FAQ / AEO Q&A set
- Supporting web copy notes
- Internal link / cluster suggestions
- Follow-up topic ideas

MVP package minimum: **LinkedIn draft + AEO questions + GEO/editorial notes**.

## Generation

Prompts live under `/prompts`. Generation always receives:

1. System instructions (product rules)
2. Tenant knowledge / POV / terminology (trusted internal)
3. Signal excerpts (untrusted)
4. User/editor instructions

## Formats (eventual)

LinkedIn short/POV/contrarian/educational/executive/company/conversation; long-form TL; industry analysis; framework articles; AEO Q&A; GEO-oriented pages; sales enablement.

## Human gate

Drafts remain `awaiting_human_approval` until an authorized user approves. No publish integrations in MVP.

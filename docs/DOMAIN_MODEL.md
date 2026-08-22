# Domain Model

All tenant-owned entities include `tenantId` / `tenant_id` unless noted.

## Tenancy

| Entity | Description |
|--------|-------------|
| `Tenant` | Customer organization (e.g. Kona Kai Corp) |
| `TenantMembership` | User ↔ tenant with role |
| `Brand` | Brand under a tenant (future multi-brand) |
| `ExecutiveVoice` | Named executive voice/style profile |

**Roles (initial):** `owner` \| `admin` \| `editor` \| `viewer`

## Knowledge

| Entity | Description |
|--------|-------------|
| `CompanyProfile` | Positioning, summary, differentiators |
| `Capability` | Services / offerings |
| `Industry` | Industries served |
| `Document` / `KnowledgeDocument` | Internal docs / research (metadata + storage ref + optional chunks) |
| `Terminology` | Preferred terms and forbidden/generic replacements |
| `ContentAsset` | Existing published or archived content |
| `KnowledgeWorkspace` | NotebookLM-style workspace container (Phase 2) |

## Authority & messaging (Phases 3-4)

| Entity | Description |
|--------|-------------|
| `AuthorityBaseline` | Versioned strengths/weaknesses/gaps/POV coverage; human-approved |
| `MessagingPlan` | Market-alignment plan derived from approved baseline; human-approved |

## Audience

| Entity | Description |
|--------|-------------|
| `ICP` | Ideal customer profile |
| `Persona` | Buyer persona with pains, goals, language |

## POV

| Entity | Description |
|--------|-------------|
| `PointOfView` | Topic + stance + principles + disagreements + evidence refs |
| `POVPrinciple` | Supporting principle under a POV |

Example shape:

```text
Topic: AI Governance
Stance: Governance should accelerate AI adoption rather than prevent it.
Principles: [explicit decision rights, embed security in ops, …]
DisagreesWith: [governance as post-hoc compliance gate, …]
```

## Entities & topics (light graph)

| Entity | Description |
|--------|-------------|
| `Topic` | Canonical topic in taxonomy |
| `EntityNode` | Named entity (company, product, concept, role, …) |
| `EntityRelationship` | Directed/undirected edge with type + weight |

No dedicated graph database in MVP.

## Signals

| Entity | Description |
|--------|-------------|
| `Signal` | Raw or normalized market signal (manual in MVP) |
| `SignalAnalysis` | Structured analysis output |

Analysis answers: what happened, why it matters, who cares, relevance, personas, capabilities, POV fit, content worthiness.

## Opportunities & content

| Entity | Description |
|--------|-------------|
| `ContentOpportunity` | Scored opportunity derived from signal + intelligence |
| `OpportunityScore` | Dimension scores + weighted total |
| `ContentPackage` | Bundle of related drafts from one opportunity |
| `ContentDraft` | Single artifact (LinkedIn post, article, FAQ, …) |
| `EditorialReview` | Editorial scores + flags |
| `ApprovalDecision` | Human approve/reject/request changes |

### Opportunity score dimensions

Relevance, Audience fit, Authority, Differentiation, Timeliness, Commercial relevance, Search/AEO/GEO value, Content package potential → weighted total (0-100).

### Editorial score dimensions

Usefulness, Originality, Non-generic, Voice/POV fidelity, Evidence quality, Claim restraint, Terminology consistency, Commercial relevance, Buyer-question fit, Topical authority, Engagement reason.

## Analytics (later)

`PerformanceEvent`, topic/content rollups, human-edit feedback, approval outcomes for the learning loop.

## Workflow states

```text
signal.received
signal.analyzed
opportunity.draft
opportunity.scored
package.generating
package.ready_for_editorial
editorial.scored
awaiting_human_approval
approved | rejected | changes_requested
published (future)
```

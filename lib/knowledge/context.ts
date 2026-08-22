import "server-only";

import { createClient } from "@/lib/db/server";
import { createServiceClient } from "@/lib/db/supabase";
import { formatTenantKnowledgeBlock } from "@/lib/intelligence";
import type {
  Capability,
  CompanyProfile,
  Industry,
  MarketQuestion,
  ProofItem,
  TerminologyEntry,
} from "@/domains/knowledge/types";
import type { PointOfView } from "@/domains/pov/types";
import type { Persona } from "@/domains/audience/types";

export async function buildStructuredKnowledgeText(
  tenantId: string,
): Promise<string> {
  // Structured knowledge is readable under RLS; keep user-scoped client.
  const supabase = await createClient();
  const [
    { data: company },
    { data: industries },
    { data: capabilities },
    { data: povs },
    { data: personas },
    { data: proofItems },
    { data: marketQuestions },
    { data: terms },
  ] = await Promise.all([
    supabase
      .from("company_profiles")
      .select(
        "id, tenant_id, legal_name, display_name, tagline, summary, positioning, differentiators, website_url, website_urls, created_at, updated_at",
      )
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("industries")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(40),
    supabase
      .from("capabilities")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(40),
    supabase
      .from("points_of_view")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(20),
    supabase
      .from("personas")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(20),
    supabase
      .from("proof_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(50),
    supabase
      .from("market_questions")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(80),
    supabase
      .from("terminology_entries")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(50),
  ]);

  const companyMapped: CompanyProfile | null = company
    ? {
        id: company.id,
        tenantId,
        legalName: company.legal_name,
        displayName: company.display_name,
        tagline: company.tagline ?? undefined,
        summary: company.summary,
        positioning: company.positioning,
        differentiators: (company.differentiators as string[]) ?? [],
        websiteUrl: company.website_url ?? undefined,
        websiteUrls: Array.isArray(company.website_urls)
          ? (company.website_urls as string[])
          : company.website_url
            ? [company.website_url]
            : undefined,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
      }
    : null;

  const industryMapped: Industry[] = (industries ?? []).map((i) => ({
    id: i.id,
    tenantId,
    name: i.name,
    description: i.description ?? "",
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  }));

  const capabilityMapped: Capability[] = (capabilities ?? []).map((c) => ({
    id: c.id,
    tenantId,
    name: c.name,
    description: c.description ?? "",
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  const povMapped: PointOfView[] = (povs ?? []).map((p) => ({
    id: p.id,
    tenantId,
    topicLabel: p.topic_label,
    stance: p.stance,
    principles: (p.principles as string[]) ?? [],
    disagreesWith: (p.disagrees_with as string[]) ?? [],
    status: p.status,
    confidence: Number(p.confidence ?? 0.5),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  const personaMapped: Persona[] = (personas ?? []).map((p) => ({
    id: p.id,
    tenantId,
    name: p.name,
    titlePatterns: (p.title_patterns as string[]) ?? [],
    goals: (p.goals as string[]) ?? [],
    pains: (p.pains as string[]) ?? [],
    languageNotes: p.language_notes ?? undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  const proofMapped: ProofItem[] = (proofItems ?? []).map((p) => ({
    id: p.id,
    tenantId,
    proofType: p.proof_type,
    title: p.title,
    summary: p.summary ?? "",
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  const personaNameById = new Map(
    personaMapped.map((p) => [p.id, p.name] as const),
  );
  const priorityRank: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const stageRank: Record<string, number> = {
    awareness: 0,
    consideration: 1,
    decision: 2,
    retention: 3,
  };
  const questionsMapped: MarketQuestion[] = (marketQuestions ?? [])
    .map((q) => ({
      id: q.id,
      tenantId,
      question: q.question,
      personaId: q.persona_id ?? undefined,
      personaName: q.persona_id
        ? personaNameById.get(q.persona_id)
        : undefined,
      topic: q.topic ?? "",
      buyingStage: q.buying_stage,
      priority: q.priority,
      notes: q.notes ?? undefined,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    }))
    .sort((a, b) => {
      const pa = (a.personaName ?? "").localeCompare(b.personaName ?? "");
      if (pa !== 0) return pa;
      const ta = a.topic.localeCompare(b.topic);
      if (ta !== 0) return ta;
      const sa =
        (stageRank[String(a.buyingStage)] ?? 9) -
        (stageRank[String(b.buyingStage)] ?? 9);
      if (sa !== 0) return sa;
      return (
        (priorityRank[String(a.priority)] ?? 9) -
        (priorityRank[String(b.priority)] ?? 9)
      );
    });

  const termMapped: TerminologyEntry[] = (terms ?? []).map((t) => ({
    id: t.id,
    tenantId,
    preferredTerm: t.preferred_term,
    avoidTerms: (t.avoid_terms as string[]) ?? [],
    definition: t.definition ?? undefined,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));

  return formatTenantKnowledgeBlock({
    company: companyMapped,
    industries: industryMapped,
    capabilities: capabilityMapped,
    povs: povMapped,
    personas: personaMapped,
    proofItems: proofMapped,
    marketQuestions: questionsMapped,
    terminology: termMapped,
  });
}

export type RetrievedChunk = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType?: string;
  sourceUrl?: string | null;
  chunkIndex: number;
  content: string;
  rank: number | null;
};

function wantsWebsiteEvidence(query: string): boolean {
  return /\b(website|web\s*site|homepage|home\s*page|our\s+site|landing\s+page|konakai\.com|www\.)\b/i.test(
    query,
  );
}

/**
 * Identify the user via Auth, authorize membership via service role, then
 * load evidence via service role. Avoids empty reads when the user JWT is
 * valid for getUser() but not attached to PostgREST in Server Actions.
 *
 * When `sourceIds` is provided, only those accepted sources are used.
 */
export async function retrieveEvidenceChunks(
  tenantId: string,
  query: string,
  limit = 12,
  options: { sourceIds?: string[] } = {},
): Promise<RetrievedChunk[]> {
  if (!tenantId) {
    throw new Error("Missing tenant id");
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const db = createServiceClient();

  const { data: membership, error: membershipError } = await db
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Membership check failed: ${membershipError.message}`);
  }
  if (!membership) {
    throw new Error("Not a member of this tenant");
  }

  const requestedIds = (options.sourceIds ?? []).filter(Boolean);
  const scoped = requestedIds.length > 0;
  const websiteFocus = !scoped && wantsWebsiteEvidence(query);

  let sourceQuery = db
    .from("knowledge_sources")
    .select("id, title, source_type, url, body")
    .eq("tenant_id", tenantId)
    .eq("evidence_status", "accepted")
    .neq("sensitivity", "confidential")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (scoped) {
    sourceQuery = sourceQuery.in("id", requestedIds);
  }

  const { data: sources, error: sourceError } = await sourceQuery;

  if (sourceError) {
    throw new Error(`Failed to load sources: ${sourceError.message}`);
  }

  let selected = sources ?? [];
  if (websiteFocus) {
    const urlSources = selected.filter((s) => s.source_type === "url");
    if (urlSources.length > 0) selected = urlSources;
  }

  selected = selected.filter((s) => (s.body || "").trim().length >= 40);
  if (selected.length === 0) return [];

  const sourceIds = selected.map((s) => s.id);
  const metaById = new Map(selected.map((s) => [s.id, s] as const));

  if (!websiteFocus && query.trim()) {
    const { data: ftsRows } = await db.rpc("search_knowledge_chunks", {
      p_tenant_id: tenantId,
      p_query: query,
      p_limit: limit,
    });
    // RPC enforces is_tenant_member(auth.uid()) - service role has no uid, so this may fail.
    // Ignore FTS failures and continue with direct chunk reads.
    if (ftsRows && ftsRows.length > 0) {
      const filtered = ftsRows.filter((row: { source_id: string }) =>
        metaById.has(row.source_id),
      );
      if (filtered.length > 0) {
        return filtered.map(
          (row: {
            chunk_id: string;
            source_id: string;
            source_title: string;
            chunk_index: number;
            content: string;
            rank: number;
          }) => {
            const meta = metaById.get(row.source_id);
            return {
              chunkId: row.chunk_id,
              sourceId: row.source_id,
              sourceTitle: row.source_title,
              sourceType: meta?.source_type,
              sourceUrl: meta?.url,
              chunkIndex: row.chunk_index,
              content: row.content,
              rank: row.rank,
            } satisfies RetrievedChunk;
          },
        );
      }
    }
  }

  const { data: chunkRows, error: chunkError } = await db
    .from("knowledge_chunks")
    .select("id, source_id, chunk_index, content")
    .eq("tenant_id", tenantId)
    .in("source_id", sourceIds)
    .order("chunk_index", { ascending: true })
    .limit(limit);

  if (chunkError) {
    throw new Error(`Failed to load chunks: ${chunkError.message}`);
  }

  if (chunkRows && chunkRows.length > 0) {
    return chunkRows.map((row) => {
      const meta = metaById.get(row.source_id);
      return {
        chunkId: row.id,
        sourceId: row.source_id,
        sourceTitle: meta?.title ?? "Source",
        sourceType: meta?.source_type,
        sourceUrl: meta?.url,
        chunkIndex: row.chunk_index,
        content: row.content,
        rank: null,
      };
    });
  }

  return selected.slice(0, Math.min(limit, 3)).map((s) => ({
    chunkId: s.id,
    sourceId: s.id,
    sourceTitle: s.title,
    sourceType: s.source_type,
    sourceUrl: s.url,
    chunkIndex: 0,
    content: (s.body || "").slice(0, 2000),
    rank: null,
  }));
}

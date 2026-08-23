import { Suspense } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageFill } from "@/components/workspace-page";
import { LibraryPanel } from "@/components/library-panel";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { backfillMissingSourceMetadata } from "@/lib/knowledge/source-metadata";
import {
  creatorDisplayName,
  type CustomLibraryCatalog,
  type LibraryMissionRef,
  type LibrarySourceRow,
  type SourceTag,
} from "@/lib/workspace/library";
import { createServiceClient } from "@/lib/db/supabase";

export default async function LibraryPage() {
  const ctx = await requireWorkspaceContext();
  await backfillMissingSourceMetadata(ctx.tenantId).catch(() => undefined);
  const supabase = await createClient();

  const [
    { data: sourceRows },
    { data: tagRows },
    { data: tagLinkRows },
    { data: missionLinkRows },
    { data: catalogRows },
    { data: catalogLinkRows },
  ] = await Promise.all([
    supabase
      .from("knowledge_sources")
      .select(
        "id, title, source_type, url, original_filename, sensitivity, evidence_status, summary, metadata, updated_at, created_at, created_by",
      )
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("title", { ascending: true }),
    supabase
      .from("source_tags")
      .select("id, name, slug")
      .eq("tenant_id", ctx.tenantId)
      .order("name", { ascending: true }),
    supabase
      .from("knowledge_source_tags")
      .select("source_id, tag_id, source_tags(id, name, slug)")
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("mission_sources")
      .select("source_id, missions!inner(id, title, deleted_at)")
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("library_catalogs")
      .select("id, name, slug, sort_order")
      .eq("tenant_id", ctx.tenantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("knowledge_source_catalogs")
      .select("source_id, catalog_slug")
      .eq("tenant_id", ctx.tenantId),
  ]);

  const tagsBySource = new Map<string, SourceTag[]>();
  for (const row of tagLinkRows ?? []) {
    const raw = row.source_tags as SourceTag | SourceTag[] | null;
    const tagList = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const tag of tagList) {
      const current = tagsBySource.get(row.source_id) ?? [];
      current.push(tag);
      tagsBySource.set(row.source_id, current);
    }
  }

  const missionsBySource = new Map<string, LibraryMissionRef[]>();
  for (const row of missionLinkRows ?? []) {
    const mission = row.missions as
      | { id: string; title: string; deleted_at: string | null }
      | { id: string; title: string; deleted_at: string | null }[]
      | null;
    const missionList = Array.isArray(mission) ? mission : mission ? [mission] : [];
    for (const item of missionList) {
      if (item.deleted_at) continue;
      const current = missionsBySource.get(row.source_id) ?? [];
      if (!current.some((m) => m.id === item.id)) {
        current.push({ id: item.id, title: item.title });
      }
      missionsBySource.set(row.source_id, current);
    }
  }

  const catalogsBySource = new Map<string, string[]>();
  for (const row of catalogLinkRows ?? []) {
    const current = catalogsBySource.get(row.source_id) ?? [];
    current.push(row.catalog_slug);
    catalogsBySource.set(row.source_id, current);
  }

  const creatorIds = [
    ...new Set(
      (sourceRows ?? [])
        .map((row) => row.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const creatorNames = new Map<string, string>();
  if (creatorIds.length > 0) {
    const service = createServiceClient();
    await Promise.all(
      creatorIds.map(async (userId) => {
        const { data } = await service.auth.admin.getUserById(userId);
        if (!data.user) return;
        creatorNames.set(
          userId,
          creatorDisplayName(
            data.user.email,
            data.user.user_metadata as Record<string, unknown> | undefined,
          ),
        );
      }),
    );
  }

  const sources: LibrarySourceRow[] = (sourceRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    source_type: row.source_type,
    url: row.url,
    original_filename: row.original_filename,
    sensitivity: row.sensitivity,
    evidence_status: row.evidence_status,
    catalogs: catalogsBySource.get(row.id) ?? [],
    summary: row.summary,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    updated_at: row.updated_at,
    created_at: row.created_at,
    tags: tagsBySource.get(row.id) ?? [],
    missions: missionsBySource.get(row.id) ?? [],
    creator_name: row.created_by
      ? (creatorNames.get(row.created_by) ?? null)
      : null,
  }));

  const allTags: SourceTag[] = (tagRows ?? []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  }));

  const customCatalogs: CustomLibraryCatalog[] = (catalogRows ?? []).map(
    (catalog) => ({
      id: catalog.id,
      name: catalog.name,
      slug: catalog.slug,
      sort_order: catalog.sort_order,
    }),
  );

  return (
    <WorkspaceShell
      tenantName={ctx.tenantName}
      email={ctx.user.email}
      role={ctx.role}
      avatarUrl={
        typeof ctx.user.user_metadata?.avatar_url === "string"
          ? ctx.user.user_metadata.avatar_url
          : null
      }
    >
      <WorkspacePageFill>
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Loading library…
            </div>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LibraryPanel
              sources={sources}
              allTags={allTags}
              customCatalogs={customCatalogs}
            />
          </div>
        </Suspense>
      </WorkspacePageFill>
    </WorkspaceShell>
  );
}

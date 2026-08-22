import "server-only";

import { createServiceClient } from "@/lib/db/supabase";
import {
  buildSourceMetadata,
  buildSourceSummary,
} from "@/lib/workspace/library";

type SourceBackfillRow = {
  id: string;
  body: string | null;
  source_type: string;
  url: string | null;
  original_filename: string | null;
  mime_type: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
};

function metadataExtras(row: SourceBackfillRow): Record<string, unknown> {
  if (row.source_type === "url") {
    return {
      source_kind: "url",
      original_url: row.url,
      final_url: row.url,
    };
  }
  if (row.source_type === "upload") {
    return {
      source_kind: "upload",
      original_filename: row.original_filename,
      mime_type: row.mime_type,
    };
  }
  return { source_kind: "note" };
}

function needsMetadataBackfill(row: SourceBackfillRow): boolean {
  const body = (row.body ?? "").trim();
  if (!body) return false;
  if (!row.summary?.trim()) return true;
  const metadata = row.metadata;
  if (!metadata || Array.isArray(metadata)) return true;
  return Object.keys(metadata).length === 0;
}

export async function backfillMissingSourceMetadata(tenantId: string) {
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("knowledge_sources")
    .select(
      "id, body, source_type, url, original_filename, mime_type, summary, metadata",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const pending = (rows ?? []).filter((row) =>
    needsMetadataBackfill(row as SourceBackfillRow),
  ) as SourceBackfillRow[];

  if (pending.length === 0) return 0;

  await Promise.all(
    pending.map(async (row) => {
      const body = (row.body ?? "").trim();
      if (!body) return;
      const { error: updateError } = await supabase
        .from("knowledge_sources")
        .update({
          summary: buildSourceSummary(body),
          metadata: buildSourceMetadata(body, metadataExtras(row)),
        })
        .eq("id", row.id)
        .eq("tenant_id", tenantId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }),
  );

  return pending.length;
}

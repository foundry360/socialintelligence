import type { RetrievedChunk } from "@/lib/knowledge/context";

export type EvidenceSource = {
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceType?: string;
  /** Combined text from retrieved chunks for this source. */
  content: string;
};

/**
 * Collapse chunk-level retrieval into one citeable unit per source/page.
 * Citation numbers ([1], [2], …) map to these units, not individual chunks.
 */
export function groupEvidenceBySource(
  chunks: RetrievedChunk[],
): EvidenceSource[] {
  const order: string[] = [];
  const byId = new Map<string, EvidenceSource & { parts: string[] }>();

  for (const chunk of chunks) {
    const existing = byId.get(chunk.sourceId);
    if (existing) {
      existing.parts.push(chunk.content);
      if (!existing.sourceUrl && chunk.sourceUrl) {
        existing.sourceUrl = chunk.sourceUrl;
      }
      continue;
    }
    order.push(chunk.sourceId);
    byId.set(chunk.sourceId, {
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      sourceUrl: chunk.sourceUrl ?? null,
      sourceType: chunk.sourceType,
      content: "",
      parts: [chunk.content],
    });
  }

  return order.map((id) => {
    const row = byId.get(id)!;
    return {
      sourceId: row.sourceId,
      sourceTitle: row.sourceTitle,
      sourceUrl: row.sourceUrl,
      sourceType: row.sourceType,
      content: row.parts.join("\n\n"),
    };
  });
}

export function formatEvidenceBlock(sources: EvidenceSource[]): string {
  return sources
    .map((s, i) => {
      const kind = s.sourceType === "url" ? "website" : s.sourceType || "source";
      const urlPart = s.sourceUrl ? ` url="${s.sourceUrl}"` : "";
      return `[#${i + 1} kind=${kind} title="${s.sourceTitle}"${urlPart}]\n${s.content}`;
    })
    .join("\n\n");
}

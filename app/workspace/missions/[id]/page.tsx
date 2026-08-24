import { notFound } from "next/navigation";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import {
  KnowledgeChat,
  type ChatSourceOption,
  type ThreadMessage,
} from "@/app/workspace/chat/chat-client";

export default async function MissionChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("id, title, description")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!mission) notFound();

  const [{ data: messageRows }, { data: linkRows }] = await Promise.all([
    supabase
      .from("mission_messages")
      .select("id, role, content, citations, created_at")
      .eq("mission_id", id)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("mission_sources")
      .select("source_id")
      .eq("mission_id", id)
      .eq("tenant_id", ctx.tenantId),
  ]);

  const linkedSourceIds = (linkRows ?? []).map((row) => row.source_id);
  let sourceRows: {
    id: string;
    title: string;
    source_type: string;
    url: string | null;
    original_filename: string | null;
  }[] = [];

  if (linkedSourceIds.length > 0) {
    const { data } = await supabase
      .from("knowledge_sources")
      .select("id, title, source_type, url, original_filename")
      .eq("tenant_id", ctx.tenantId)
      .eq("evidence_status", "accepted")
      .neq("sensitivity", "confidential")
      .is("deleted_at", null)
      .in("id", linkedSourceIds)
      .order("updated_at", { ascending: false });
    sourceRows = data ?? [];
  }

  const sources: ChatSourceOption[] = sourceRows.map((r) => ({
    id: r.id,
    title: r.title,
    sourceType: r.source_type,
    url: r.url,
    originalFilename: r.original_filename,
  }));

  const initialMessages: ThreadMessage[] = (messageRows ?? []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    citations: Array.isArray(m.citations) ? m.citations : [],
    evidence: Array.isArray(m.citations) ? m.citations : [],
  }));

  return (
    <KnowledgeChat
      sources={sources}
      missionId={mission.id}
      missionTitle={mission.title}
      missionDescription={mission.description}
      initialMessages={initialMessages}
    />
  );
}

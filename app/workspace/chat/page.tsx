import { WorkspaceShell } from "@/components/workspace-shell";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { KnowledgeChat, type ChatSourceOption } from "./chat-client";

export default async function ChatPage() {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("knowledge_sources")
    .select("id, title, source_type, url, original_filename")
    .eq("tenant_id", ctx.tenantId)
    .eq("evidence_status", "accepted")
    .neq("sensitivity", "confidential")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const sources: ChatSourceOption[] = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    sourceType: r.source_type,
    url: r.url,
    originalFilename: r.original_filename,
  }));

  return (
    <WorkspaceShell
      tenantName={ctx.tenantName}
      email={ctx.user.email}
      avatarUrl={
        typeof ctx.user.user_metadata?.avatar_url === "string"
          ? ctx.user.user_metadata.avatar_url
          : null
      }
    >
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <KnowledgeChat sources={sources} />
      </div>
    </WorkspaceShell>
  );
}

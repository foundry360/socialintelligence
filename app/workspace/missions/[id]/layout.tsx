import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { MissionProjectNav } from "@/components/mission-project-nav";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";

export default async function MissionProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("id, title")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!mission) notFound();

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
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <MissionProjectNav missionId={mission.id} missionTitle={mission.title} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </WorkspaceShell>
  );
}

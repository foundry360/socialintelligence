import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageWide } from "@/components/workspace-page";
import { MissionsDashboard } from "@/components/missions-dashboard";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/db/supabase";
import type { MissionRow } from "@/lib/workspace/missions";

export default async function WorkspaceMissionsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="mt-4 text-muted">Configure Supabase env vars first.</p>
      </main>
    );
  }

  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: missionRows } = await supabase
    .from("missions")
    .select("id, title, description, created_at, updated_at, sort_order, created_by")
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const missionIds = (missionRows ?? []).map((m) => m.id);
  const sourceStats = new Map<string, number>();

  if (missionIds.length > 0) {
    const { data: links } = await supabase
      .from("mission_sources")
      .select("mission_id")
      .eq("tenant_id", ctx.tenantId)
      .in("mission_id", missionIds);

    for (const row of links ?? []) {
      sourceStats.set(
        row.mission_id,
        (sourceStats.get(row.mission_id) ?? 0) + 1,
      );
    }
  }

  const missions: MissionRow[] = (missionRows ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description ?? "",
    created_at: m.created_at,
    updated_at: m.updated_at,
    source_count: sourceStats.get(m.id) ?? 0,
    sort_order: m.sort_order ?? 0,
    created_by: m.created_by ?? null,
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
      <WorkspacePageWide>
        <MissionsDashboard
          missions={missions}
          currentUserId={ctx.user.id}
        />
      </WorkspacePageWide>
    </WorkspaceShell>
  );
}

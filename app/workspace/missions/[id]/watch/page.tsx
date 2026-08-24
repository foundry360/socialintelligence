import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SignalsPanel } from "@/components/signals-panel";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { listWatchProfiles } from "@/app/workspace/missions/signals/actions";

export default async function MissionSignalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!mission) notFound();

  const profiles = await listWatchProfiles(id);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
          Loading signals…
        </div>
      }
    >
      <SignalsPanel missionId={id} initialProfiles={profiles} />
    </Suspense>
  );
}

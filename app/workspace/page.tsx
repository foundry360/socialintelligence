import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageWide } from "@/components/workspace-page";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/db/supabase";

export default async function WorkspaceOverviewPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Workspace</h1>
        <p className="mt-4 text-muted">Configure Supabase env vars first.</p>
      </main>
    );
  }

  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const [{ data: profile }, { count: povCount }, { count: sourceCount }, { count: acceptedCount }] =
    await Promise.all([
      supabase
        .from("company_profiles")
        .select("display_name, summary")
        .eq("tenant_id", ctx.tenantId)
        .maybeSingle(),
      supabase
        .from("points_of_view")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenantId),
      supabase
        .from("knowledge_sources")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenantId)
        .is("deleted_at", null),
      supabase
        .from("knowledge_sources")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenantId)
        .eq("evidence_status", "accepted")
        .is("deleted_at", null),
    ]);

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
        <h1 className="text-2xl font-semibold tracking-tight">
          {ctx.workspaceName ?? "Knowledge Workspace"}
        </h1>
        <p className="mt-2 max-w-3xl text-muted">
          Curate company-true knowledge, then ask grounded questions with
          citations. Authority Baseline comes after this foundation is solid.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-muted">Company</p>
            <p className="mt-1 font-medium">
              {profile?.display_name ?? "Not set"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-muted">POVs</p>
            <p className="mt-1 font-medium">{povCount ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-muted">Evidence sources</p>
            <p className="mt-1 font-medium">
              {acceptedCount ?? 0} accepted / {sourceCount ?? 0} total
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link
            href="/workspace/knowledge"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Edit knowledge
          </Link>
          <Link
            href="/workspace/sources"
            className="rounded-md border border-border bg-surface px-4 py-2"
          >
            Add sources
          </Link>
          <Link
            href="/workspace/chat"
            className="rounded-md border border-border bg-surface px-4 py-2"
          >
            Ask the knowledge base
          </Link>
        </div>
      </WorkspacePageWide>
    </WorkspaceShell>
  );
}

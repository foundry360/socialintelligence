import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageWide } from "@/components/workspace-page";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";

export default async function SourceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("knowledge_sources")
    .select(
      "id, title, source_type, url, body, original_filename, sensitivity, evidence_status, updated_at",
    )
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!source) notFound();

  const avatarUrl =
    typeof ctx.user.user_metadata?.avatar_url === "string"
      ? ctx.user.user_metadata.avatar_url
      : null;

  return (
    <WorkspaceShell
      tenantName={ctx.tenantName}
      email={ctx.user.email}
      avatarUrl={avatarUrl}
    >
      <WorkspacePageWide>
        <div className="mb-6">
          <Link
            href="/workspace/chat"
            className="text-sm text-muted underline underline-offset-2 hover:text-foreground"
          >
            Back to Chat
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{source.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {source.source_type}
          {source.original_filename ? ` · ${source.original_filename}` : ""}
          {` · ${source.evidence_status} · ${source.sensitivity}`}
        </p>
        {source.url ? (
          <p className="mt-3">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-link underline underline-offset-2"
            >
              {source.url}
            </a>
          </p>
        ) : null}
        <article className="mt-8 whitespace-pre-wrap rounded-xl border border-border bg-surface p-5 text-sm leading-6 text-foreground">
          {source.body?.trim()
            ? source.body
            : "No extractable text is stored for this source."}
        </article>
      </WorkspacePageWide>
    </WorkspaceShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageWide } from "@/components/workspace-page";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { sourceTypeDisplay } from "@/lib/workspace/library";

export default async function LibrarySourceContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;

  if (from !== "content") {
    redirect(`/workspace/library?source=${id}`);
  }

  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("knowledge_sources")
    .select("id, title, source_type, body")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!source) redirect("/workspace/library");

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
      <WorkspacePageWide>
        <Link
          href={`/workspace/library?source=${source.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to library
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {source.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {sourceTypeDisplay(source.source_type)} · Full content
        </p>
        <article className="mt-8 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-6 text-sm leading-6 text-foreground">
          {source.body?.trim()
            ? source.body
            : "No extractable text is stored for this source."}
        </article>
      </WorkspacePageWide>
    </WorkspaceShell>
  );
}

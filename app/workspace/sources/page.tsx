import { WorkspaceShell } from "@/components/workspace-shell";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import {
  addKnowledgeNote,
  addKnowledgeUpload,
  addKnowledgeUrl,
  refreshKnowledgeUrl,
  setSourceEvidenceStatus,
} from "@/app/workspace/actions";

export default async function SourcesPage() {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const { data: sources, error } = await supabase
    .from("knowledge_sources")
    .select(
      "id, title, source_type, sensitivity, evidence_status, body, url, original_filename, updated_at",
    )
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const inputClass =
    "mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted";

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
      <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Import URLs, upload PDF/TXT/Markdown, or add notes. Accept sources to
        make them available in Chat. Confidential sources stay out of the model.
      </p>

      {error ? (
        <p className="mt-4 rounded border border-warning-border bg-warning-bg p-3 text-sm text-warning-text">
          Sources table not available yet. Apply{" "}
          <code>supabase/migrations/20260821000004_knowledge_workspace.sql</code>{" "}
          in the Supabase SQL editor, then refresh. ({error.message})
        </p>
      ) : null}

      <section className="mt-8 rounded border border-border bg-surface p-5">
        <h2 className="font-medium">Add URL</h2>
        <p className="mt-1 text-sm text-muted">
          Best for company websites and public pages. We extract readable text
          (JS-only apps may return little content).
        </p>
        <form action={addKnowledgeUrl} className="mt-4 grid gap-3">
          <label className="text-sm font-medium">
            URL
            <input
              name="url"
              type="url"
              placeholder="https://www.konakaicorp.com"
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm font-medium">
            Title (optional)
            <input name="title" className={inputClass} />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Sensitivity
              <select
                name="sensitivity"
                className={inputClass}
                defaultValue="public"
              >
                <option value="public">public</option>
                <option value="internal">internal</option>
                <option value="confidential">confidential</option>
              </select>
            </label>
            <label className="text-sm">
              Evidence status
              <select
                name="evidence_status"
                className={inputClass}
                defaultValue="accepted"
              >
                <option value="pending">pending</option>
                <option value="accepted">accepted</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="w-fit rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Import URL
          </button>
        </form>
      </section>

      <section className="mt-8 rounded border border-border bg-surface p-5">
        <h2 className="font-medium">Upload document</h2>
        <p className="mt-1 text-sm text-muted">
          PDF, TXT, or Markdown up to 10MB. Text is extracted server-side and
          chunked for chat when accepted. Scanned/image-only PDFs may not work.
        </p>
        <form action={addKnowledgeUpload} className="mt-4 grid gap-3">
          <label className="text-sm font-medium">
            File
            <input
              name="file"
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm font-medium">
            Title (optional)
            <input name="title" className={inputClass} />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Sensitivity
              <select
                name="sensitivity"
                className={inputClass}
                defaultValue="internal"
              >
                <option value="public">public</option>
                <option value="internal">internal</option>
                <option value="confidential">confidential</option>
              </select>
            </label>
            <label className="text-sm">
              Evidence status
              <select
                name="evidence_status"
                className={inputClass}
                defaultValue="accepted"
              >
                <option value="pending">pending</option>
                <option value="accepted">accepted</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="w-fit rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Upload &amp; extract
          </button>
        </form>
      </section>

      <section className="mt-8 rounded border border-border bg-surface p-5">
        <h2 className="font-medium">Add note</h2>
        <form action={addKnowledgeNote} className="mt-4 grid gap-3">
          <label className="text-sm font-medium">
            Title
            <input name="title" className={inputClass} required />
          </label>
          <label className="text-sm font-medium">
            Body
            <textarea name="body" rows={8} className={inputClass} required />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Sensitivity
              <select
                name="sensitivity"
                className={inputClass}
                defaultValue="internal"
              >
                <option value="public">public</option>
                <option value="internal">internal</option>
                <option value="confidential">confidential</option>
              </select>
            </label>
            <label className="text-sm">
              Evidence status
              <select
                name="evidence_status"
                className={inputClass}
                defaultValue="accepted"
              >
                <option value="pending">pending</option>
                <option value="accepted">accepted</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="w-fit rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Save source
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-medium">Library</h2>
        {(sources ?? []).length === 0 ? (
          <p className="text-sm text-muted">No sources yet.</p>
        ) : (
          (sources ?? []).map((s) => (
            <article
              key={s.id}
              className="rounded border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-xs text-muted">
                    {s.source_type} · {s.sensitivity} · {s.evidence_status}
                    {s.url ? (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          open URL
                        </a>
                      </>
                    ) : null}
                    {s.original_filename ? (
                      <> · {s.original_filename}</>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.source_type === "url" ? (
                    <form action={refreshKnowledgeUrl}>
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className="rounded border border-border px-2 py-1 text-xs"
                      >
                        Refresh URL
                      </button>
                    </form>
                  ) : null}
                  <form action={setSourceEvidenceStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      name="evidence_status"
                      value="accepted"
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      Accept
                    </button>
                    <button
                      name="evidence_status"
                      value="rejected"
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      Reject
                    </button>
                    <button
                      name="evidence_status"
                      value="pending"
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      Pending
                    </button>
                  </form>
                </div>
              </div>
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-foreground/80">
                {s.body}
              </p>
            </article>
          ))
        )}
      </section>
    </WorkspaceShell>
  );
}

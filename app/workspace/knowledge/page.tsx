import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageWide } from "@/components/workspace-page";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import {
  addCapability,
  addPersona,
  addTerminology,
  updateCompanyProfile,
  upsertPov,
} from "@/app/workspace/actions";

export default async function KnowledgePage() {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const [
    { data: profile },
    { data: povs },
    { data: capabilities },
    { data: personas },
    { data: terms },
  ] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    supabase
      .from("points_of_view")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("capabilities")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("personas")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("terminology_entries")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("preferred_term"),
  ]);

  const inputClass =
    "mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted";
  const labelClass = "block text-sm font-medium";

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
        Structured knowledge
      </h1>
      <p className="mt-2 text-sm text-muted">
        Company spine, POVs, capabilities, personas, and terminology. This is
        the authority core — not a document dump.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <section className="rounded border border-border bg-surface p-5 xl:col-span-2">
        <h2 className="font-medium">Company profile</h2>
        <form action={updateCompanyProfile} className="mt-4 grid gap-3">
          <label className={labelClass}>
            Legal name
            <input
              name="legal_name"
              className={inputClass}
              defaultValue={profile?.legal_name ?? ""}
              required
            />
          </label>
          <label className={labelClass}>
            Display name
            <input
              name="display_name"
              className={inputClass}
              defaultValue={profile?.display_name ?? ""}
              required
            />
          </label>
          <label className={labelClass}>
            Tagline
            <input
              name="tagline"
              className={inputClass}
              defaultValue={profile?.tagline ?? ""}
            />
          </label>
          <label className={labelClass}>
            Summary
            <textarea
              name="summary"
              rows={3}
              className={inputClass}
              defaultValue={profile?.summary ?? ""}
            />
          </label>
          <label className={labelClass}>
            Positioning
            <textarea
              name="positioning"
              rows={3}
              className={inputClass}
              defaultValue={profile?.positioning ?? ""}
            />
          </label>
          <label className={labelClass}>
            Differentiators (one per line)
            <textarea
              name="differentiators"
              rows={3}
              className={inputClass}
              defaultValue={((profile?.differentiators as string[]) ?? []).join(
                "\n",
              )}
            />
          </label>
          <label className={labelClass}>
            Website URL
            <input
              name="website_url"
              className={inputClass}
              defaultValue={profile?.website_url ?? ""}
            />
          </label>
          <button
            type="submit"
            className="mt-2 w-fit rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Save profile
          </button>
        </form>
      </section>

      <section className="mt-8 rounded border border-border bg-surface p-5">
        <h2 className="font-medium">Points of view</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {(povs ?? []).map((p) => (
            <li key={p.id} className="rounded border border-border p-3">
              <p className="font-medium">
                {p.topic_label}{" "}
                <span className="text-xs font-normal text-muted">
                  ({p.status})
                </span>
              </p>
              <p className="mt-1 text-foreground/80">{p.stance}</p>
            </li>
          ))}
        </ul>
        <form action={upsertPov} className="mt-4 grid gap-3 border-t border-border pt-4">
          <p className="text-sm font-medium">Add POV</p>
          <input
            name="topic_label"
            placeholder="Topic"
            className={inputClass}
            required
          />
          <textarea
            name="stance"
            placeholder="Stance (one clear sentence)"
            rows={2}
            className={inputClass}
            required
          />
          <textarea
            name="principles"
            placeholder="Principles (one per line)"
            rows={3}
            className={inputClass}
          />
          <textarea
            name="disagrees_with"
            placeholder="Disagrees with (one per line)"
            rows={2}
            className={inputClass}
          />
          <select name="status" className={inputClass} defaultValue="draft">
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="deprecated">deprecated</option>
          </select>
          <button
            type="submit"
            className="mt-2 w-fit rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Save POV
          </button>
        </form>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded border border-border bg-surface p-5">
          <h2 className="font-medium">Capabilities</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(capabilities ?? []).map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span>
                {c.description ? (
                  <span className="text-muted"> — {c.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <form action={addCapability} className="mt-4 grid gap-2">
            <input
              name="name"
              placeholder="Capability name"
              className={inputClass}
              required
            />
            <textarea
              name="description"
              placeholder="Description"
              rows={2}
              className={inputClass}
            />
            <button type="submit" className="mt-2 w-fit rounded bg-primary px-4 py-2 text-sm text-primary-foreground">
              Save capability
            </button>
          </form>
        </div>

        <div className="rounded border border-border bg-surface p-5">
          <h2 className="font-medium">Personas</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(personas ?? []).map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.name}</span>
              </li>
            ))}
            {(personas ?? []).length === 0 ? (
              <li className="text-muted">None yet.</li>
            ) : null}
          </ul>
          <form action={addPersona} className="mt-4 grid gap-2">
            <input
              name="name"
              placeholder="Persona name"
              className={inputClass}
              required
            />
            <input
              name="title_patterns"
              placeholder="Title patterns (comma-separated)"
              className={inputClass}
            />
            <textarea
              name="goals"
              placeholder="Goals (one per line)"
              rows={2}
              className={inputClass}
            />
            <textarea
              name="pains"
              placeholder="Pains (one per line)"
              rows={2}
              className={inputClass}
            />
            <button type="submit" className="mt-2 w-fit rounded bg-primary px-4 py-2 text-sm text-primary-foreground">
              Save persona
            </button>
          </form>
        </div>
      </section>

      <section className="mt-8 rounded border border-border bg-surface p-5">
        <h2 className="font-medium">Terminology</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(terms ?? []).map((t) => (
            <li key={t.id}>
              Prefer <strong>{t.preferred_term}</strong>
              {(t.avoid_terms as string[])?.length
                ? ` — avoid: ${(t.avoid_terms as string[]).join(", ")}`
                : ""}
            </li>
          ))}
        </ul>
        <form action={addTerminology} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            name="preferred_term"
            placeholder="Preferred term"
            className={inputClass}
            required
          />
          <input
            name="avoid_terms"
            placeholder="Avoid (comma-separated)"
            className={inputClass}
          />
          <input
            name="definition"
            placeholder="Definition"
            className={`${inputClass} sm:col-span-2`}
          />
          <button type="submit" className="mt-2 w-fit rounded bg-primary px-4 py-2 text-sm text-primary-foreground">
            Save term
          </button>
        </form>
      </section>
      </div>
      </WorkspacePageWide>
    </WorkspaceShell>
  );
}

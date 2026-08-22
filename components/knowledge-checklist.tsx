"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  addCapability,
  addPersona,
  addTerminology,
  removeCapability,
  removePersona,
  removePov,
  removeTerminology,
  updateCompanyProfile,
  upsertPov,
} from "@/app/workspace/actions";

export type KnowledgeProfile = {
  legal_name: string | null;
  display_name: string | null;
  tagline: string | null;
  summary: string | null;
  positioning: string | null;
  differentiators: string[] | null;
  website_url: string | null;
  website_urls: string[] | null;
};

export type KnowledgePov = {
  id: string;
  topic_label: string;
  stance: string;
  status: string;
  principles: string[] | null;
  disagrees_with: string[] | null;
};

export type KnowledgeCapability = {
  id: string;
  name: string;
  description: string | null;
};

export type KnowledgePersona = {
  id: string;
  name: string;
  title_patterns: string[] | null;
  goals: string[] | null;
  pains: string[] | null;
};

export type KnowledgeTerm = {
  id: string;
  preferred_term: string;
  avoid_terms: string[] | null;
  definition: string | null;
};

type StepId = "profile" | "povs" | "capabilities" | "personas" | "terminology";

type StepDef = {
  id: StepId;
  label: string;
  title: string;
  description: string;
};

const STEPS: StepDef[] = [
  {
    id: "profile",
    label: "Company Profile",
    title: "Define the Company Profile",
    description:
      "Legal identity, positioning, and differentiators - the spine every answer and baseline builds from.",
  },
  {
    id: "povs",
    label: "Points of View",
    title: "Capture Points of View",
    description:
      "Stances the company will defend. Clear POVs are what keep content from sounding generic.",
  },
  {
    id: "capabilities",
    label: "Capabilities",
    title: "List Capabilities",
    description:
      "Services and strengths the company can credibly claim - used to ground authority and opportunities.",
  },
  {
    id: "personas",
    label: "Personas",
    title: "Describe Buyer Personas",
    description:
      "Who you speak to: titles, goals, and pains that shape messaging and content fit.",
  },
  {
    id: "terminology",
    label: "Terminology",
    title: "Lock Preferred Terminology",
    description:
      "Words to use and avoid so voice stays consistent across chat, baseline, and drafts.",
  },
];

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted";
const labelClass = "block text-sm font-medium";
const twoColGrid =
  "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]";
const cardClass = "rounded-lg border border-border bg-surface p-5";
const saveBtnClass =
  "mt-2 w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground";
const saveBtnFullClass =
  "mt-2 w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground";

function AccordionEditActions({
  removeAction,
}: {
  removeAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="mt-2 flex items-center justify-end gap-4">
      <button
        type="submit"
        formAction={removeAction}
        className="text-sm text-muted underline-offset-2 hover:text-danger hover:underline"
        onClick={(event) => {
          if (!window.confirm("Remove this item?")) {
            event.preventDefault();
          }
        }}
      >
        Remove
      </button>
      <button type="submit" className={saveBtnClass.replace("mt-2 ", "")}>
        Update
      </button>
    </div>
  );
}

function StepNavButtons({
  onBack,
  onContinue,
  canBack,
  canContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
  canBack: boolean;
  canContinue: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onBack}
        disabled={!canBack}
        className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}

type StepNavProps = {
  onBack: () => void;
  onContinue: () => void;
  canBack: boolean;
  canContinue: boolean;
};

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }
  return [];
}

function AutoGrowTextarea({
  className,
  onInput,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }

  useLayoutEffect(() => {
    resize();
  }, [props.defaultValue, props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      className={[className, "resize-none overflow-hidden"]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

function statusDotClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500";
    case "deprecated":
      return "bg-red-500";
    case "draft":
    default:
      return "bg-amber-400";
  }
}

function SavedAccordion({
  title,
  subtitle,
  children,
  open,
  onToggle,
  status,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  open: boolean;
  onToggle: () => void;
  status?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-hover"
        aria-expanded={open}
      >
        {status ? (
          <span
            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${statusDotClass(status)}`}
            title={status}
            aria-label={status}
          />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block truncate text-xs text-muted">
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={
            open
              ? "h-4 w-4 shrink-0 text-muted transition-transform rotate-180"
              : "h-4 w-4 shrink-0 text-muted transition-transform"
          }
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-3 dark:bg-zinc-800 dark:[&_input]:bg-zinc-800 dark:[&_textarea]:bg-zinc-800 dark:[&_select]:bg-zinc-800">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function StepStatusIcon({
  complete,
  active,
}: {
  complete: boolean;
  active: boolean;
}) {
  if (complete) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={
        active
          ? "h-5 w-5 shrink-0 rounded-full border-2 border-foreground/50"
          : "h-5 w-5 shrink-0 rounded-full border border-border"
      }
      aria-hidden
    />
  );
}

export function KnowledgeChecklist({
  profile,
  povs,
  capabilities,
  personas,
  terms,
}: {
  profile: KnowledgeProfile | null;
  povs: KnowledgePov[];
  capabilities: KnowledgeCapability[];
  personas: KnowledgePersona[];
  terms: KnowledgeTerm[];
}) {
  const completion: Record<StepId, boolean> = {
    profile: Boolean(
      profile?.display_name?.trim() &&
        profile?.legal_name?.trim() &&
        (profile?.summary?.trim() || profile?.positioning?.trim()),
    ),
    povs: povs.length > 0,
    capabilities: capabilities.length > 0,
    personas: personas.length > 0,
    terminology: terms.length > 0,
  };

  const summaries: Record<StepId, string | null> = {
    profile:
      profile?.display_name?.trim() || profile?.legal_name?.trim() || null,
    povs:
      povs.length === 0
        ? null
        : povs.length === 1
          ? povs[0].topic_label
          : `${povs.length} points of view`,
    capabilities:
      capabilities.length === 0
        ? null
        : capabilities.length === 1
          ? capabilities[0].name
          : `${capabilities.length} capabilities`,
    personas:
      personas.length === 0
        ? null
        : personas.length === 1
          ? personas[0].name
          : `${personas.length} personas`,
    terminology:
      terms.length === 0
        ? null
        : terms.length === 1
          ? terms[0].preferred_term
          : `${terms.length} terms`,
  };

  const firstIncomplete =
    STEPS.find((s) => !completion[s.id])?.id ?? STEPS[0].id;
  const [activeId, setActiveId] = useState<StepId>(firstIncomplete);
  const activeIndex = STEPS.findIndex((s) => s.id === activeId);
  const active = STEPS[activeIndex];

  function goBack() {
    if (activeIndex > 0) setActiveId(STEPS[activeIndex - 1].id);
  }

  function goContinue() {
    if (activeIndex < STEPS.length - 1) {
      setActiveId(STEPS[activeIndex + 1].id);
    }
  }

  const nav: StepNavProps = {
    onBack: goBack,
    onContinue: goContinue,
    canBack: activeIndex > 0,
    canContinue: activeIndex < STEPS.length - 1,
  };

  let panel: ReactNode;
  switch (active.id) {
    case "profile":
      panel = <ProfilePanel profile={profile} nav={nav} />;
      break;
    case "povs":
      panel = <PovsPanel povs={povs} nav={nav} />;
      break;
    case "capabilities":
      panel = <CapabilitiesPanel capabilities={capabilities} nav={nav} />;
      break;
    case "personas":
      panel = <PersonasPanel personas={personas} nav={nav} />;
      break;
    case "terminology":
      panel = <TerminologyPanel terms={terms} nav={nav} />;
      break;
  }

  const doneCount = STEPS.filter((s) => completion[s.id]).length;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-full max-w-sm shrink-0 flex-col border-r border-border bg-white dark:bg-surface sm:max-w-md lg:w-[26rem] lg:max-w-[26rem]">
        <div className="border-b border-border px-5 py-5">
          <h1 className="text-lg font-semibold tracking-tight">
            Structured Knowledge
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Build the authority spine category by category before baseline and
            messaging.
          </p>
          <p className="mt-3 text-xs text-muted">
            {doneCount} of {STEPS.length} complete
          </p>
        </div>
        <nav className="scrollbar-thread flex-1 space-y-2 overflow-y-auto p-3">
          {STEPS.map((step) => {
            const complete = completion[step.id];
            const isActive = step.id === activeId;
            const summary = summaries[step.id];
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveId(step.id)}
                className={
                  isActive
                    ? "flex w-full items-start gap-3 rounded-lg border border-foreground/35 bg-[#F3F8FC] px-3 py-3 text-left dark:bg-subtle"
                    : "flex w-full items-start gap-3 rounded-lg border border-border bg-surface px-3 py-3 text-left hover:bg-hover"
                }
              >
                <StepStatusIcon complete={complete} active={isActive} />
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      complete
                        ? "block text-sm font-medium text-foreground"
                        : isActive
                          ? "block text-sm font-medium text-foreground"
                          : "block text-sm font-medium text-muted"
                    }
                  >
                    {step.label}
                  </span>
                  {summary ? (
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {summary}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="scrollbar-thread min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#F3F8FC] py-8 pl-20 pr-6 dark:bg-background sm:pl-28 sm:pr-10 lg:pl-36">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {active.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {active.description}
        </p>
        <div className="mt-8 max-w-6xl pb-8">{panel}</div>
      </div>
    </div>
  );
}

function WebsiteUrlsField({ initialUrls }: { initialUrls: string[] }) {
  const [urls, setUrls] = useState(initialUrls.length > 0 ? initialUrls : [""]);

  return (
    <div>
      <p className={labelClass}>Website URL</p>
      <div className="mt-1 space-y-2">
        {urls.map((url, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              name="website_urls"
              type="text"
              placeholder="https://"
              className={`${inputClass} mt-0`}
              value={url}
              onChange={(event) => {
                const next = [...urls];
                next[index] = event.target.value;
                setUrls(next);
              }}
            />
            {index === urls.length - 1 ? (
              <button
                type="button"
                onClick={() => setUrls([...urls, ""])}
                aria-label="Add website URL"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-hover"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePanel({
  profile,
  nav,
}: {
  profile: KnowledgeProfile | null;
  nav: StepNavProps;
}) {
  const initialUrls = (() => {
    const fromList = asStringList(profile?.website_urls);
    if (fromList.length > 0) return fromList;
    if (profile?.website_url?.trim()) return [profile.website_url.trim()];
    return [""];
  })();

  return (
    <div className="max-w-4xl">
      <form action={updateCompanyProfile} className={`grid gap-3 ${cardClass}`}>
        <p className="text-sm font-medium">Company Profile</p>
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
          <AutoGrowTextarea
            name="summary"
            rows={3}
            className={inputClass}
            defaultValue={profile?.summary ?? ""}
          />
        </label>
        <label className={labelClass}>
          Positioning
          <AutoGrowTextarea
            name="positioning"
            rows={3}
            className={inputClass}
            defaultValue={profile?.positioning ?? ""}
          />
        </label>
        <label className={labelClass}>
          Differentiators (one per line)
          <AutoGrowTextarea
            name="differentiators"
            rows={3}
            className={inputClass}
            defaultValue={(profile?.differentiators ?? []).join("\n")}
          />
        </label>
        <WebsiteUrlsField initialUrls={initialUrls} />
        <button
          type="submit"
          className="mt-2 w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Save
        </button>
      </form>
      <StepNavButtons {...nav} />
    </div>
  );
}

function PovsPanel({ povs, nav }: { povs: KnowledgePov[]; nav: StepNavProps }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={twoColGrid}>
      <form action={upsertPov} className={`grid h-fit gap-3 ${cardClass}`}>
        <p className="text-sm font-medium">Add Point of View</p>
        <input
          name="topic_label"
          placeholder="Topic"
          className={inputClass}
          required
        />
        <AutoGrowTextarea
          name="stance"
          placeholder="Stance (one clear sentence)"
          rows={2}
          className={inputClass}
          required
        />
        <AutoGrowTextarea
          name="principles"
          placeholder="Principles (one per line)"
          rows={3}
          className={inputClass}
        />
        <AutoGrowTextarea
          name="disagrees_with"
          placeholder="Disagrees with (one per line)"
          rows={2}
          className={inputClass}
        />
        <select name="status" className={inputClass} defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="deprecated">Deprecated</option>
        </select>
        <button type="submit" className={saveBtnFullClass}>
          Save
        </button>
      </form>
      <div>
        <div className={cardClass}>
          <p className="text-sm font-medium">Saved Points of View</p>
          {povs.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {povs.map((p) => (
                <li key={p.id}>
                  <SavedAccordion
                    title={p.topic_label}
                    subtitle={p.stance}
                    status={p.status}
                    open={openId === p.id}
                    onToggle={() =>
                      setOpenId((current) => (current === p.id ? null : p.id))
                    }
                  >
                    <form
                      key={`${p.id}-${p.status}-${p.topic_label}-${p.stance}`}
                      action={upsertPov}
                      className="grid gap-2"
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <label className={labelClass}>
                        Topic
                        <input
                          name="topic_label"
                          className={inputClass}
                          defaultValue={p.topic_label}
                          required
                        />
                      </label>
                      <label className={labelClass}>
                        Stance
                        <AutoGrowTextarea
                          name="stance"
                          rows={2}
                          className={inputClass}
                          defaultValue={p.stance}
                          required
                        />
                      </label>
                      <label className={labelClass}>
                        Principles (one per line)
                        <AutoGrowTextarea
                          name="principles"
                          rows={3}
                          className={inputClass}
                          defaultValue={asStringList(p.principles).join("\n")}
                        />
                      </label>
                      <label className={labelClass}>
                        Disagrees with (one per line)
                        <AutoGrowTextarea
                          name="disagrees_with"
                          rows={2}
                          className={inputClass}
                          defaultValue={asStringList(p.disagrees_with).join(
                            "\n",
                          )}
                        />
                      </label>
                      <label className={labelClass}>
                        Status
                        <select
                          name="status"
                          className={inputClass}
                          defaultValue={p.status}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="deprecated">Deprecated</option>
                        </select>
                      </label>
                      <AccordionEditActions removeAction={removePov} />
                    </form>
                  </SavedAccordion>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No points of view yet.</p>
          )}
        </div>
        <StepNavButtons {...nav} />
      </div>
    </div>
  );
}

function CapabilitiesPanel({
  capabilities,
  nav,
}: {
  capabilities: KnowledgeCapability[];
  nav: StepNavProps;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={twoColGrid}>
      <form action={addCapability} className={`grid h-fit gap-2 ${cardClass}`}>
        <p className="text-sm font-medium">Add Capability</p>
        <input
          name="name"
          placeholder="Capability name"
          className={inputClass}
          required
        />
        <AutoGrowTextarea
          name="description"
          placeholder="Description"
          rows={2}
          className={inputClass}
        />
        <button type="submit" className={saveBtnFullClass}>
          Save
        </button>
      </form>
      <div>
        <div className={cardClass}>
          <p className="text-sm font-medium">Saved Capabilities</p>
          {capabilities.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {capabilities.map((c) => (
                <li key={c.id}>
                  <SavedAccordion
                    title={c.name}
                    subtitle={c.description ?? undefined}
                    open={openId === c.id}
                    onToggle={() =>
                      setOpenId((current) => (current === c.id ? null : c.id))
                    }
                  >
                    <form
                      key={`${c.id}-${c.name}-${c.description ?? ""}`}
                      action={addCapability}
                      className="grid gap-2"
                    >
                      <input type="hidden" name="id" value={c.id} />
                      <label className={labelClass}>
                        Name
                        <input
                          name="name"
                          className={inputClass}
                          defaultValue={c.name}
                          required
                        />
                      </label>
                      <label className={labelClass}>
                        Description
                        <AutoGrowTextarea
                          name="description"
                          rows={3}
                          className={inputClass}
                          defaultValue={c.description ?? ""}
                        />
                      </label>
                      <AccordionEditActions removeAction={removeCapability} />
                    </form>
                  </SavedAccordion>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No capabilities yet.</p>
          )}
        </div>
        <StepNavButtons {...nav} />
      </div>
    </div>
  );
}

function PersonasPanel({
  personas,
  nav,
}: {
  personas: KnowledgePersona[];
  nav: StepNavProps;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={twoColGrid}>
      <form action={addPersona} className={`grid h-fit gap-2 ${cardClass}`}>
        <p className="text-sm font-medium">Add Persona</p>
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
        <AutoGrowTextarea
          name="goals"
          placeholder="Goals (one per line)"
          rows={2}
          className={inputClass}
        />
        <AutoGrowTextarea
          name="pains"
          placeholder="Pains (one per line)"
          rows={2}
          className={inputClass}
        />
        <button type="submit" className={saveBtnFullClass}>
          Save
        </button>
      </form>
      <div>
        <div className={cardClass}>
          <p className="text-sm font-medium">Saved Personas</p>
          {personas.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {personas.map((p) => (
                <li key={p.id}>
                  <SavedAccordion
                    title={p.name}
                    subtitle={
                      asStringList(p.title_patterns).length
                        ? asStringList(p.title_patterns).join(", ")
                        : undefined
                    }
                    open={openId === p.id}
                    onToggle={() =>
                      setOpenId((current) => (current === p.id ? null : p.id))
                    }
                  >
                    <form
                      key={`${p.id}-${p.name}-${asStringList(p.goals).join("|")}`}
                      action={addPersona}
                      className="grid gap-2"
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <label className={labelClass}>
                        Name
                        <input
                          name="name"
                          className={inputClass}
                          defaultValue={p.name}
                          required
                        />
                      </label>
                      <label className={labelClass}>
                        Title patterns (comma-separated)
                        <input
                          name="title_patterns"
                          className={inputClass}
                          defaultValue={asStringList(p.title_patterns).join(
                            ", ",
                          )}
                        />
                      </label>
                      <label className={labelClass}>
                        Goals (one per line)
                        <AutoGrowTextarea
                          name="goals"
                          rows={2}
                          className={inputClass}
                          defaultValue={asStringList(p.goals).join("\n")}
                        />
                      </label>
                      <label className={labelClass}>
                        Pains (one per line)
                        <AutoGrowTextarea
                          name="pains"
                          rows={2}
                          className={inputClass}
                          defaultValue={asStringList(p.pains).join("\n")}
                        />
                      </label>
                      <AccordionEditActions removeAction={removePersona} />
                    </form>
                  </SavedAccordion>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No personas yet.</p>
          )}
        </div>
        <StepNavButtons {...nav} />
      </div>
    </div>
  );
}

function TerminologyPanel({
  terms,
  nav,
}: {
  terms: KnowledgeTerm[];
  nav: StepNavProps;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={twoColGrid}>
      <form action={addTerminology} className={`grid h-fit gap-2 ${cardClass}`}>
        <p className="text-sm font-medium">Add Terminology</p>
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
          className={inputClass}
        />
        <button type="submit" className={saveBtnFullClass}>
          Save
        </button>
      </form>
      <div>
        <div className={cardClass}>
          <p className="text-sm font-medium">Saved Terminology</p>
          {terms.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {terms.map((t) => (
                <li key={t.id}>
                  <SavedAccordion
                    title={t.preferred_term}
                    subtitle={
                      asStringList(t.avoid_terms).length
                        ? `Avoid: ${asStringList(t.avoid_terms).join(", ")}`
                        : (t.definition ?? undefined)
                    }
                    open={openId === t.id}
                    onToggle={() =>
                      setOpenId((current) => (current === t.id ? null : t.id))
                    }
                  >
                    <form
                      key={`${t.id}-${t.preferred_term}-${t.definition ?? ""}`}
                      action={addTerminology}
                      className="grid gap-2"
                    >
                      <input type="hidden" name="id" value={t.id} />
                      <label className={labelClass}>
                        Preferred term
                        <input
                          name="preferred_term"
                          className={inputClass}
                          defaultValue={t.preferred_term}
                          required
                        />
                      </label>
                      <label className={labelClass}>
                        Avoid (comma-separated)
                        <input
                          name="avoid_terms"
                          className={inputClass}
                          defaultValue={asStringList(t.avoid_terms).join(", ")}
                        />
                      </label>
                      <label className={labelClass}>
                        Definition
                        <input
                          name="definition"
                          className={inputClass}
                          defaultValue={t.definition ?? ""}
                        />
                      </label>
                      <AccordionEditActions removeAction={removeTerminology} />
                    </form>
                  </SavedAccordion>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No terminology yet.</p>
          )}
        </div>
        <StepNavButtons {...nav} />
      </div>
    </div>
  );
}

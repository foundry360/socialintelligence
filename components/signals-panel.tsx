"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Bookmark,
  LayoutGrid,
  List,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Radar,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import { ExpandableSearch } from "@/components/expandable-search";
import { WatchProfileModal } from "@/components/watch-profile-modal";
import {
  deleteWatchProfile,
  setWatchProfileEnabled,
} from "@/app/workspace/missions/signals/actions";
import type { WatchProfileListItem } from "@/lib/workspace/watch-profiles";

type InboxViewMode = "card" | "table";
type ProfileFilter = "all" | "saved" | string;

type SignalsPanelProps = {
  missionId: string;
  initialProfiles: WatchProfileListItem[];
};

export function SignalsPanel({
  missionId,
  initialProfiles,
}: SignalsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profiles, setProfiles] = useState(initialProfiles);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"7d" | "all">("7d");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<WatchProfileListItem | null>(null);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  const [pending, startTransition] = useTransition();

  const profileFilter = (searchParams.get("profile") ?? "all") as ProfileFilter;
  const viewMode = (searchParams.get("view") ?? "card") as InboxViewMode;

  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  const enabledProfiles = useMemo(
    () => profiles.filter((profile) => profile.enabled),
    [profiles],
  );

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (profile) =>
        profile.name.toLowerCase().includes(q) ||
        profile.description.toLowerCase().includes(q),
    );
  }, [profiles, query]);

  const selectedProfile =
    profileFilter !== "all" && profileFilter !== "saved"
      ? (profiles.find((profile) => profile.id === profileFilter) ?? null)
      : null;

  const inboxTitle =
    profileFilter === "all"
      ? "All signals"
      : profileFilter === "saved"
        ? "Saved"
        : (selectedProfile?.name ?? "Signals");

  const insightsPanelTitle = selectedProfile ? selectedProfile.name : "This week";

  const gridCols = insightsCollapsed
    ? "xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_3.25rem]"
    : "xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,22rem)]";

  function updateParams(updates: {
    profile?: ProfileFilter | null;
    view?: InboxViewMode | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.profile !== undefined) {
      if (!updates.profile || updates.profile === "all") {
        params.delete("profile");
      } else {
        params.set("profile", updates.profile);
      }
    }
    if (updates.view !== undefined) {
      if (!updates.view || updates.view === "card") {
        params.delete("view");
      } else {
        params.set("view", updates.view);
      }
    }
    const qs = params.toString();
    router.replace(
      qs
        ? `/workspace/missions/${missionId}/watch?${qs}`
        : `/workspace/missions/${missionId}/watch`,
      { scroll: false },
    );
  }

  function onToggleEnabled(profile: WatchProfileListItem) {
    startTransition(async () => {
      await setWatchProfileEnabled(profile.id, !profile.enabled);
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id ? { ...p, enabled: !p.enabled } : p,
        ),
      );
    });
  }

  function onDelete(profile: WatchProfileListItem) {
    if (!window.confirm(`Delete watch profile "${profile.name}"?`)) return;
    startTransition(async () => {
      await deleteWatchProfile(profile.id);
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      if (profileFilter === profile.id) {
        updateParams({ profile: "all" });
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
      <div
        className={`grid min-h-0 flex-1 grid-cols-1 grid-rows-3 gap-4 overflow-hidden xl:grid-rows-1 ${gridCols}`}
      >
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Workspace
              </p>
            </div>
            <div className="mt-3">
              <ExpandableSearch
                value={query}
                onChange={setQuery}
                placeholder="Search signals"
                alwaysExpanded
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <nav className="space-y-0.5" aria-label="Signal filters">
              <WorkspaceNavItem
                active={profileFilter === "all"}
                icon={<Zap className="h-4 w-4" />}
                label="All signals"
                onClick={() => updateParams({ profile: "all" })}
              />
              <WorkspaceNavItem
                active={profileFilter === "saved"}
                icon={<Star className="h-4 w-4" />}
                label="Saved"
                onClick={() => updateParams({ profile: "saved" })}
              />
            </nav>

            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2 px-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Watch profiles
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  aria-label="New watch profile"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted hover:bg-hover hover:text-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
              {filteredProfiles.length === 0 ? (
                <p className="mt-2 px-2 text-xs text-muted">
                  {query.trim()
                    ? "No profiles match your search."
                    : "No watch profiles yet."}
                </p>
              ) : (
                <nav className="mt-1 space-y-0.5" aria-label="Watch profiles">
                  {filteredProfiles.map((profile) => (
                    <WorkspaceNavItem
                      key={profile.id}
                      active={profileFilter === profile.id}
                      icon={<Radar className="h-4 w-4" />}
                      label={profile.name}
                      muted={!profile.enabled}
                      onClick={() => updateParams({ profile: profile.id })}
                    />
                  ))}
                </nav>
              )}
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted">
                Alerts
              </p>
              <button
                type="button"
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted hover:bg-hover hover:text-foreground"
              >
                <Bell className="h-4 w-4 shrink-0" aria-hidden />
                <span>New today</span>
                <span className="ml-auto rounded-full bg-muted/20 px-2 py-0.5 text-xs">
                  0
                </span>
              </button>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-medium">{inboxTitle}</p>
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                active={dateFilter === "7d"}
                onClick={() => setDateFilter("7d")}
              >
                Last 7 days
              </FilterPill>
              <FilterPill
                active={dateFilter === "all"}
                onClick={() => setDateFilter("all")}
              >
                All sources
              </FilterPill>
              <div className="ml-1 flex items-center rounded-full border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => updateParams({ view: "table" })}
                  aria-label="Table view"
                  aria-pressed={viewMode === "table"}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    viewMode === "table"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ view: "card" })}
                  aria-label="Card view"
                  aria-pressed={viewMode === "card"}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    viewMode === "card"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <SignalInboxEmpty
            viewMode={viewMode}
            hasProfiles={profiles.length > 0}
            onCreateProfile={() => setShowCreate(true)}
          />
        </section>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          {insightsCollapsed ? (
            <div className="flex h-12 shrink-0 items-center justify-end border-b border-border px-2">
              <button
                type="button"
                onClick={() => setInsightsCollapsed(false)}
                aria-label="Expand insights panel"
                title="Expand insights panel"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
              >
                <PanelRightOpen className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <>
              <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
                <h2 className="truncate text-base font-medium">{insightsPanelTitle}</h2>
                <button
                  type="button"
                  onClick={() => setInsightsCollapsed(true)}
                  aria-label="Collapse insights panel"
                  title="Collapse insights panel"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
                >
                  <PanelRightClose className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {selectedProfile ? (
                  <WatchProfileInspector
                    profile={selectedProfile}
                    pending={pending}
                    onToggleEnabled={() => onToggleEnabled(selectedProfile)}
                    onEdit={() => setEditing(selectedProfile)}
                    onDelete={() => onDelete(selectedProfile)}
                  />
                ) : (
                  <SignalsInsights
                    enabledProfiles={enabledProfiles}
                    missionId={missionId}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {showCreate ? (
        <WatchProfileModal
          missionId={missionId}
          onClose={() => setShowCreate(false)}
          onSaved={(profile) => {
            setProfiles((prev) => [...prev, profile]);
            setShowCreate(false);
          }}
        />
      ) : null}

      {editing ? (
        <WatchProfileModal
          missionId={missionId}
          profile={editing}
          onClose={() => setEditing(null)}
          onSaved={(profile) => {
            setProfiles((prev) =>
              prev.map((p) => (p.id === profile.id ? profile : p)),
            );
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function WorkspaceNavItem({
  active,
  icon,
  label,
  muted,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-accent/10 font-medium text-foreground"
          : "text-muted hover:bg-hover hover:text-foreground"
      } ${muted && !active ? "opacity-60" : ""}`}
    >
      <span className={active ? "text-accent" : ""}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "border border-border text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SignalInboxEmpty({
  viewMode,
  hasProfiles,
  onCreateProfile,
}: {
  viewMode: InboxViewMode;
  hasProfiles: boolean;
  onCreateProfile: () => void;
}) {
  if (viewMode === "table") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="grid grid-cols-[1fr_6rem_6rem_5rem] gap-3 border-b border-border px-4 py-2 text-xs font-medium text-muted">
          <span>Title</span>
          <span>Priority</span>
          <span>Profile</span>
          <span>When</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <Radar className="h-8 w-8 text-muted" aria-hidden />
          <p className="text-sm font-medium">No signals yet</p>
          <p className="max-w-sm text-sm text-muted">
            {hasProfiles
              ? "Watch profiles are configured. Qualified signals will appear here after automated collection begins."
              : "Create a watch profile to define what this project should monitor."}
          </p>
          {!hasProfiles ? (
            <button
              type="button"
              onClick={onCreateProfile}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Create watch profile
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <Radar className="h-8 w-8 text-muted" aria-hidden />
      <p className="text-sm font-medium">No signals yet</p>
      <p className="max-w-sm text-sm text-muted">
        {hasProfiles
          ? "Watch profiles are configured. Qualified signals will appear here after automated collection begins."
          : "Create a watch profile to define what this project should monitor."}
      </p>
      {!hasProfiles ? (
        <button
          type="button"
          onClick={onCreateProfile}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create watch profile
        </button>
      ) : null}
    </div>
  );
}

function WatchProfileInspector({
  profile,
  pending,
  onToggleEnabled,
  onEdit,
  onDelete,
}: {
  profile: WatchProfileListItem;
  pending: boolean;
  onToggleEnabled: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-end">
        <span
          className={
            profile.enabled
              ? "shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium"
              : "shrink-0 rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted"
          }
        >
          {profile.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {profile.description ? (
        <p className="mt-3 text-sm text-muted">{profile.description}</p>
      ) : null}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Criteria</dt>
          <dd className="font-medium">{profile.criteriaCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Feeds</dt>
          <dd className="font-medium">{profile.feedsCount}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleEnabled}
          disabled={pending}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-hover disabled:opacity-60"
        >
          {profile.enabled ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-hover"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-hover hover:text-danger disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete
        </button>
      </div>
    </div>
  );
}

function SignalsInsights({
  enabledProfiles,
  missionId,
}: {
  enabledProfiles: WatchProfileListItem[];
  missionId: string;
}) {
  return (
    <div className="space-y-6 p-4">
      <div>
        <p className="text-3xl font-semibold tracking-tight">0</p>
        <p className="mt-1 text-sm text-muted">new signals</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Top sources
        </p>
        <p className="mt-3 text-sm text-muted">
          Source breakdown appears after collection begins.
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Watching
        </p>
        {enabledProfiles.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No active watch profiles.{" "}
            <Link
              href={`/workspace/missions/${missionId}/watch`}
              className="text-link underline underline-offset-2"
            >
              Add one
            </Link>{" "}
            to start monitoring.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {enabledProfiles.map((profile) => (
              <span
                key={profile.id}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium"
              >
                {profile.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-background/50 p-4">
        <div className="flex items-start gap-2">
          <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <p className="text-sm text-muted">
            Select a signal from the inbox to view scores, sources, and
            disposition. Discuss qualified signals in{" "}
            <Link
              href={`/workspace/missions/${missionId}`}
              className="text-link underline underline-offset-2"
            >
              Insights
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowUpDown,
  GripVertical,
  LayoutGrid,
  List,
  MessageSquare,
  MoreVertical,
  Plus,
  X,
} from "lucide-react";
import { ExpandableSearch } from "@/components/expandable-search";
import {
  createMission,
  removeMission,
  reorderMissions,
  updateMission,
} from "@/app/workspace/missions/actions";
import {
  formatMissionDate,
  MISSION_DESCRIPTION_MAX_LENGTH,
  reorderMissionIds,
  type MissionRow,
} from "@/lib/workspace/missions";

type ViewMode = "grid" | "list";
type SortMode = "custom" | "recent" | "title";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "custom", label: "Custom order" },
  { value: "recent", label: "Most recent" },
  { value: "title", label: "Title A-Z" },
];

export function MissionsDashboard({ missions }: { missions: MissionRow[] }) {
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("custom");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [renameMission, setRenameMission] = useState<MissionRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  useEffect(() => {
    setCustomOrder(
      [...missions]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((mission) => mission.id),
    );
  }, [missions]);

  const missionById = useMemo(
    () => new Map(missions.map((mission) => [mission.id, mission])),
    [missions],
  );

  const dragEnabled =
    view === "grid" && sort === "custom" && query.trim().length === 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = customOrder
      .map((id) => missionById.get(id))
      .filter((mission): mission is MissionRow => mission != null);

    if (q) {
      rows = rows.filter(
        (mission) =>
          mission.title.toLowerCase().includes(q) ||
          mission.description.toLowerCase().includes(q),
      );
    }

    if (sort === "title") {
      return [...rows].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sort === "recent") {
      return [...rows].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }
    return rows;
  }, [customOrder, missionById, query, sort]);

  function onDelete(id: string) {
    if (!confirm("Delete this project and its chat history?")) return;
    startTransition(async () => {
      await removeMission(id);
      setMenuOpenId(null);
    });
  }

  function onDropMission(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const nextOrder = reorderMissionIds(customOrder, draggingId, targetId);
    setCustomOrder(nextOrder);
    setDraggingId(null);
    setDropTargetId(null);
    startTransition(async () => {
      await reorderMissions(nextOrder);
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex h-9 items-center rounded-full border border-border bg-background p-0.5 text-sm">
          <button
            type="button"
            aria-pressed
            className="rounded-full bg-surface px-3.5 py-1.5 font-medium text-foreground shadow-sm"
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={false}
            className="rounded-full px-3.5 py-1.5 text-muted hover:text-foreground"
          >
            My projects
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExpandableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search projects"
          />

          <div className="flex h-9 items-center rounded-full border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                view === "list"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                view === "grid"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <ProjectSortMenu value={sort} onChange={setSort} />

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground hover:brightness-95"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create new
          </button>
        </div>
      </div>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">My projects</h1>

      {view === "grid" ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-[#FAFAFA] p-8 text-center transition hover:border-accent/50 dark:bg-surface"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-2xl text-muted">
              +
            </span>
            <span className="mt-4 text-sm font-medium text-foreground">
              Create new project
            </span>
          </button>

          {filtered.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              dragEnabled={dragEnabled}
              isDragging={draggingId === mission.id}
              isDropTarget={dropTargetId === mission.id && draggingId !== mission.id}
              onDragStart={() => setDraggingId(mission.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onDragOver={() => {
                if (draggingId && draggingId !== mission.id) {
                  setDropTargetId(mission.id);
                }
              }}
              onDragLeave={() => {
                if (dropTargetId === mission.id) setDropTargetId(null);
              }}
              onDrop={() => onDropMission(mission.id)}
              menuOpen={menuOpenId === mission.id}
              onMenuToggle={() =>
                setMenuOpenId((id) => (id === mission.id ? null : mission.id))
              }
              onMenuClose={() => setMenuOpenId(null)}
              onDelete={() => onDelete(mission.id)}
              onRename={() => {
                setMenuOpenId(null);
                setRenameMission(mission);
              }}
              pending={pending}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Updated
                </th>
                <th className="px-4 py-3 font-medium">Sources</th>
                <th className="px-4 py-3 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    No projects yet. Create one to start a focused chat.
                  </td>
                </tr>
              ) : (
                filtered.map((mission) => (
                    <tr key={mission.id} className="group hover:bg-hover/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/workspace/missions/${mission.id}`}
                          className="block font-medium hover:text-accent"
                        >
                          {mission.title}
                          {mission.description ? (
                            <span className="mt-0.5 block text-xs font-normal text-muted">
                              {mission.description}
                            </span>
                          ) : null}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 text-muted md:table-cell">
                        {formatMissionDate(mission.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {mission.source_count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDelete(mission.id)}
                          disabled={pending}
                          className="text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:text-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate ? (
        <CreateMissionModal onClose={() => setShowCreate(false)} />
      ) : null}
      {renameMission ? (
        <RenameMissionModal
          mission={renameMission}
          onClose={() => setRenameMission(null)}
        />
      ) : null}
    </div>
  );
}

function MissionCard({
  mission,
  dragEnabled,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onRename,
  onDelete,
  pending,
}: {
  mission: MissionRow;
  dragEnabled: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        onMenuClose();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen, onMenuClose]);

  return (
    <div
      onDragOver={(event) => {
        if (!dragEnabled) return;
        event.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        if (!dragEnabled) return;
        event.preventDefault();
        onDrop();
      }}
      className={`relative flex min-h-[260px] flex-col rounded-2xl border border-border bg-[#FAFAFA] p-6 transition dark:bg-surface ${
        isDragging ? "opacity-50" : ""
      } ${isDropTarget ? "border-accent ring-2 ring-accent/30" : ""}`}
    >
      {dragEnabled ? (
        <button
          type="button"
          draggable
          aria-label={`Reorder ${mission.title}`}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", mission.id);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className="absolute left-3 top-3 cursor-grab rounded-md p-1 text-muted hover:bg-black/5 hover:text-foreground active:cursor-grabbing dark:hover:bg-white/10"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      <div ref={menuRef} className="absolute right-3 top-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Project options"
          className="rounded-md p-1 text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 z-10 mt-1 w-32 rounded-md border border-border bg-surface py-1 text-sm shadow-lg">
            <button
              type="button"
              disabled={pending}
              onClick={onRename}
              className="block w-full px-3 py-1.5 text-left hover:bg-hover"
            >
              Rename
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="block w-full px-3 py-1.5 text-left text-danger hover:bg-hover"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Link
          href={`/workspace/missions/${mission.id}`}
          className="hover:opacity-90"
        >
          <h2
            className={`line-clamp-2 pr-8 text-base font-semibold leading-snug text-foreground ${
              dragEnabled ? "pl-6" : ""
            }`}
          >
            {mission.title}
          </h2>
          {mission.description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {mission.description}
            </p>
          ) : null}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="text-xs text-muted">
            {formatMissionDate(mission.updated_at)} · {mission.source_count}{" "}
            {mission.source_count === 1 ? "source" : "sources"}
          </p>
          <Link
            href={`/workspace/missions/${mission.id}`}
            aria-label={`Open chat for ${mission.title}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm transition hover:opacity-90"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProjectSortMenu({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (value: SortMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeLabel =
    SORT_OPTIONS.find((option) => option.value === value)?.label ?? "Sort";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Sort: ${activeLabel}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted hover:text-foreground ${
          value !== "custom" ? "border-accent/40 text-accent" : ""
        }`}
      >
        <ArrowUpDown className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-border bg-surface py-1 text-sm shadow-lg"
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left hover:bg-hover ${
                value === option.value
                  ? "font-medium text-accent"
                  : "text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RenameMissionModal({
  mission,
  onClose,
}: {
  mission: MissionRow;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(mission.description);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Rename project</h2>
            <p className="mt-1 text-sm text-muted">
              Update the title and summary for this project.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted hover:bg-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          action={async (formData) => {
            await updateMission(formData);
            onClose();
          }}
          className="mt-6 space-y-4"
        >
          <input type="hidden" name="missionId" value={mission.id} />
          <div>
            <label htmlFor="rename-mission-title" className="text-sm font-medium">
              Title
            </label>
            <input
              id="rename-mission-title"
              name="title"
              required
              minLength={2}
              defaultValue={mission.title}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="rename-mission-description"
                className="text-sm font-medium"
              >
                Summary <span className="font-normal text-muted">(optional)</span>
              </label>
              <span className="text-xs text-muted">
                {description.length}/{MISSION_DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="rename-mission-description"
              name="description"
              rows={3}
              maxLength={MISSION_DESCRIPTION_MAX_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateMissionModal({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">New project</h2>
            <p className="mt-1 text-sm text-muted">
              Start a focused chat on a topic, market, or initiative.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted hover:bg-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={createMission} className="mt-6 space-y-4">
          <div>
            <label htmlFor="mission-title" className="text-sm font-medium">
              Title
            </label>
            <input
              id="mission-title"
              name="title"
              required
              minLength={2}
              placeholder="e.g. AI in healthcare"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="mission-description" className="text-sm font-medium">
                Summary <span className="font-normal text-muted">(optional)</span>
              </label>
              <span className="text-xs text-muted">
                {description.length}/{MISSION_DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="mission-description"
              name="description"
              rows={3}
              maxLength={MISSION_DESCRIPTION_MAX_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of what this project covers"
              className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

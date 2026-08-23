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
  SortableTableHeader,
  compareDates,
  compareNumbers,
  compareStrings,
  toggleSortColumn,
  type SortDirection,
} from "@/components/sortable-table-header";
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
import type { TeamMember } from "@/lib/tenancy/team-shared";
import { TableSeeMore, useTablePagination } from "@/components/table-see-more";

type ViewMode = "grid" | "list";
type SortMode = "custom" | "recent" | "title";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "custom", label: "Custom order" },
  { value: "recent", label: "Most recent" },
  { value: "title", label: "Title A-Z" },
];

type ProjectScope = "all" | "mine";
type ProjectTableSortColumn = "title" | "updated_at" | "source_count";

export function MissionsDashboard({
  missions,
  currentUserId,
  tenantMembers,
}: {
  missions: MissionRow[];
  currentUserId: string;
  tenantMembers: TeamMember[];
}) {
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("custom");
  const [scope, setScope] = useState<ProjectScope>("all");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [renameMission, setRenameMission] = useState<MissionRow | null>(null);
  const [deleteMission, setDeleteMission] = useState<MissionRow | null>(null);
  const [tableSortColumn, setTableSortColumn] =
    useState<ProjectTableSortColumn>("updated_at");
  const [tableSortDirection, setTableSortDirection] =
    useState<SortDirection>("desc");
  const [pending, startTransition] = useTransition();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const scopedMissions = useMemo(() => {
    if (scope === "mine") {
      return missions.filter((mission) => mission.created_by === currentUserId);
    }
    return missions;
  }, [currentUserId, missions, scope]);

  useEffect(() => {
    setCustomOrder(
      [...scopedMissions]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((mission) => mission.id),
    );
  }, [scopedMissions]);

  const missionById = useMemo(
    () => new Map(scopedMissions.map((mission) => [mission.id, mission])),
    [scopedMissions],
  );

  const dragEnabled =
    view === "grid" &&
    sort === "custom" &&
    scope === "all" &&
    query.trim().length === 0;

  const queriedRows = useMemo(() => {
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

    return rows;
  }, [customOrder, missionById, query]);

  const filtered = useMemo(() => {
    if (view === "list") {
      return [...queriedRows].sort((a, b) => {
        let result = 0;
        switch (tableSortColumn) {
          case "title":
            result = compareStrings(a.title, b.title);
            break;
          case "updated_at":
            result = compareDates(a.updated_at, b.updated_at);
            break;
          case "source_count":
            result = compareNumbers(a.source_count, b.source_count);
            break;
        }
        return tableSortDirection === "asc" ? result : -result;
      });
    }

    if (sort === "title") {
      return [...queriedRows].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sort === "recent") {
      return [...queriedRows].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }
    return queriedRows;
  }, [queriedRows, view, sort, tableSortColumn, tableSortDirection]);

  function onSortTableColumn(column: ProjectTableSortColumn) {
    const next = toggleSortColumn(
      tableSortColumn,
      column,
      tableSortDirection,
    );
    setTableSortColumn(next.column);
    setTableSortDirection(next.direction);
  }

  const listPagination = useTablePagination(
    filtered.length,
    `${view}:${tableSortColumn}:${tableSortDirection}:${scope}:${query}:${filtered.map((mission) => mission.id).join(",")}`,
  );
  const visibleListMissions = filtered.slice(0, listPagination.visibleCount);

  function onConfirmDelete() {
    if (!deleteMission) return;
    const id = deleteMission.id;
    startTransition(async () => {
      await removeMission(id);
      setDeleteMission(null);
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
            aria-pressed={scope === "all"}
            onClick={() => setScope("all")}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${
              scope === "all"
                ? "bg-surface font-medium text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={scope === "mine"}
            onClick={() => setScope("mine")}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${
              scope === "mine"
                ? "bg-surface font-medium text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            My projects
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExpandableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search projects"
            alwaysExpanded
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

          {view === "grid" ? (
            <ProjectSortMenu value={sort} onChange={setSort} />
          ) : null}

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

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        {scope === "mine" ? "My projects" : "All projects"}
      </h1>

      {view === "grid" ? (
        <div className="mt-6 grid grid-cols-1 gap-5 overflow-visible sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              onDelete={() => {
                setMenuOpenId(null);
                setDeleteMission(mission);
              }}
              onRename={() => {
                setMenuOpenId(null);
                setRenameMission(mission);
              }}
              pending={pending}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-xs uppercase tracking-wide">
              <tr>
                <SortableTableHeader
                  label="Project"
                  active={tableSortColumn === "title"}
                  direction={tableSortDirection}
                  onSort={() => onSortTableColumn("title")}
                  className="px-4 py-3 text-xs uppercase tracking-wide"
                />
                <SortableTableHeader
                  label="Updated"
                  active={tableSortColumn === "updated_at"}
                  direction={tableSortDirection}
                  onSort={() => onSortTableColumn("updated_at")}
                  className="hidden px-4 py-3 text-xs uppercase tracking-wide md:table-cell"
                />
                <SortableTableHeader
                  label="Sources"
                  active={tableSortColumn === "source_count"}
                  direction={tableSortDirection}
                  onSort={() => onSortTableColumn("source_count")}
                  className="px-4 py-3 text-xs uppercase tracking-wide"
                />
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-muted"
                  aria-label="Actions"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    {scope === "mine"
                      ? "You have not created any projects yet."
                      : "No projects yet. Create one to start a focused chat."}
                  </td>
                </tr>
              ) : (
                visibleListMissions.map((mission) => (
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
                        <ProjectActionsMenu
                          missionTitle={mission.title}
                          menuOpen={menuOpenId === mission.id}
                          onMenuToggle={() =>
                            setMenuOpenId((id) =>
                              id === mission.id ? null : mission.id,
                            )
                          }
                          onMenuClose={() => setMenuOpenId(null)}
                          onRename={() => {
                            setMenuOpenId(null);
                            setRenameMission(mission);
                          }}
                          onDelete={() => {
                setMenuOpenId(null);
                setDeleteMission(mission);
              }}
                          pending={pending}
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
          {listPagination.hasMore ? (
            <TableSeeMore onShowMore={listPagination.showMore} />
          ) : null}
        </div>
      )}

      {showCreate ? (
        <CreateMissionModal
          onClose={() => setShowCreate(false)}
          tenantMembers={tenantMembers}
          defaultLeadId={currentUserId}
        />
      ) : null}
      {renameMission ? (
        <RenameMissionModal
          mission={renameMission}
          onClose={() => setRenameMission(null)}
        />
      ) : null}
      {deleteMission ? (
        <DeleteMissionModal
          mission={deleteMission}
          pending={pending}
          onClose={() => setDeleteMission(null)}
          onConfirm={onConfirmDelete}
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
      className={`group ${isDragging ? "" : "project-card-pulse"} relative flex min-h-[260px] flex-col overflow-visible rounded-2xl border border-border bg-[#FAFAFA] p-6 dark:bg-surface ${
        isDragging ? "opacity-50" : ""
      } ${isDropTarget ? "border-accent ring-2 ring-accent/30" : ""} ${
        menuOpen ? "z-30" : ""
      }`}
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
          className={`absolute left-0 top-1/2 z-10 inline-flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition-opacity hover:text-foreground active:cursor-grabbing ${
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      <div className="mb-3 flex items-start gap-2">
        <Link
          href={`/workspace/missions/${mission.id}`}
          className="min-w-0 flex-1 hover:opacity-90"
        >
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {mission.title}
          </h2>
        </Link>
        <ProjectActionsMenu
          missionTitle={mission.title}
          menuOpen={menuOpen}
          onMenuToggle={onMenuToggle}
          onMenuClose={onMenuClose}
          onRename={onRename}
          onDelete={onDelete}
          pending={pending}
          className="shrink-0"
          buttonClassName="h-7 w-7"
        />
      </div>

      <div className="min-h-0 flex-1">
        {mission.description ? (
          <Link
            href={`/workspace/missions/${mission.id}`}
            className="mt-2 block hover:opacity-90"
          >
            <p className="text-sm leading-relaxed text-muted">
              {mission.description}
            </p>
          </Link>
        ) : null}
      </div>

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
  );
}

function ProjectActionsMenu({
  missionTitle,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onRename,
  onDelete,
  pending,
  className = "",
  buttonClassName = "h-8 w-8",
}: {
  missionTitle: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  pending: boolean;
  className?: string;
  buttonClassName?: string;
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
      ref={menuRef}
      className={`relative inline-flex shrink-0 ${className}`.trim()}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onMenuToggle();
        }}
        aria-label={`Project options for ${missionTitle}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={`inline-flex items-center justify-center rounded-md text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10 ${buttonClassName}`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-32 rounded-md border border-border bg-surface py-1 text-sm shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={onRename}
            className="block w-full px-3 py-1.5 text-left hover:bg-hover"
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={onDelete}
            className="block w-full px-3 py-1.5 text-left text-danger hover:bg-hover"
          >
            Delete
          </button>
        </div>
      ) : null}
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

function DeleteMissionModal({
  mission,
  pending,
  onClose,
  onConfirm,
}: {
  mission: MissionRow;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const canDelete = confirmation === "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Delete {mission.title}?</h2>
            <p className="mt-2 text-sm text-muted">
              This will permanently delete the project and its associated sources,
              insights, and content. This action cannot be undone.
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

        <div className="mt-6">
          <label htmlFor="delete-mission-confirmation" className="text-sm font-medium">
            Type DELETE to confirm
          </label>
          <input
            id="delete-mission-confirmation"
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="DELETE"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || !canDelete}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </div>
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

function CreateMissionModal({
  onClose,
  tenantMembers,
  defaultLeadId,
}: {
  onClose: () => void;
  tenantMembers: TeamMember[];
  defaultLeadId: string;
}) {
  const [description, setDescription] = useState("");
  const [projectLeadId, setProjectLeadId] = useState(defaultLeadId);

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
          <div>
            <label htmlFor="mission-project-lead" className="text-sm font-medium">
              Assigned
            </label>
            <select
              id="mission-project-lead"
              name="project_lead_id"
              required
              value={projectLeadId}
              onChange={(event) => setProjectLeadId(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {tenantMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.email}
                </option>
              ))}
            </select>
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

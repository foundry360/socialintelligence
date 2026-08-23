"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import type { BaselineListItem } from "@/lib/workspace/baseline";
import { baselineStatusLabel, formatBaselineDate } from "@/components/baseline-panel";

const BASELINE_ROOT_ID = "authority-baseline";

export function BaselineVersionTree({
  baselines,
  selectedId,
  onSelect,
}: {
  baselines: BaselineListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([BASELINE_ROOT_ID]),
  );
  const sorted = [...baselines].sort((a, b) => b.version - a.version);

  function toggleFolder(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isOpen = expanded.has(BASELINE_ROOT_ID);

  return (
    <div className="space-y-2 text-left">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => toggleFolder(BASELINE_ROOT_ID)}
          aria-label={
            isOpen ? "Collapse Authority Baseline" : "Expand Authority Baseline"
          }
          className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
        >
          <Folder
            className="h-4 w-4 shrink-0 transition-opacity group-hover:opacity-0"
            aria-hidden
          />
          {isOpen ? (
            <ChevronDown
              className="absolute h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          ) : (
            <ChevronRight
              className="absolute h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          )}
        </button>
        <div className="flex min-w-0 flex-1 items-center rounded-md px-2 py-1.5 text-sm font-medium text-foreground">
          <span className="min-w-0 truncate">
            Authority Baseline ({baselines.length})
          </span>
        </div>
      </div>

      {isOpen ? (
        <ul className="ml-5 border-l border-border pb-1 pl-2">
          {sorted.length === 0 ? (
            <li className="px-2 py-2 text-xs text-muted">No versions yet</li>
          ) : (
            sorted.map((baseline) => {
              const active = baseline.id === selectedId;
              return (
                <li key={baseline.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(baseline.id)}
                    className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                      active
                        ? "bg-accent/15 text-foreground"
                        : "text-foreground hover:bg-hover"
                    }`}
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">Version {baseline.version}</span>
                      <span className="mt-0.5 block text-[10px] text-muted">
                        {formatBaselineDate(baseline.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 pt-0.5 text-[10px] text-muted">
                      {baselineStatusLabel(baseline.rawStatus)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

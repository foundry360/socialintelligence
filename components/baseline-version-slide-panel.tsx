"use client";

import { X } from "lucide-react";
import { BaselineVersionTree } from "@/components/baseline-version-tree";
import type { BaselineListItem } from "@/lib/workspace/baseline";

export function BaselineVersionSlidePanel({
  open,
  baselines,
  selectedId,
  onSelect,
  onClose,
}: {
  open: boolean;
  baselines: BaselineListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <aside
      aria-hidden={!open}
      className={`flex shrink-0 flex-col overflow-hidden border-r border-border bg-[#F3F8FC] transition-[width] duration-200 ease-out dark:bg-background ${
        open ? "w-64 sm:w-72 lg:w-80" : "w-0 border-r-0"
      }`}
    >
      <div
        className={`flex h-full min-w-64 flex-col sm:min-w-72 lg:min-w-80 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        } transition-opacity duration-150`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="min-w-0 truncate text-sm font-medium">Baseline Versions</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close baseline versions"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="scrollbar-thread min-h-0 flex-1 overflow-y-auto p-4">
          <BaselineVersionTree
            baselines={baselines}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      </div>
    </aside>
  );
}

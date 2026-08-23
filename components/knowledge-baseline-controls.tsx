"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { generateAuthorityBaseline } from "@/app/workspace/baseline/actions";

export function KnowledgeBaselineControls({
  hasBaseline,
  spineComplete,
  canEdit,
  onBaselineGenerated,
}: {
  hasBaseline: boolean;
  spineComplete: boolean;
  canEdit: boolean;
  onBaselineGenerated: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const showControls = canEdit && (spineComplete || hasBaseline);

  if (!showControls) return null;

  function onCreateOrRegenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await generateAuthorityBaseline();
        onBaselineGenerated(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create baseline.");
      }
    });
  }

  return (
    <div className="shrink-0 space-y-2 p-4">
      <button
        type="button"
        disabled={pending || (!hasBaseline && !spineComplete)}
        onClick={onCreateOrRegenerate}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden />
        )}
        {pending
          ? "Generating…"
          : hasBaseline
            ? "Regenerate baseline"
            : "Create baseline"}
      </button>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { generateAuthorityBaseline } from "@/app/workspace/baseline/actions";

export function KnowledgeBaselineButton({
  hasBaseline,
}: {
  hasBaseline: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await generateAuthorityBaseline();
        router.push(`/workspace/baseline?id=${id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create baseline.");
      }
    });
  }

  return (
    <div className="shrink-0 p-4">
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
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
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}

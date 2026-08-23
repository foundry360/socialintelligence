"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Rocket, X } from "lucide-react";
import {
  onboardingProgress,
  type OnboardingStep,
} from "@/lib/workspace/onboarding";

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const { complete, incomplete, total, firstIncomplete } =
    onboardingProgress(steps);

  if (incomplete === 0) return null;

  const progressPct = total > 0 ? Math.round((complete / total) * 100) : 0;

  if (!expanded) {
    return (
      <div className="pointer-events-none fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`Get started, ${incomplete} steps remaining`}
          className="pointer-events-auto relative flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105"
        >
          <Rocket className="h-4 w-4" aria-hidden />
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-danger px-1 text-[11px] font-semibold leading-none text-white">
            {incomplete}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 w-[min(100vw-2rem,20rem)]">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Get started</h2>
              <p className="mt-0.5 text-xs text-muted">
                {complete} of {total} steps complete
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Collapse checklist"
              className="rounded-md p-1 text-muted hover:bg-hover hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/30"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <ul className="space-y-1 p-2">
          {steps.map((step) => {
            const isActive = !step.done && step.id === firstIncomplete?.id;
            return (
              <li key={step.id}>
                {step.done ? (
                  <div className="flex items-center gap-2 rounded-lg px-2 py-2">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-border bg-muted/20"
                      aria-hidden
                    />
                    <span className="text-sm text-muted line-through">
                      {step.label}
                    </span>
                  </div>
                ) : (
                  <Link
                    href={step.href}
                    className={
                      isActive
                        ? "flex items-start gap-2 rounded-lg bg-[#F3F8FC] px-2 py-2.5 transition-colors hover:bg-hover dark:bg-subtle"
                        : "flex items-start gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover"
                    }
                  >
                    <span
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-border"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {step.label}
                      </span>
                      {isActive ? (
                        <span className="mt-0.5 block text-xs text-muted">
                          {step.description}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                      aria-hidden
                    />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

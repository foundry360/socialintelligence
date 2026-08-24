"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type MissionProjectNavProps = {
  missionId: string;
  missionTitle: string;
};

const tabs = [
  { href: (id: string) => `/workspace/missions/${id}`, label: "Insights", exact: true },
  {
    href: (id: string) => `/workspace/missions/${id}/watch`,
    label: "Signals",
    exact: false,
  },
] as const;

export function MissionProjectNav({
  missionId,
  missionTitle,
}: MissionProjectNavProps) {
  const pathname = usePathname();
  const sectionLabel = pathname.includes("/watch") ? "Signals" : "Insights";

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-2 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/workspace"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Projects
        </Link>
        <span className="shrink-0 text-muted" aria-hidden>
          /
        </span>
        <p className="truncate text-sm font-medium">{missionTitle}</p>
        <span className="shrink-0 text-muted" aria-hidden>
          /
        </span>
        <p className="truncate text-sm font-medium">{sectionLabel}</p>
      </div>

      <nav className="flex shrink-0 gap-1.5" aria-label="Project sections">
        {tabs.map((tab) => {
          const href = tab.href(missionId);
          const active = tab.exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={tab.label}
              href={href}
              className={
                active
                  ? "inline-flex shrink-0 items-center rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                  : "inline-flex shrink-0 items-center rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:bg-hover hover:text-foreground"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

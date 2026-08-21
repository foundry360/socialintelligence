import type { ReactNode } from "react";
import { UserMenu } from "@/components/user-menu";
import { WorkspaceNav } from "@/components/workspace-nav";

export function WorkspaceShell({
  tenantName,
  email,
  avatarUrl,
  children,
}: {
  tenantName: string;
  email?: string | null;
  avatarUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="z-40 shrink-0 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <div className="min-w-0 shrink-0">
            <p className="text-xs tracking-wide text-muted">
              Social Intelligence
            </p>
            <p className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {tenantName}
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
            <WorkspaceNav />
            <UserMenu email={email} avatarUrl={avatarUrl} />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

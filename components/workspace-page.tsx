import type { ReactNode } from "react";

/** Full-width content frame for non-chat workspace pages. */
export function WorkspacePage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted">{description}</p>
        ) : null}
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">{children}</div>
    </div>
  );
}

export function WorkspacePageWide({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

/** Full-height workspace frame: no page scroll; children manage internal overflow. */
export function WorkspacePageFill({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

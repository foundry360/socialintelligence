import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageWide } from "@/components/workspace-page";
import { requireWorkspaceContext } from "@/lib/auth/workspace";

export default async function LibraryPage() {
  const ctx = await requireWorkspaceContext();

  return (
    <WorkspaceShell
      tenantName={ctx.tenantName}
      email={ctx.user.email}
      avatarUrl={
        typeof ctx.user.user_metadata?.avatar_url === "string"
          ? ctx.user.user_metadata.avatar_url
          : null
      }
    >
      <WorkspacePageWide>
        <h1 className="text-2xl font-semibold tracking-tight">My Library</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Placeholder — curated library views will live here. For now, add
          sources from Chat with the + control.
        </p>
      </WorkspacePageWide>
    </WorkspaceShell>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import type { TenantRole } from "@/domains/shared/types";
import {
  cancelTeamInvite,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
} from "@/app/workspace/settings/team/actions";
import {
  ASSIGNABLE_ROLES,
  initialsFromEmail,
  roleLabel,
  type PendingInvite,
  type TeamMember,
} from "@/lib/tenancy/team-shared";

function MemberAvatar({
  email,
  avatarUrl,
}: {
  email: string;
  avatarUrl: string | null;
}) {
  const initials = initialsFromEmail(email);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-sm font-medium text-muted">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

export function TeamPanel({
  members,
  invites,
  currentUserId,
  currentUserRole,
  canManage,
}: {
  members: TeamMember[];
  invites: PendingInvite[];
  currentUserId: string;
  currentUserRole: TenantRole;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TenantRole>("viewer");

  function runAction(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage(result.message ?? "Saved.");
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  function onInvite(event: React.FormEvent) {
    event.preventDefault();
    const fd = new FormData();
    fd.set("email", email);
    fd.set("role", inviteRole);
    runAction(async () => {
      const result = await inviteTeamMember(fd);
      if (result.ok) {
        setEmail("");
        setInviteRole("viewer");
      }
      return result;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-2 text-sm text-muted">
          Manage who has access to this workspace and what they can do.
        </p>
      </div>

      {canManage ? (
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4" aria-hidden />
            Invite member
          </h2>
          <form onSubmit={onInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="font-medium">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@company.com"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex w-full flex-col gap-1.5 text-sm sm:w-36">
              <span className="font-medium">Role</span>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as TenantRole)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Invite
            </button>
          </form>
          <p className="mt-3 text-xs text-muted">
            New users receive an email invite. Existing users are added immediately.
          </p>
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Only owners and admins can invite or manage team members.
        </p>
      )}

      {message ? (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Members ({members.length})</h2>
        </div>
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const canEditMember =
              canManage &&
              member.role !== "owner" &&
              !(isSelf && currentUserRole === "admin");

            return (
              <li
                key={member.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <MemberAvatar email={member.email} avatarUrl={member.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.email}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-muted">(you)</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEditMember ? (
                    <select
                      value={member.role}
                      disabled={pending}
                      onChange={(event) =>
                        runAction(() =>
                          updateTeamMemberRole(
                            member.id,
                            event.target.value as TenantRole,
                          ),
                        )
                      }
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
                    >
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md bg-muted/20 px-2.5 py-1 text-xs font-medium text-muted">
                      {roleLabel(member.role)}
                    </span>
                  )}
                  {canEditMember && !isSelf ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        runAction(() => removeTeamMember(member.id))
                      }
                      aria-label={`Remove ${member.email}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:bg-hover hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {invites.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Pending invites ({invites.length})</h2>
          </div>
          <ul className="divide-y divide-border">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invite.email}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Invited {new Date(invite.createdAt).toLocaleDateString()} as{" "}
                    {roleLabel(invite.role)}
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => runAction(() => cancelTeamInvite(invite.id))}
                    className="text-sm text-muted underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                  >
                    Cancel invite
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

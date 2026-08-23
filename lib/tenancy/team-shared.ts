import type { TenantRole } from "@/domains/shared/types";

export type TeamMember = {
  id: string;
  userId: string;
  email: string;
  avatarUrl: string | null;
  role: TenantRole;
  createdAt: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: TenantRole;
  createdAt: string;
};

export const ASSIGNABLE_ROLES: TenantRole[] = [
  "admin",
  "editor",
  "viewer",
];

export function roleLabel(role: TenantRole | string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "editor":
      return "Editor";
    case "viewer":
      return "Viewer";
    default:
      return role;
  }
}

export function initialsFromEmail(email?: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._\-\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

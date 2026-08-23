"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Camera, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  removeUserAvatar,
  signOut,
  updateUserAvatar,
} from "@/app/login/actions";

function initialsFromEmail(email?: string | null) {
  if (!email) return "?";
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._\-\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function displayNameFromEmail(email?: string | null) {
  if (!email) return "Account";
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function UserMenu({
  email,
  avatarUrl,
  canManageTeam = false,
}: {
  email?: string | null;
  avatarUrl?: string | null;
  canManageTeam?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const menuId = useId();
  const initials = initialsFromEmail(email);
  const name = displayNameFromEmail(email);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPreviewUrl(avatarUrl ?? null);
  }, [avatarUrl]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setError(null);

    const fd = new FormData();
    fd.set("avatar", file);
    startTransition(async () => {
      try {
        const result = await updateUserAvatar(fd);
        setPreviewUrl(result.avatarUrl);
        router.refresh();
      } catch (err) {
        setPreviewUrl(avatarUrl ?? null);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        URL.revokeObjectURL(localPreview);
      }
    });
  }

  function onRemoveAvatar() {
    setError(null);
    startTransition(async () => {
      try {
        await removeUserAvatar();
        setPreviewUrl(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Remove failed");
      }
    });
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <span className="hidden max-w-[10rem] truncate text-sm text-inherit sm:inline md:max-w-[14rem]">
        {name}
      </span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/10 text-sm font-medium text-inherit hover:bg-white/20 dark:border-border dark:bg-subtle dark:text-foreground dark:hover:bg-hover"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={titleId}
          className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-surface text-foreground shadow-lg"
        >
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-base font-medium">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Change avatar"
                  className="absolute -right-1 -bottom-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm hover:bg-hover disabled:opacity-40"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={onPickFile}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p id={titleId} className="truncate text-sm font-medium">
                  {name}
                </p>
                {email ? (
                  <p className="mt-0.5 truncate text-xs text-muted">{email}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-foreground underline underline-offset-2 hover:no-underline disabled:opacity-40"
                  >
                    {pending ? "Uploading…" : "Upload photo"}
                  </button>
                  {previewUrl ? (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={pending}
                      onClick={onRemoveAvatar}
                      className="text-xs text-muted underline underline-offset-2 hover:text-foreground hover:no-underline disabled:opacity-40"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            {error ? (
              <p className="mt-3 text-xs text-danger">{error}</p>
            ) : null}
            <p className="mt-2 text-[11px] text-muted">
              JPEG, PNG, WebP, or GIF up to 5MB.
            </p>
          </div>

          <div className="space-y-3 px-4 py-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Appearance</p>
              <div
                role="group"
                aria-label="Color mode"
                className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1"
              >
                {MODES.map((mode) => {
                  const active = mounted && theme === mode.value;
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      role="menuitem"
                      onClick={() => setTheme(mode.value)}
                      className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted hover:bg-hover hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {canManageTeam ? (
              <Link
                href="/workspace/settings/team"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block w-full rounded-md border border-border px-3 py-2 text-center text-sm text-foreground hover:bg-hover"
              >
                Account
              </Link>
            ) : null}

            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-hover"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

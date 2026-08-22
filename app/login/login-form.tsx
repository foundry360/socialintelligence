"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/db/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  provisionCurrentUserOrganization,
  resolvePostAuthPath,
} from "@/app/onboarding/actions";

const PENDING_ORG_KEY = "x2_pending_organization_name";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/workspace";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const orgName = organizationName.trim();

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        });
        if (signInError) throw signInError;

        const pendingOrg =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem(PENDING_ORG_KEY)
            : null;
        const path = await resolvePostAuthPath(pendingOrg);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(PENDING_ORG_KEY);
        }
        router.push(path === "/workspace" ? next : path);
        router.refresh();
        return;
      }

      if (orgName.length < 2) {
        throw new Error("Organization name must be at least 2 characters.");
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
        });
      if (signUpError) throw signUpError;

      if (signUpData.session) {
        // Ensure auth cookies are written before the server action runs.
        await supabase.auth.getSession();
        let result = await provisionCurrentUserOrganization(orgName);
        if (!result.ok && result.code === "unauthenticated") {
          result = await provisionCurrentUserOrganization(orgName);
        }
        if (!result.ok && result.code !== "already_member") {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(PENDING_ORG_KEY, orgName);
          }
          router.push("/onboarding");
          router.refresh();
          return;
        }
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(PENDING_ORG_KEY);
        }
        router.push("/workspace");
        router.refresh();
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PENDING_ORG_KEY, orgName);
      }
      setMessage(
        "Account created. Check your email to confirm, then sign in - your workspace will be created automatically.",
      );
      setMode("signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <div>
        <p className="text-sm text-muted">Social Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h1>
      </div>

      {mode === "signup" ? (
        <label className="flex w-full flex-col gap-1 text-sm">
          Organization name
          <input
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="organization"
            placeholder="Acme Corp"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-foreground"
          />
        </label>
      ) : null}

      <label className="flex w-full flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-foreground"
        />
      </label>

      <label className="flex w-full flex-col gap-1 text-sm">
        Password
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-foreground"
        />
      </label>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      {mode === "signin" ? (
        <p className="text-sm">
          <Link href="/login/forgot" className="text-muted underline">
            Forgot password?
          </Link>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending
          ? "Please wait…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>

      {mode === "signin" ? (
        <p className="text-center text-sm text-muted">
          New to{" "}
          <span className="text-foreground">
            <span className="font-bold">X</span>
            <span className="font-medium">2</span>
          </span>
          ?{" "}
          <button
            type="button"
            className="font-medium text-accent underline-offset-2 hover:underline"
            onClick={() => {
              setError(null);
              setMessage(null);
              setMode("signup");
            }}
          >
            Create an account
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <button
            type="button"
            className="font-medium text-accent underline-offset-2 hover:underline"
            onClick={() => {
              setError(null);
              setMessage(null);
              setMode("signin");
            }}
          >
            Sign in
          </button>
        </p>
      )}
    </form>
  );
}

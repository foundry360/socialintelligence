"use client";

import { createOrganizationAction } from "./actions";

export function OnboardingForm({ error }: { error: string | null }) {
  return (
    <form action={createOrganizationAction} className="flex w-full flex-col gap-4">
      <label className="flex w-full flex-col gap-1 text-sm">
        Organization name
        <input
          name="organization_name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          placeholder="Acme Corp"
          autoComplete="organization"
          className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-foreground"
        />
      </label>
      <p className="text-xs text-muted">
        Use the company or brand this knowledge workspace is for.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground"
      >
        Create workspace
      </button>
    </form>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  createWatchProfile,
  updateWatchProfile,
} from "@/app/workspace/missions/signals/actions";
import {
  criterionTypeLabel,
  WATCH_CRITERION_TYPES,
  type WatchCriterionInput,
  type WatchFeedInput,
  type WatchProfileListItem,
} from "@/lib/workspace/watch-profiles";
import type { WatchCriterionType } from "@/domains/signals/types";

export function WatchProfileModal({
  missionId,
  profile,
  onClose,
  onSaved,
}: {
  missionId: string;
  profile?: WatchProfileListItem;
  onClose: () => void;
  onSaved: (profile: WatchProfileListItem) => void;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [enabled, setEnabled] = useState(profile?.enabled ?? true);
  const [criteria, setCriteria] = useState<WatchCriterionInput[]>([]);
  const [feeds, setFeeds] = useState<WatchFeedInput[]>([]);
  const [loaded, setLoaded] = useState(!profile);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!profile || loaded) return;
    void (async () => {
      const { getWatchProfile } = await import(
        "@/app/workspace/missions/signals/actions"
      );
      try {
        const detail = await getWatchProfile(profile.id);
        setCriteria(
          detail.criteria.map((c) => ({
            criterionType: c.criterionType,
            value: c.value,
          })),
        );
        setFeeds(
          detail.feeds.map((f) => ({
            feedUrl: f.feedUrl,
            label: f.label ?? undefined,
          })),
        );
        setLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile.");
      }
    })();
  }, [profile, loaded]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("missionId", missionId);
    if (profile) formData.set("profileId", profile.id);
    formData.set("name", name);
    formData.set("description", description);
    formData.set("enabled", enabled ? "true" : "false");
    formData.set("criteriaJson", JSON.stringify(criteria));
    formData.set("feedsJson", JSON.stringify(feeds));

    startTransition(async () => {
      try {
        if (profile) {
          await updateWatchProfile(formData);
          onSaved({
            ...profile,
            name,
            description,
            enabled,
            criteriaCount: criteria.length,
            feedsCount: feeds.length,
          });
        } else {
          const id = await createWatchProfile(formData);
          onSaved({
            id,
            tenantId: "",
            missionId,
            name,
            description,
            enabled,
            config: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            criteriaCount: criteria.length,
            feedsCount: feeds.length,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {profile ? "Edit watch profile" : "New watch profile"}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Monitoring criteria and feed URLs for signal collection.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted hover:bg-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="watch-name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="watch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="Healthcare AI"
              />
            </div>
            <div>
              <label htmlFor="watch-description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="watch-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="What market changes should this project watch for?"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="size-4 rounded accent-accent"
              />
              Enabled
            </label>

            <CriteriaEditor criteria={criteria} onChange={setCriteria} />
            <FeedsEditor feeds={feeds} onChange={setFeeds} />

            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {!loaded && profile ? (
              <p className="text-sm text-muted">Loading profile…</p>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-md px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || (!!profile && !loaded)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
            >
              {pending ? "Saving…" : profile ? "Save changes" : "Create profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CriteriaEditor({
  criteria,
  onChange,
}: {
  criteria: WatchCriterionInput[];
  onChange: (next: WatchCriterionInput[]) => void;
}) {
  const [type, setType] = useState<WatchCriterionType>("topic");
  const [value, setValue] = useState("");

  function addCriterion() {
    const trimmed = value.trim();
    if (!trimmed) return;
    const exists = criteria.some(
      (c) =>
        c.criterionType === type &&
        c.value.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;
    onChange([...criteria, { criterionType: type, value: trimmed }]);
    setValue("");
  }

  return (
    <div>
      <p className="text-sm font-medium">Monitoring criteria</p>
      <p className="mt-0.5 text-xs text-muted">
        Topics, companies, industries, exclusions, and more.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {criteria.map((c, index) => (
          <span
            key={`${c.criterionType}-${c.value}-${index}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
          >
            <span className="text-muted">{criterionTypeLabel(c.criterionType)}:</span>
            <span>{c.value}</span>
            <button
              type="button"
              onClick={() => onChange(criteria.filter((_, i) => i !== index))}
              className="text-muted hover:text-foreground"
              aria-label={`Remove ${c.value}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as WatchCriterionType)}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-accent"
        >
          {WATCH_CRITERION_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCriterion();
            }
          }}
          placeholder="Add criterion…"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={addCriterion}
          className="shrink-0 rounded-md border border-border px-3 py-2 text-sm hover:bg-hover"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function FeedsEditor({
  feeds,
  onChange,
}: {
  feeds: WatchFeedInput[];
  onChange: (next: WatchFeedInput[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  function addFeed() {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    } catch {
      return;
    }
    if (feeds.some((f) => f.feedUrl === trimmed)) return;
    onChange([
      ...feeds,
      { feedUrl: trimmed, label: label.trim() || undefined },
    ]);
    setUrl("");
    setLabel("");
  }

  return (
    <div>
      <p className="text-sm font-medium">RSS feeds</p>
      <p className="mt-0.5 text-xs text-muted">
        Configured now; collection starts in the next phase.
      </p>
      {feeds.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {feeds.map((feed, index) => (
            <li
              key={`${feed.feedUrl}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {feed.label || feed.feedUrl}
                </p>
                {feed.label ? (
                  <p className="truncate text-xs text-muted">{feed.feedUrl}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onChange(feeds.filter((_, i) => i !== index))}
                className="shrink-0 text-muted hover:text-foreground"
                aria-label="Remove feed"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 space-y-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/feed.xml"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Optional label"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={addFeed}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-hover"
        >
          Add feed
        </button>
      </div>
    </div>
  );
}

import type { WatchCriterionType } from "@/domains/signals/types";

export const WATCH_CRITERION_TYPE_IDS = [
  "topic",
  "keyword",
  "entity",
  "company",
  "competitor",
  "technology",
  "product",
  "industry",
  "regulatory_body",
  "organization",
  "market_category",
  "geography",
  "domain",
  "exclusion",
] as const satisfies readonly WatchCriterionType[];

const CRITERION_TYPE_SET = new Set<string>(WATCH_CRITERION_TYPE_IDS);

export function normalizeCriterionValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isWatchCriterionType(value: string): value is WatchCriterionType {
  return CRITERION_TYPE_SET.has(value);
}

export type WatchCriterionInput = {
  criterionType: WatchCriterionType;
  value: string;
};

export type WatchFeedInput = {
  feedUrl: string;
  label?: string;
};

export function parseCriteriaJson(raw: string): WatchCriterionInput[] {
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid criteria data.");
  }
  if (!Array.isArray(parsed)) throw new Error("Invalid criteria data.");

  const result: WatchCriterionInput[] = [];
  const seen = new Set<string>();

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const type = String((item as { criterionType?: string }).criterionType ?? "");
    const value = String((item as { value?: string }).value ?? "").trim();
    if (!isWatchCriterionType(type) || !value) continue;
    const normalized = normalizeCriterionValue(value);
    const key = `${type}:${normalized}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ criterionType: type, value });
  }

  return result;
}

export function parseFeedsJson(raw: string): WatchFeedInput[] {
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid feed data.");
  }
  if (!Array.isArray(parsed)) throw new Error("Invalid feed data.");

  const result: WatchFeedInput[] = [];
  const seen = new Set<string>();

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const feedUrl = String((item as { feedUrl?: string }).feedUrl ?? "").trim();
    if (!feedUrl) continue;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(feedUrl);
    } catch {
      throw new Error(`Invalid feed URL: ${feedUrl}`);
    }
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error(`Feed URL must use http or https: ${feedUrl}`);
    }
    const normalized = parsedUrl.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const label = String((item as { label?: string }).label ?? "").trim();
    result.push({ feedUrl: normalized, label: label || undefined });
  }

  return result;
}

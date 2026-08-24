import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function normalizeTitleForFingerprint(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");
}

export function dateBucket(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function canonicalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hostname = parsed.hostname.toLowerCase();
  for (const param of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(param.toLowerCase())) {
      parsed.searchParams.delete(param);
    }
  }
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}

export function extractDomain(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

export function urlFingerprint(canonicalUrl: string): string {
  return sha256Hex(canonicalUrl.toLowerCase());
}

export function contentHash(title: string, description: string): string {
  const payload = `${normalizeTitleForFingerprint(title)}|${description.trim().toLowerCase()}`;
  return sha256Hex(payload);
}

export function eventFingerprint(
  title: string,
  publishedAt: string | null | undefined,
  domain: string,
): string {
  const payload = `${normalizeTitleForFingerprint(title)}|${dateBucket(publishedAt)}|${domain.toLowerCase()}`;
  return sha256Hex(payload);
}

export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function isPrivateIpv4(hostname: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;
  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((octet) => octet > 255)) return false;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith(".local")) return true;
  if (normalized.endsWith(".internal")) return true;
  if (isPrivateIpv4(normalized)) return true;
  return false;
}

export type FeedUrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

export function validateFeedUrlForFetch(feedUrl: string): FeedUrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(feedUrl.trim());
  } catch {
    return { ok: false, reason: "Invalid feed URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Feed URL must use HTTPS." };
  }

  if (!parsed.hostname) {
    return { ok: false, reason: "Feed URL is missing a hostname." };
  }

  if (isBlockedHostname(parsed.hostname)) {
    return { ok: false, reason: "Feed URL hostname is not allowed." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "Feed URL must not include credentials." };
  }

  return { ok: true, url: parsed };
}

import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 15_000;

export type FetchedWebSource = {
  finalUrl: string;
  title: string;
  text: string;
};

function assertPublicHostnameOrIp(hostOrIp: string): void {
  const value = hostOrIp.toLowerCase();
  if (
    value === "localhost" ||
    value.endsWith(".localhost") ||
    value.endsWith(".local") ||
    value.endsWith(".internal")
  ) {
    throw new Error("That host is not allowed.");
  }

  if (isIP(value)) {
    if (isPrivateIp(value)) {
      throw new Error("Private/network addresses are not allowed.");
    }
    return;
  }
}

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Enter a valid URL (https://…).");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  assertPublicHostnameOrIp(url.hostname);

  const resolved = await lookup(url.hostname, { all: true });
  if (!resolved.length) {
    throw new Error("Could not resolve that host.");
  }
  for (const entry of resolved) {
    if (isPrivateIp(entry.address)) {
      throw new Error("That host resolves to a private address.");
    }
  }

  return url;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
}

export function htmlToReadableText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? decodeEntities(titleMatch[1].replace(/\s+/g, " ").trim())
    : "";

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const mainMatch =
    body.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    body.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (mainMatch) body = mainMatch[1];

  body = body
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|section|br|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const text = decodeEntities(body)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return { title, text };
}

export async function fetchWebSource(rawUrl: string): Promise<FetchedWebSource> {
  const url = await assertSafeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "SocialIntelligenceBot/0.1 (+https://github.com/foundry360/socialintelligence)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed (${response.status}).`);
    }

    // Re-check final URL after redirects
    const finalUrl = new URL(response.url);
    await assertSafeUrl(finalUrl.toString());

    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("URL did not return HTML/text content.");
    }

    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      throw new Error("Page is too large to import.");
    }

    const raw = buf.toString("utf8");
    if (contentType.includes("text/plain")) {
      const text = raw.replace(/\s+/g, " ").trim();
      if (text.length < 40) {
        throw new Error("Not enough text content found at that URL.");
      }
      return {
        finalUrl: finalUrl.toString(),
        title: finalUrl.hostname,
        text: text.slice(0, 100_000),
      };
    }

    const { title, text } = htmlToReadableText(raw);
    if (text.length < 40) {
      throw new Error(
        "Could not extract enough readable text. The site may be JavaScript-heavy or blocked.",
      );
    }

    return {
      finalUrl: finalUrl.toString(),
      title: title || finalUrl.hostname,
      text: text.slice(0, 100_000),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timed out fetching that URL.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

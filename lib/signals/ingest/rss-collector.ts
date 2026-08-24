import { XMLParser } from "fast-xml-parser";
import { validateFeedUrlForFetch } from "@/lib/signals/ingest/feed-url";
import { stripHtml } from "@/lib/signals/ingest/normalize";

export const MAX_ITEMS_PER_FEED = 50;
export const FEED_FETCH_TIMEOUT_MS = 15_000;

export type RssFeedItem = {
  title: string;
  link: string;
  description: string;
  author: string | null;
  publishedAt: string | null;
  guid: string | null;
};

export type RssFetchResult = {
  items: RssFeedItem[];
  etag: string | null;
  lastModified: string | null;
  notModified: boolean;
  feedTitle: string;
};

type FetchFeedOptions = {
  etag?: string | null;
  lastModified?: string | null;
};

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value !== null && "#text" in value) {
    return String((value as { "#text"?: unknown })["#text"] ?? "").trim();
  }
  return String(value).trim();
}

function readLink(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const href = readLink(entry);
      if (href) return href;
    }
    return "";
  }
  if (typeof value === "object" && value !== null) {
    const record = value as { "@_href"?: string; href?: string };
    return String(record["@_href"] ?? record.href ?? "").trim();
  }
  return "";
}

function parsePublishedAt(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseRssOrAtom(xml: string): { feedTitle: string; items: RssFeedItem[] } {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;

  if (doc.rss && typeof doc.rss === "object") {
    const channel = (doc.rss as { channel?: Record<string, unknown> }).channel;
    if (!channel || typeof channel !== "object") {
      return { feedTitle: "", items: [] };
    }
    const feedTitle = readText(channel.title);
    const items = asArray(channel.item).map((item) => {
      const record = item as Record<string, unknown>;
      const link = readLink(record.link) || readText(record.link);
      return {
        title: readText(record.title) || "Untitled",
        link,
        description: stripHtml(readText(record.description) || readText(record.summary)),
        author: readText(record.author) || readText(record["dc:creator"]) || null,
        publishedAt:
          parsePublishedAt(readText(record.pubDate)) ||
          parsePublishedAt(readText(record.published)),
        guid: readText(record.guid) || link || null,
      };
    });
    return { feedTitle, items };
  }

  if (doc.feed && typeof doc.feed === "object") {
    const feed = doc.feed as Record<string, unknown>;
    const feedTitle = readText(feed.title);
    const items = asArray(feed.entry).map((entry) => {
      const record = entry as Record<string, unknown>;
      const link = readLink(record.link) || readText(record.id);
      return {
        title: readText(record.title) || "Untitled",
        link,
        description: stripHtml(
          readText(record.summary) || readText(record.content) || readText(record.subtitle),
        ),
        author:
          readText((record.author as { name?: unknown } | undefined)?.name) ||
          readText(record.author) ||
          null,
        publishedAt:
          parsePublishedAt(readText(record.published)) ||
          parsePublishedAt(readText(record.updated)),
        guid: readText(record.id) || link || null,
      };
    });
    return { feedTitle, items };
  }

  return { feedTitle: "", items: [] };
}

export async function fetchRssFeed(
  feedUrl: string,
  options: FetchFeedOptions = {},
): Promise<RssFetchResult> {
  const validation = validateFeedUrlForFetch(feedUrl);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const headers: Record<string, string> = {
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "User-Agent": "SocialIntelAgent-SignalIngest/1.0",
  };
  if (options.etag?.trim()) headers["If-None-Match"] = options.etag.trim();
  if (options.lastModified?.trim()) {
    headers["If-Modified-Since"] = options.lastModified.trim();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(validation.url.toString(), {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "follow",
    });

    if (response.status === 304) {
      return {
        items: [],
        etag: options.etag ?? null,
        lastModified: options.lastModified ?? null,
        notModified: true,
        feedTitle: "",
      };
    }

    if (!response.ok) {
      throw new Error(`Feed fetch failed with status ${response.status}.`);
    }

    const xml = await response.text();
    const parsed = parseRssOrAtom(xml);
    const items = parsed.items
      .filter((item) => item.link.startsWith("http"))
      .slice(0, MAX_ITEMS_PER_FEED);

    return {
      items,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      notModified: false,
      feedTitle: parsed.feedTitle,
    };
  } finally {
    clearTimeout(timeout);
  }
}

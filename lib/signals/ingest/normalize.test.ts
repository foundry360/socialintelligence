import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateFeedUrlForFetch } from "./feed-url.ts";
import {
  canonicalizeUrl,
  contentHash,
  eventFingerprint,
  normalizeTitleForFingerprint,
  urlFingerprint,
} from "./normalize.ts";

describe("canonicalizeUrl", () => {
  it("strips tracking params and lowercases host", () => {
    const url = canonicalizeUrl(
      "https://Example.com/post?utm_source=x&keep=1&utm_campaign=y",
    );
    assert.equal(url, "https://example.com/post?keep=1");
  });
});

describe("urlFingerprint", () => {
  it("is stable for the same canonical URL", () => {
    const a = urlFingerprint("https://example.com/a");
    const b = urlFingerprint("https://example.com/a");
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });
});

describe("contentHash", () => {
  it("normalizes title whitespace and casing", () => {
    const a = contentHash("Hello   World", "Summary");
    const b = contentHash("hello world", "summary");
    assert.equal(a, b);
  });
});

describe("eventFingerprint", () => {
  it("includes normalized title, date bucket, and domain", () => {
    const fp = eventFingerprint(
      "CMS Final Rule",
      "2026-08-24T12:00:00.000Z",
      "hhs.gov",
    );
    assert.equal(fp.length, 64);
    assert.equal(
      eventFingerprint("CMS Final Rule", "2026-08-24T18:00:00.000Z", "hhs.gov"),
      fp,
    );
    assert.notEqual(
      eventFingerprint("Different Title", "2026-08-24T12:00:00.000Z", "hhs.gov"),
      fp,
    );
  });
});

describe("normalizeTitleForFingerprint", () => {
  it("removes punctuation and collapses whitespace", () => {
    assert.equal(
      normalizeTitleForFingerprint("  CMS: Final   Rule! "),
      "cms final rule",
    );
  });
});

describe("validateFeedUrlForFetch", () => {
  it("rejects non-https URLs", () => {
    const result = validateFeedUrlForFetch("http://example.com/rss");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /HTTPS/i);
    }
  });

  it("rejects localhost", () => {
    const result = validateFeedUrlForFetch("https://localhost/rss");
    assert.equal(result.ok, false);
  });

  it("accepts public https URLs", () => {
    const result = validateFeedUrlForFetch("https://example.com/rss.xml");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.url.hostname, "example.com");
    }
  });
});

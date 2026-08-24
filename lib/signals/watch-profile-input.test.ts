import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCriterionValue,
  parseCriteriaJson,
  parseFeedsJson,
} from "./watch-profile-input.ts";

describe("normalizeCriterionValue", () => {
  it("lowercases and collapses whitespace", () => {
    assert.equal(normalizeCriterionValue("  Healthcare   AI  "), "healthcare ai");
  });
});

describe("parseCriteriaJson", () => {
  it("deduplicates criteria by type and normalized value", () => {
    const result = parseCriteriaJson(
      JSON.stringify([
        { criterionType: "topic", value: "AI Governance" },
        { criterionType: "topic", value: "ai governance" },
        { criterionType: "company", value: "Epic" },
      ]),
    );
    assert.equal(result.length, 2);
    assert.equal(result[0]?.value, "AI Governance");
    assert.equal(result[1]?.criterionType, "company");
  });

  it("returns empty array for blank input", () => {
    assert.deepEqual(parseCriteriaJson(""), []);
  });
});

describe("parseFeedsJson", () => {
  it("normalizes and deduplicates feed URLs", () => {
    const result = parseFeedsJson(
      JSON.stringify([
        { feedUrl: "https://example.com/rss", label: "Example" },
        { feedUrl: "https://example.com/rss", label: "Dup" },
      ]),
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]?.label, "Example");
  });

  it("rejects invalid URLs", () => {
    assert.throws(() => parseFeedsJson(JSON.stringify([{ feedUrl: "not-a-url" }])));
  });
});

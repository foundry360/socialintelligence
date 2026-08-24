import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatApprovedBaselineSummary,
  formatProjectMissionFocus,
  mergeTenantKnowledgeForLlm,
} from "./context-bundle-format.ts";

describe("formatApprovedBaselineSummary", () => {
  it("includes version and key fields", () => {
    const text = formatApprovedBaselineSummary({
      version: 2,
      summary: "Strong POV in healthcare.",
      strengths: ["Clear positioning"],
      weaknesses: ["Limited proof"],
      gaps: ["Case studies"],
      povCoverageNotes: "POVs are well covered.",
      trustMixNotes: "Need more third-party proof.",
      recommendedActions: ["Publish baseline outcomes"],
    });

    assert.match(text, /Authority Baseline v2/);
    assert.match(text, /Strong POV in healthcare/);
    assert.match(text, /Clear positioning/);
  });
});

describe("mergeTenantKnowledgeForLlm", () => {
  it("merges structured knowledge and baseline", () => {
    const merged = mergeTenantKnowledgeForLlm(
      "Company: Acme",
      "Authority Baseline v1 (approved)\nSummary: Ready",
    );
    assert.match(merged, /Company: Acme/);
    assert.match(merged, /Approved authority baseline/);
  });

  it("returns placeholder when both are empty", () => {
    assert.equal(mergeTenantKnowledgeForLlm("", ""), "(No structured profile yet.)");
  });
});

describe("formatProjectMissionFocus", () => {
  it("includes title and default focus", () => {
    const text = formatProjectMissionFocus({
      title: "Healthcare AI",
      description: "",
    });
    assert.match(text, /Healthcare AI/);
    assert.match(text, /explore this topic in depth/);
  });
});

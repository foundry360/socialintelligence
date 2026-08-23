#!/usr/bin/env node
/**
 * Seed a sample authority baseline for tenants that do not have one yet.
 * Usage: pnpm seed:baseline
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SAMPLE = {
  status: "awaiting_approval",
  summary:
    "The organization shows credible domain expertise in B2B thought leadership and content strategy, with a clear point of view on authority-building over volume publishing. Knowledge coverage is strongest on positioning and capabilities, but proof assets and market questions need more depth before the team can claim full-category authority.",
  strengths: [
    "Distinct positioning around authority and expertise, not generic AI content.",
    "Structured knowledge spine with capabilities, personas, and POVs defined.",
    "Editorial workflow assumes human approval, which supports trust and quality.",
    "Multi-tenant product architecture supports repeatable client delivery.",
  ],
  weaknesses: [
    "Proof and evidence library is thin relative to stated capabilities.",
    "POV coverage does not yet span all priority industries.",
    "Limited public-facing content demonstrating the methodology in practice.",
    "Terminology and messaging consistency across assets is uneven.",
  ],
  gaps: [
    "No approved messaging plan downstream of baseline yet.",
    "Case studies and customer outcomes are under-documented in Knowledge.",
    "Market questions lack answers tied to published POVs.",
    "Competitive differentiation is implied but not always explicit in copy.",
  ],
  pov_coverage_notes:
    "Core POVs on authority-first content and knowledge-led strategy are well represented. Industry-specific POVs and objection-handling angles are sparse. Recommend one POV per priority persona before scaling content ops.",
  trust_mix_notes:
    "Trust signals lean on framework and process narrative. Add third-party proof, named customer outcomes, and practitioner credentials to balance opinion with evidence. Avoid over-indexing on product claims without supporting artifacts.",
  recommended_actions: [
    "Complete Proof & Evidence with at least two case-style entries per core capability.",
    "Draft answers for top market questions and link each to a POV.",
    "Approve this baseline, then generate a Messaging Plan before content packages.",
    "Publish one flagship article that demonstrates the authority methodology end to end.",
  ],
  citation_source_ids: [],
};

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: tenants, error: tenantError } = await supabase
  .from("tenants")
  .select("id, name, slug")
  .is("deleted_at", null);

if (tenantError) {
  console.error(tenantError.message);
  process.exit(1);
}

let seeded = 0;
let skipped = 0;

for (const tenant of tenants ?? []) {
  const { count, error: countError } = await supabase
    .from("authority_baselines")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null);

  if (countError) {
    console.error(`[${tenant.slug}] ${countError.message}`);
    continue;
  }

  if ((count ?? 0) > 0) {
    console.log(`[${tenant.slug}] skipped (already has ${count} baseline(s))`);
    skipped += 1;
    continue;
  }

  const { data: workspace } = await supabase
    .from("knowledge_workspaces")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("is_primary", true)
    .maybeSingle();

  const { data: row, error: insertError } = await supabase
    .from("authority_baselines")
    .insert({
      tenant_id: tenant.id,
      workspace_id: workspace?.id ?? null,
      version: 1,
      status: SAMPLE.status,
      summary: SAMPLE.summary,
      strengths: SAMPLE.strengths,
      weaknesses: SAMPLE.weaknesses,
      gaps: SAMPLE.gaps,
      pov_coverage_notes: SAMPLE.pov_coverage_notes,
      trust_mix_notes: SAMPLE.trust_mix_notes,
      recommended_actions: SAMPLE.recommended_actions,
      citation_source_ids: SAMPLE.citation_source_ids,
    })
    .select("id, version, status")
    .single();

  if (insertError) {
    console.error(`[${tenant.slug}] ${insertError.message}`);
    continue;
  }

  console.log(
    `[${tenant.slug}] seeded baseline v${row.version} (${row.status}) id=${row.id}`,
  );
  seeded += 1;
}

console.log(`Done. Seeded ${seeded}, skipped ${skipped}.`);

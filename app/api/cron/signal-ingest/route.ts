import { NextResponse } from "next/server";
import { runSignalIngest } from "@/lib/signals/ingest/run-ingest";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  return headerSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await runSignalIngest();
    return NextResponse.json({
      ok: true,
      tenantsProcessed: summary.tenantsProcessed,
      runs: summary.runs.map((run) => ({
        tenantId: run.tenantId,
        runId: run.runId,
        stats: run.stats,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Signal ingest failed.",
      },
      { status: 500 },
    );
  }
}

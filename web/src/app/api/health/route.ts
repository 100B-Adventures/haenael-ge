import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let database: "ok" | "degraded" = "degraded";

  if (supabaseUrl && anonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/goal_public?select=id&limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      database = response.ok ? "ok" : "degraded";
    } catch {
      database = "degraded";
    }
  }

  const status = database === "ok" ? "ok" : "degraded";
  return NextResponse.json(
    {
      status,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
      database,
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: status === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

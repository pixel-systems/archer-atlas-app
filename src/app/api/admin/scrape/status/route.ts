import { NextResponse, type NextRequest } from "next/server";
import { getCurrentRole, getCurrentUser } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ScrapeSource } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SOURCES: ScrapeSource[] = [
  "members",
  "member_details",
  "awards",
  "results_index",
  "result_pdf",
  "all",
];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const role = await getCurrentRole();
  if (!user || role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  const sourceRaw = url.searchParams.get("source");

  const db = createSupabaseAdminClient();

  if (runId) {
    const { data, error } = await db
      .from("scrape_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ run: data ?? null });
  }

  let q = db.from("scrape_runs").select("*").order("started_at", { ascending: false }).limit(1);
  if (sourceRaw && VALID_SOURCES.includes(sourceRaw as ScrapeSource)) {
    q = q.eq("source", sourceRaw as ScrapeSource);
  }
  const { data, error } = await q.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ run: data ?? null });
}

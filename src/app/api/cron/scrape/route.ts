import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { runAllScrapes } from "@/lib/scrapers/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when configured.
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const outcomes = await runAllScrapes(null);
  return NextResponse.json({ outcomes });
}

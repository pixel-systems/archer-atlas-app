import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getCurrentRole } from "@/lib/auth/roles";
import {
  runAllScrapes,
  runAwardsScrape,
  runMembersScrape,
  runResultsIndexScrape,
} from "@/lib/scrapers/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const role = await getCurrentRole();
  if (!user || role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const source = (url.searchParams.get("source") ?? "all").toLowerCase();

  switch (source) {
    case "members":
      return NextResponse.json({ outcome: await runMembersScrape(user.id) });
    case "awards":
      return NextResponse.json({ outcome: await runAwardsScrape(user.id) });
    case "results_index":
    case "results":
      return NextResponse.json({ outcome: await runResultsIndexScrape(user.id) });
    case "all":
      return NextResponse.json({ outcomes: await runAllScrapes(user.id) });
    default:
      return NextResponse.json({ error: `unknown source: ${source}` }, { status: 400 });
  }
}

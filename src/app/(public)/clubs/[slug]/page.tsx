import { notFound } from "next/navigation";
import Link from "next/link";
import { createHash } from "node:crypto";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ClubMembersTable,
  type ClubMember,
  type ClubResultRow,
  type MemberAggregate,
} from "./club-members";

export const revalidate = 60;

function competitionId(name: string | null, achievedOn: string | null): string | null {
  if (!name && !achievedOn) return null;
  return createHash("md5")
    .update(`${name ?? ""}|${achievedOn ?? ""}`)
    .digest("hex");
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!club) notFound();

  const { data: membersRaw } = await supabase
    .from("members")
    .select(
      "id, license_number, first_name, last_name, birth_year, category_target, category_3d, detail_scraped_at, detail_url",
    )
    .eq("club_id", club.id)
    .order("last_name");

  const members: ClubMember[] = (membersRaw ?? []) as ClubMember[];
  const memberIds = members.map((m) => m.id);

  // Determine "last year" = the most recent season with any result for these members.
  let season: number | null = null;
  if (memberIds.length > 0) {
    const { data: seasonRow } = await supabase
      .from("member_season_results")
      .select("season")
      .in("member_id", memberIds)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle();
    season = seasonRow?.season ?? null;
  }

  let resultsByMember: Record<string, ClubResultRow[]> = {};
  let aggregates: Record<string, MemberAggregate> = {};

  if (season != null && memberIds.length > 0) {
    const { data: results } = await supabase
      .from("member_season_results")
      .select(
        "id, member_id, score, achieved_on, competition_name, discipline, setup, category, division, is_season_max, season",
      )
      .in("member_id", memberIds)
      .eq("season", season);

    const all = ((results ?? []) as Omit<ClubResultRow, "competition_id">[]).map((r) => ({
      ...r,
      competition_id: competitionId(r.competition_name, r.achieved_on),
    })) as ClubResultRow[];
    resultsByMember = all.reduce<Record<string, ClubResultRow[]>>((acc, r) => {
      (acc[r.member_id] ??= []).push(r);
      return acc;
    }, {});

    aggregates = members.reduce<Record<string, MemberAggregate>>((acc, m) => {
      const rows = resultsByMember[m.id] ?? [];
      let total = 0;
      let best: number | null = null;
      let last: string | null = null;
      for (const r of rows) {
        if (typeof r.score === "number") {
          total += r.score;
          if (best == null || r.score > best) best = r.score;
        }
        if (r.achieved_on && (!last || r.achieved_on > last)) last = r.achieved_on;
      }
      acc[m.id] = {
        member: m,
        totalPoints: total,
        bestScore: best,
        entries: rows.length,
        lastCompetitionOn: last,
      };
      return acc;
    }, {});
  }

  return (
    <PageShell>
      <Link
        href="/clubs"
        className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
      >
        ← Späť na kluby
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{club.name}</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">
        {members.length} členov
      </p>

      <ClubMembersTable
        members={members}
        aggregates={aggregates}
        resultsByMember={resultsByMember}
        season={season}
      />
    </PageShell>
  );
}

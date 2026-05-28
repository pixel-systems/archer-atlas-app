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

function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
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
    .select(
      "id, name, slug, code, logo_url, website_url, contact_name, contact_phone",
    )
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

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {club.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.logo_url}
              alt={club.name}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <span className="font-mono text-xs text-zinc-400">
              {club.code ?? "—"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{club.name}</h1>
            {club.code && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {club.code}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {members.length} členov
          </p>

          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {club.website_url && (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-zinc-500">Web</dt>
                <dd className="min-w-0 truncate">
                  <a
                    href={club.website_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {prettyUrl(club.website_url)}
                  </a>
                </dd>
              </div>
            )}
            {club.contact_name && (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-zinc-500">Kontakt</dt>
                <dd className="min-w-0">{club.contact_name}</dd>
              </div>
            )}
            {club.contact_phone && (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-zinc-500">Telefón</dt>
                <dd className="min-w-0">
                  <a
                    href={`tel:${club.contact_phone.replace(/\s+/g, "")}`}
                    className="hover:underline"
                  >
                    {club.contact_phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="mt-6">
        <ClubMembersTable
          members={members}
          aggregates={aggregates}
          resultsByMember={resultsByMember}
          season={season}
        />
      </div>
    </PageShell>
  );
}

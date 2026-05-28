import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trophy } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface MemberDetailPageProps {
  params: Promise<{ license: string }>;
  searchParams: Promise<{ year?: string }>;
}

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({ params, searchParams }: MemberDetailPageProps) {
  const { license } = await params;
  const { year: yearStr } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select(
      "id, slz_id, license_number, first_name, last_name, birth_year, category_target, category_3d, last_scraped_at, detail_scraped_at, detail_url, club:clubs(name, slug)",
    )
    .eq("license_number", license)
    .maybeSingle();

  if (memberError) {
    return (
      <PageShell>
        <ErrorBanner message={memberError.message} />
      </PageShell>
    );
  }
  if (!member) notFound();

  const club = Array.isArray(member.club) ? member.club[0] : member.club;

  // Personal bests + all season results in two queries.
  const [{ data: personalBests }, { data: seasonResults }] = await Promise.all([
    supabase
      .from("member_personal_bests")
      .select("*")
      .eq("member_id", member.id)
      .order("score", { ascending: false }),
    supabase
      .from("member_season_results")
      .select("*")
      .eq("member_id", member.id)
      .order("achieved_on", { ascending: false }),
  ]);

  const years = Array.from(
    new Set((seasonResults ?? []).map((r) => r.season).filter((s): s is number => s != null)),
  ).sort((a, b) => b - a);
  const requestedYear = yearStr ? Number.parseInt(yearStr, 10) : NaN;
  const selectedYear =
    Number.isFinite(requestedYear) && years.includes(requestedYear)
      ? requestedYear
      : (years[0] ?? null);
  const yearRows =
    selectedYear == null
      ? []
      : (seasonResults ?? []).filter((r) => r.season === selectedYear);

  const enriched = member.detail_scraped_at != null;

  return (
    <PageShell>
      <Link
        href="/members"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Späť na zoznam
      </Link>

      <header className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {member.last_name} {member.first_name}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {club ? (
                <Link
                  href={`/clubs/${club.slug}`}
                  className="text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {club.name}
                </Link>
              ) : (
                "Bez klubu"
              )}{" "}
              · Licencia <span className="font-mono">{member.license_number}</span>
              {member.birth_year ? ` · ${member.birth_year}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {member.category_target && (
                <Badge>Terč: {member.category_target}</Badge>
              )}
              {member.category_3d && <Badge>3D: {member.category_3d}</Badge>}
              {enriched ? (
                <Badge tone="success">
                  Detail aktualizovaný{" "}
                  {new Date(member.detail_scraped_at!).toLocaleString("sk-SK")}
                </Badge>
              ) : (
                <Badge tone="warn">Detail ešte nebol stiahnutý</Badge>
              )}
            </div>
          </div>
          {member.detail_url && (
            <a
              href={member.detail_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Otvoriť slz.sk <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </header>

      {!enriched ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Pre tohto člena ešte nebola stiahnutá podrobnosť. Admin môže spustiť scan
          v sekcii{" "}
          <Link className="underline" href="/admin/scraping">
            Admin → Scraping
          </Link>{" "}
          (tlačidlo „Detaily členov").
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Trophy className="h-5 w-5 text-amber-500" /> Osobné maximá
            </h2>
            {(personalBests ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">Žiadne osobné maximá zaznamenané.</p>
            ) : (
              <ResultsTable rows={personalBests ?? []} highlightTopScore />
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Výsledky v sezóne</h2>
              {years.length > 0 && (
                <YearTabs license={member.license_number} years={years} current={selectedYear} />
              )}
            </div>
            {selectedYear == null ? (
              <p className="text-sm text-zinc-500">Žiadne výsledky.</p>
            ) : yearRows.length === 0 ? (
              <p className="text-sm text-zinc-500">V sezóne {selectedYear} žiadne výsledky.</p>
            ) : (
              <ResultsTable rows={yearRows} />
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}

interface ResultRow {
  id: string;
  score: number | null;
  achieved_on: string | null;
  competition_name: string | null;
  discipline: string | null;
  setup: string | null;
  category: string | null;
  division: string | null;
  is_season_max?: boolean;
}

function ResultsTable({
  rows,
  highlightTopScore = false,
}: {
  rows: ResultRow[];
  highlightTopScore?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          <tr>
            <Th>Body</Th>
            <Th>Dátum</Th>
            <Th>Súťaž</Th>
            <Th>Disciplína</Th>
            <Th>Nastavenie</Th>
            <Th>Kategória</Th>
            <Th>Divízia</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <Td
                className={`font-mono font-semibold ${
                  highlightTopScore ? "text-amber-600 dark:text-amber-400" : ""
                }`}
              >
                {r.score ?? "—"}
                {r.is_season_max && (
                  <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    Max
                  </span>
                )}
              </Td>
              <Td className="text-zinc-500">
                {r.achieved_on
                  ? new Date(r.achieved_on).toLocaleDateString("sk-SK")
                  : "—"}
              </Td>
              <Td>{r.competition_name ?? "—"}</Td>
              <Td className="text-zinc-600 dark:text-zinc-300">{r.discipline ?? "—"}</Td>
              <Td className="text-xs text-zinc-500">{r.setup ?? "—"}</Td>
              <Td>{r.category ?? "—"}</Td>
              <Td>{r.division ?? "—"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YearTabs({
  license,
  years,
  current,
}: {
  license: string;
  years: number[];
  current: number | null;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {years.map((y) => (
        <Link
          key={y}
          href={`/members/${license}?year=${y}`}
          scroll={false}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            y === current
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          {y}
        </Link>
      ))}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn";
}) {
  const map = {
    neutral:
      "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    success:
      "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    warn: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  } as const;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      Chyba pri načítaní: {message}
    </div>
  );
}

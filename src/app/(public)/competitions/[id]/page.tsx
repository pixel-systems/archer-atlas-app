import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface CompetitionDetailProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ division?: string; category?: string }>;
}

export const revalidate = 60;

export default async function CompetitionDetailPage({
  params,
  searchParams,
}: CompetitionDetailProps) {
  const { id } = await params;
  const { division: divFilter = "", category: catFilter = "" } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [{ data: overview }, { data: entries, error: entriesErr }] = await Promise.all([
    supabase.from("competition_overview").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("competition_entries")
      .select("*")
      .eq("competition_id", id)
      .order("score", { ascending: false, nullsFirst: false }),
  ]);

  if (!overview) notFound();

  const allEntries = entries ?? [];

  const divisions = Array.from(
    new Set(allEntries.map((e) => e.division).filter((s): s is string => !!s)),
  ).sort();
  const categories = Array.from(
    new Set(allEntries.map((e) => e.category).filter((s): s is string => !!s)),
  ).sort();

  const filtered = allEntries.filter((e) => {
    if (divFilter && e.division !== divFilter) return false;
    if (catFilter && e.category !== catFilter) return false;
    return true;
  });

  const ranked = filtered.map((e, i) => ({ ...e, rank: i + 1 }));

  const buildHref = (overrides: { division?: string; category?: string }) => {
    const params = new URLSearchParams();
    const d = overrides.division ?? divFilter;
    const c = overrides.category ?? catFilter;
    if (d) params.set("division", d);
    if (c) params.set("category", c);
    const qs = params.toString();
    return qs ? `/competitions/${id}?${qs}` : `/competitions/${id}`;
  };

  return (
    <PageShell>
      <Link
        href="/competitions"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Späť na zoznam súťaží
      </Link>

      <header className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-bold tracking-tight">{overview.name}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {overview.held_on ? new Date(overview.held_on).toLocaleDateString("sk-SK") : "Dátum neznámy"}
          {overview.season ? ` · sezóna ${overview.season}` : ""}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Účastníci" value={overview.athletes_count} />
          <Stat label="Kluby" value={overview.clubs_count} />
          <Stat label="Zápisov" value={overview.entries_count} />
          <Stat label="Top skóre" value={overview.top_score ?? "—"} highlight />
        </div>
      </header>

      {(divisions.length > 0 || categories.length > 0) && (
        <div className="mb-4 flex flex-wrap items-start gap-4 text-xs">
          {divisions.length > 0 && (
            <FilterGroup
              label="Divízia"
              all={divisions}
              current={divFilter}
              buildHref={(v) => buildHref({ division: v })}
            />
          )}
          {categories.length > 0 && (
            <FilterGroup
              label="Kategória"
              all={categories}
              current={catFilter}
              buildHref={(v) => buildHref({ category: v })}
            />
          )}
        </div>
      )}

      {entriesErr ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Chyba pri načítaní: {entriesErr.message}
        </div>
      ) : ranked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          Žiadne zápisy pre zvolený filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <Th>#</Th>
                <Th>Body</Th>
                <Th>Strelec</Th>
                <Th>Klub</Th>
                <Th>Divízia</Th>
                <Th>Kategória</Th>
                <Th>Nastavenie</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {ranked.map((e) => (
                <tr key={e.entry_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <Td className="text-xs text-zinc-500">{e.rank}</Td>
                  <Td className="font-mono font-semibold">
                    {e.score ?? "—"}
                    {e.is_season_max && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        Max
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Link
                      href={`/members/${encodeURIComponent(e.license_number)}`}
                      prefetch={false}
                      className="text-zinc-900 hover:text-emerald-700 hover:underline dark:text-white dark:hover:text-emerald-400"
                    >
                      {e.last_name} {e.first_name}
                    </Link>
                  </Td>
                  <Td>
                    {e.club_slug && e.club_name ? (
                      <Link
                        href={`/clubs/${e.club_slug}`}
                        prefetch={false}
                        className="text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {e.club_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{e.division ?? "—"}</Td>
                  <Td>{e.category ?? "—"}</Td>
                  <Td className="text-xs text-zinc-500">{e.setup ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className={`mt-1 flex items-center gap-1 text-2xl font-bold ${
          highlight ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {highlight && <Trophy className="h-5 w-5" />}
        {value}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  all,
  current,
  buildHref,
}: {
  label: string;
  all: string[];
  current: string;
  buildHref: (v: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-zinc-500">{label}:</span>
      <Link
        href={buildHref("")}
        prefetch={false}
        className={`rounded-md border px-2 py-0.5 font-medium ${
          !current
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        }`}
      >
        všetko
      </Link>
      {all.map((v) => (
        <Link
          key={v}
          href={buildHref(v)}
          prefetch={false}
          className={`rounded-md border px-2 py-0.5 font-medium ${
            v === current
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          {v}
        </Link>
      ))}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

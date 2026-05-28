import Link from "next/link";
import { ChevronLeft, ChevronRight, Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

interface CompetitionsPageProps {
  searchParams: Promise<{ q?: string; page?: string; season?: string }>;
}

export const revalidate = 60;

const PAGE_SIZE = 40;

export default async function CompetitionsPage({ searchParams }: CompetitionsPageProps) {
  const { q = "", page: pageStr, season: seasonStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const season = seasonStr ? Number.parseInt(seasonStr, 10) : NaN;
  const supabase = await createSupabaseServerClient();
  const t = await getT();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("competition_overview")
    .select("*", { count: "exact" })
    .order("held_on", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (q.trim().length > 0) {
    query = query.ilike("name", `%${q.trim()}%`);
  }
  if (Number.isFinite(season)) {
    query = query.eq("season", season);
  }

  const [{ data: rows, error, count }, { data: seasonRows }] = await Promise.all([
    query,
    supabase
      .from("competition_overview")
      .select("season")
      .not("season", "is", null)
      .order("season", { ascending: false })
      .limit(500),
  ]);

  const seasons = Array.from(
    new Set((seasonRows ?? []).map((r) => r.season).filter((s): s is number => s != null)),
  );

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (overrides: { page?: number; season?: string }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const p = overrides.page ?? page;
    if (p > 1) params.set("page", String(p));
    const s = overrides.season ?? (Number.isFinite(season) ? String(season) : "");
    if (s) params.set("season", s);
    const qs = params.toString();
    return qs ? `/competitions?${qs}` : "/competitions";
  };

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.competitions.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t.competitions.subtitle} {total} {t.common.total.toLowerCase()}.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t.common.searchPlaceholder}
            className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {Number.isFinite(season) && <input type="hidden" name="season" value={season} />}
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            {t.common.search}
          </button>
        </form>
      </header>

      {seasons.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1 text-xs">
          <span className="mr-2 text-zinc-500">{t.competitions.season}:</span>
          <Link
            href={buildHref({ season: "", page: 1 })}
            prefetch={false}
            className={`rounded-md border px-2.5 py-1 font-medium ${
              !Number.isFinite(season)
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            —
          </Link>
          {seasons.map((y) => (
            <Link
              key={y}
              href={buildHref({ season: String(y), page: 1 })}
              prefetch={false}
              className={`rounded-md border px-2.5 py-1 font-medium ${
                y === season
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      )}

      {error ? (
        <ErrorBanner message={error.message} />
      ) : (rows?.length ?? 0) === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <Th>{t.competitions.date}</Th>
                  <Th>{t.competitions.name}</Th>
                  <Th>{t.competitions.athletes}</Th>
                  <Th>{t.competitions.clubs}</Th>
                  <Th>{t.competitions.topScore}</Th>
                  <Th>{t.competitions.disciplines}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(rows ?? []).map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <Td className="whitespace-nowrap text-zinc-500">
                      {r.held_on ? new Date(r.held_on).toLocaleDateString("sk-SK") : "—"}
                    </Td>
                    <Td>
                      <Link
                        href={`/competitions/${encodeURIComponent(r.id)}`}
                        prefetch={false}
                        className="font-medium text-zinc-900 hover:text-emerald-700 hover:underline dark:text-white dark:hover:text-emerald-400"
                      >
                        {r.name}
                      </Link>
                    </Td>
                    <Td className="text-zinc-600 dark:text-zinc-300">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        {r.athletes_count}
                        <span className="text-xs text-zinc-400">/ {r.entries_count} {t.competitions.entries}</span>
                      </span>
                    </Td>
                    <Td className="text-zinc-600 dark:text-zinc-300">{r.clubs_count}</Td>
                    <Td className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" />
                        {r.top_score ?? "—"}
                      </span>
                    </Td>
                    <Td className="text-xs text-zinc-500">
                      {(r.disciplines ?? []).slice(0, 3).join(", ") || "—"}
                      {(r.disciplines ?? []).length > 3
                        ? ` +${(r.disciplines ?? []).length - 3}`
                        : ""}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                {t.common.page} {page} {t.common.of} {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <PagerLink href={buildHref({ page: page - 1 })} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> {t.common.previous}
                </PagerLink>
                <PagerLink href={buildHref({ page: page + 1 })} disabled={page >= totalPages}>
                  {t.common.next} <ChevronRight className="h-4 w-4" />
                </PagerLink>
              </div>
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}

function PagerLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const classes =
    "inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";
  if (disabled) {
    return (
      <span className={`${classes} cursor-not-allowed text-zinc-400 dark:text-zinc-600`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      prefetch={false}
      className={`${classes} bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
    >
      {children}
    </Link>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
      Žiadne súťaže. Admin môže obnoviť prehľad v sekcii{" "}
      <Link className="underline" href="/admin/scraping">
        Admin → Scraping
      </Link>{" "}
      (tlačidlo „Prehľad súťaží").
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      Chyba pri načítaní: {message}
    </div>
  );
}

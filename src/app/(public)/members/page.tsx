import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, CircleDashed } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

interface MembersPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

// Cached for 60s so casual navigation doesn't slam Supabase.
export const revalidate = 60;

const PAGE_SIZE = 50;

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const { q = "", page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const supabase = await createSupabaseServerClient();
  const t = await getT();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("members")
    .select(
      "id, license_number, first_name, last_name, birth_year, category_target, category_3d, detail_scraped_at, club:clubs(name, slug)",
      { count: "exact" },
    )
    .order("last_name", { ascending: true })
    .range(from, to);

  if (q.trim().length > 0) {
    const pattern = `%${q.trim()}%`;
    query = query.or(
      `last_name.ilike.${pattern},first_name.ilike.${pattern},license_number.ilike.${pattern}`,
    );
  }

  const { data: members, error, count } = await query;

  // Global enriched-count (across ALL members, not just this page). HEAD query, cheap.
  const { count: globalEnrichedCount } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .not("detail_scraped_at", "is", null);
  const globalEnriched = globalEnrichedCount ?? 0;

  const total = count ?? 0;
  const pageRowsEnriched = (members ?? []).filter((m) => m.detail_scraped_at != null).length;
  const globalPct = total > 0 ? Math.round((globalEnriched / total) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/members?${qs}` : "/members";
  };

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.members.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t.members.subtitle}
            {total > 0 && (
              <>
                {" "}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> {pageRowsEnriched} / {members?.length ?? 0} {t.members.onPage}
                </span>{" "}
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {globalEnriched.toLocaleString()} / {total.toLocaleString()} {t.members.overallEnriched} ({globalPct}%)
                </span>
              </>
            )}
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
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            {t.common.search}
          </button>
        </form>
      </header>

      {error ? (
        <ErrorBanner message={error.message} />
      ) : (members?.length ?? 0) === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <Th>{t.members.headerDetail}</Th>
                  <Th>{t.members.headerName}</Th>
                  <Th>{t.members.headerYear}</Th>
                  <Th>{t.members.headerClub}</Th>
                  <Th>{t.members.headerLicense}</Th>
                  <Th>{t.members.headerCategoryTarget}</Th>
                  <Th>{t.members.headerCategory3D}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(members ?? []).map((m) => {
                  const club = Array.isArray(m.club) ? m.club[0] : m.club;
                  const enriched = m.detail_scraped_at != null;
                  return (
                    <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <Td>
                        {enriched ? (
                          <span title={t.members.detailScraped}>
                            <CheckCircle2
                              className="h-4 w-4 text-emerald-600"
                              aria-label={t.members.detailScraped}
                            />
                          </span>
                        ) : (
                          <span title={t.members.detailMissing}>
                            <CircleDashed
                              className="h-4 w-4 text-zinc-400"
                              aria-label={t.members.detailMissing}
                            />
                          </span>
                        )}
                      </Td>
                      <Td>
                        <Link
                          href={`/members/${encodeURIComponent(m.license_number)}`}
                          prefetch={false}
                          className="font-medium text-zinc-900 hover:text-emerald-700 hover:underline dark:text-white dark:hover:text-emerald-400"
                        >
                          {m.last_name} {m.first_name}
                        </Link>
                      </Td>
                      <Td className="text-zinc-500">{m.birth_year ?? "—"}</Td>
                      <Td>
                        {club ? (
                          <Link
                            href={`/clubs/${club.slug}`}
                            prefetch={false}
                            className="text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            {club.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td className="font-mono text-xs">{m.license_number}</Td>
                      <Td className="text-zinc-600 dark:text-zinc-300">
                        {m.category_target ?? "—"}
                      </Td>
                      <Td className="text-zinc-600 dark:text-zinc-300">{m.category_3d ?? "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                {t.common.page} {page} {t.common.of} {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <PagerLink href={buildHref(page - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> {t.common.previous}
                </PagerLink>
                <PagerLink href={buildHref(page + 1)} disabled={page >= totalPages}>
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
      Žiadni členovia neboli nájdení. Ak je databáza prázdna, admin môže spustiť scrape v sekcii{" "}
      <Link className="underline" href="/admin/scraping">
        Admin → Scraping
      </Link>
      .
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

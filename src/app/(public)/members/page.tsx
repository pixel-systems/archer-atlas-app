import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface MembersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const dynamic = "force-dynamic";

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const { q = "" } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("members")
    .select(
      "id, license_number, first_name, last_name, birth_year, category_target, category_3d, detail_scraped_at, club:clubs(name, slug)",
    )
    .order("last_name", { ascending: true })
    .limit(200);

  if (q.trim().length > 0) {
    const pattern = `%${q.trim()}%`;
    query = query.or(
      `last_name.ilike.${pattern},first_name.ilike.${pattern},license_number.ilike.${pattern}`,
    );
  }

  const { data: members, error } = await query;

  const enrichedCount = (members ?? []).filter((m) => m.detail_scraped_at != null).length;
  const total = members?.length ?? 0;

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Členovia</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Registrovaní strelci v Slovenskom lukostreleckom zväze.
            {total > 0 && (
              <>
                {" "}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> {enrichedCount} / {total} s detailom
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
            placeholder="Hľadať podľa mena alebo licencie…"
            className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            Hľadať
          </button>
        </form>
      </header>

      {error ? (
        <ErrorBanner message={error.message} />
      ) : (members?.length ?? 0) === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <Th>Detail</Th>
                <Th>Meno</Th>
                <Th>Rok</Th>
                <Th>Klub</Th>
                <Th>Licencia</Th>
                <Th>Kategória terč</Th>
                <Th>Kategória 3D</Th>
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
                        <span title="Detail stiahnutý">
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-600"
                            aria-label="Detail stiahnutý"
                          />
                        </span>
                      ) : (
                        <span title="Detail ešte nestiahnutý">
                          <CircleDashed
                            className="h-4 w-4 text-zinc-400"
                            aria-label="Detail ešte nestiahnutý"
                          />
                        </span>
                      )}
                    </Td>
                    <Td>
                      <Link
                        href={`/members/${encodeURIComponent(m.license_number)}`}
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
                          className="text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          {club.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="font-mono text-xs">{m.license_number}</Td>
                    <Td className="text-zinc-600 dark:text-zinc-300">{m.category_target ?? "—"}</Td>
                    <Td className="text-zinc-600 dark:text-zinc-300">{m.category_3d ?? "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
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
      Žiadni členovia neboli nájdení. Ak je databáza prázdna, admin môže spustiť scrape
      v sekcii <Link className="underline" href="/admin/scraping">Admin → Scraping</Link>.
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

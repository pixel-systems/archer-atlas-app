import Link from "next/link";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, slug, members:members(count)")
    .order("name");

  return (
    <PageShell>
      <h1 className="text-3xl font-bold tracking-tight">Kluby</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">
        Lukostrelecké kluby registrované v SLZ.
      </p>

      {(clubs?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          Žiadne kluby. Spustite scrape v admin sekcii.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(clubs ?? []).map((c) => {
            const count = Array.isArray(c.members) ? (c.members[0]?.count ?? 0) : 0;
            return (
              <Link
                key={c.id}
                href={`/clubs/${c.slug}`}
                className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="font-semibold">{c.name}</div>
                <div className="mt-1 text-xs text-zinc-500">{count} členov</div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

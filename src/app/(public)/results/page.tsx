import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: comps } = await supabase
    .from("competitions")
    .select("id, name, held_on, season, source_url, kind")
    .order("held_on", { ascending: false, nullsFirst: false })
    .limit(100);

  // Group by season
  const grouped = new Map<string, typeof comps>();
  (comps ?? []).forEach((c) => {
    const key = String(c.season ?? "Nezaradené");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  });

  return (
    <PageShell>
      <h1 className="text-3xl font-bold tracking-tight">Výsledky súťaží</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">
        Odkazy na PDF výsledky zo súťaží evidovaných SLZ.
      </p>

      {(comps?.length ?? 0) === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([season, items]) => (
            <section key={season}>
              <h2 className="mb-3 text-xl font-semibold tracking-tight">Sezóna {season}</h2>
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {(items ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-500">
                        {c.held_on ?? "dátum neuvedený"}
                        {c.kind ? ` · ${c.kind}` : ""}
                      </div>
                    </div>
                    <a
                      href={c.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Otvoriť <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
      Žiadne súťaže neboli načítané. Spustite scrape v admin sekcii.
    </div>
  );
}

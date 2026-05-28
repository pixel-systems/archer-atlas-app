import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScrapeControls } from "./scrape-controls";

export const dynamic = "force-dynamic";

export default async function AdminScrapingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: runs } = await supabase
    .from("scrape_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Spustiť scrape</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          Manuálne spustenie. Plánovaný (cron) beh prebieha denne o 03:00 UTC.
        </p>
        <ScrapeControls resumeSources={["all", "members", "member_details", "awards", "results_index"]} />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">História behov</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Začiatok</th>
                <th className="px-4 py-2.5 font-medium">Zdroj</th>
                <th className="px-4 py-2.5 font-medium">Stav</th>
                <th className="px-4 py-2.5 font-medium">Spracované</th>
                <th className="px-4 py-2.5 font-medium">Chyby</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(runs ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    Žiadne behy zatiaľ.
                  </td>
                </tr>
              )}
              {(runs ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {new Date(r.started_at).toLocaleString("sk-SK")}
                  </td>
                  <td className="px-4 py-2.5">{r.source}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-300">
                    {r.items_processed}
                    {r.items_total ? ` / ${r.items_total}` : ""}
                    {r.items_failed > 0 ? ` (${r.items_failed} chýb)` : ""}
                    {r.status === "running" && r.current_item ? (
                      <div className="mt-0.5 truncate text-xs text-zinc-500" title={r.current_item}>
                        → {r.current_item}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {r.errors ? JSON.stringify(r.errors).slice(0, 80) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    partial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>{status}</span>
  );
}

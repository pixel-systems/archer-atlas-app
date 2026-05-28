import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScrapeControls } from "./scrape-controls";

export const dynamic = "force-dynamic";

export default async function AdminScrapingPage() {
  const supabase = await createSupabaseServerClient();

  // Member detail progress: total members vs already enriched (detail_scraped_at not null),
  // and stale ones (>7 days). Uses HEAD count queries to avoid loading rows.
  const STALE_DAYS = 7;
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const BATCH_SIZE = 30;

  const [{ count: totalMembersCount }, { count: enrichedCount }, { count: staleCount }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .not("slz_id", "is", null),
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .not("slz_id", "is", null)
        .not("detail_scraped_at", "is", null),
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .not("slz_id", "is", null)
        .lt("detail_scraped_at", staleCutoff),
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .not("slz_id", "is", null)
        .is("detail_scraped_at", null),
    ]);

  const totalMembers = totalMembersCount ?? 0;
  const enriched = enrichedCount ?? 0;
  const stale = staleCount ?? 0;
  const pending = pendingCount ?? 0;
  const needsScrape = pending + stale;
  const pct = totalMembers > 0 ? Math.round((enriched / totalMembers) * 100) : 0;
  const estimatedBatches = Math.ceil(needsScrape / BATCH_SIZE);

  const { data: runs } = await supabase
    .from("scrape_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Pokrok scraping-u detailov členov</h2>
          <span className="text-xs text-zinc-500">
            Dávka: {BATCH_SIZE} / beh · Stale po {STALE_DAYS} dňoch
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Členov celkom" value={totalMembers} tone="zinc" />
          <StatCard label="So stiahnutým detailom" value={enriched} sub={`${pct}%`} tone="emerald" />
          <StatCard label="Bez detailu" value={pending} tone="amber" />
          <StatCard label="Stale (>{STALE_DAYS} dní)" value={stale} tone="orange" />
          <StatCard
            label="Odhadovaných behov"
            value={estimatedBatches}
            sub={`${needsScrape} členov`}
            tone="blue"
          />
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
            aria-label={`Pokrok ${pct}%`}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {needsScrape > 0
            ? `Zostáva ~${estimatedBatches} ${pluralBeh(estimatedBatches)} po ${BATCH_SIZE} členoch, aby boli všetky detaily čerstvé.`
            : "Všetky detaily členov sú aktuálne. 🎉"}
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Spustiť scrape</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          Manuálne spustenie. Plánovaný (cron) beh prebieha denne o 03:00 UTC.
        </p>
        <ScrapeControls resumeSources={["all", "members", "member_details", "awards", "results_index", "competitions", "club_profiles"]} />
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

function pluralBeh(n: number): string {
  if (n === 1) return "beh";
  if (n >= 2 && n <= 4) return "behy";
  return "behov";
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone: "zinc" | "emerald" | "amber" | "orange" | "blue";
}) {
  const tones: Record<string, string> = {
    zinc: "border-zinc-200 dark:border-zinc-800",
    emerald: "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/30",
    amber: "border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/30",
    orange: "border-orange-300 bg-orange-50/40 dark:border-orange-900 dark:bg-orange-950/30",
    blue: "border-blue-300 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/30",
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">{value.toLocaleString("sk-SK")}</span>
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </div>
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

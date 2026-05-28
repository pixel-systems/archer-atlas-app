"use client";

import { useMemo, useState } from "react";

export interface ClientResultRow {
  id: string;
  score: number | null;
  achieved_on: string | null;
  competition_name: string | null;
  discipline: string | null;
  setup: string | null;
  category: string | null;
  division: string | null;
  is_season_max?: boolean | null;
  season: number | null;
}

export function SeasonResultsSection({ rows }: { rows: ClientResultRow[] }) {
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const r of rows) {
      if (r.season != null) set.add(r.season);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const [selected, setSelected] = useState<number | null>(years[0] ?? null);

  const yearRows = useMemo(
    () => (selected == null ? [] : rows.filter((r) => r.season === selected)),
    [rows, selected],
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Výsledky v sezóne</h2>
        {years.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelected(y)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  y === selected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected == null ? (
        <p className="text-sm text-zinc-500">Žiadne výsledky.</p>
      ) : yearRows.length === 0 ? (
        <p className="text-sm text-zinc-500">V sezóne {selected} žiadne výsledky.</p>
      ) : (
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
              {yearRows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <Td className="font-mono font-semibold">
                    {r.score ?? "—"}
                    {r.is_season_max && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        Max
                      </span>
                    )}
                  </Td>
                  <Td className="text-zinc-500">
                    {r.achieved_on ? new Date(r.achieved_on).toLocaleDateString("sk-SK") : "—"}
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
      )}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

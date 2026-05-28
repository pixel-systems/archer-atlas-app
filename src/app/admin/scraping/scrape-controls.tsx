"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

type Source = "all" | "members" | "member_details" | "awards" | "results_index";

const SOURCES: { id: Source; label: string; query?: string }[] = [
  { id: "all", label: "Všetko" },
  { id: "members", label: "Členovia + Kluby" },
  { id: "member_details", label: "Detaily členov (30)", query: "limit=30" },
  { id: "awards", label: "Ocenenia" },
  { id: "results_index", label: "Súťaže (index)" },
];

export function ScrapeControls() {
  const router = useRouter();
  const [running, setRunning] = useState<Source | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(source: Source) {
    setRunning(source);
    setMessage(null);
    try {
      const cfg = SOURCES.find((s) => s.id === source);
      const qs = cfg?.query ? `&${cfg.query}` : "";
      const res = await fetch(`/api/admin/scrape?source=${source}${qs}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error ?? `HTTP ${res.status}`);
      } else {
        const outcomes = body.outcomes ?? [body.outcome];
        const summary = outcomes
          .map((o: { source: string; status: string; itemsProcessed: number }) =>
            `${o.source}: ${o.status} (${o.itemsProcessed})`,
          )
          .join(", ");
        setMessage(`Hotovo — ${summary}`);
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => run(s.id)}
            disabled={running !== null}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {running === s.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 text-emerald-600" />
            )}
            {s.label}
          </button>
        ))}
      </div>
      {message && (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          {message}
        </p>
      )}
    </div>
  );
}

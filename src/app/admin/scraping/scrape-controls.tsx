"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Play, X, AlertTriangle } from "lucide-react";

type Source = "all" | "members" | "member_details" | "awards" | "results_index" | "competitions" | "club_profiles";

const SOURCES: { id: Source; label: string; query?: string }[] = [
  { id: "all", label: "Všetko" },
  { id: "members", label: "Členovia + Kluby" },
  { id: "member_details", label: "Detaily členov (30)", query: "limit=30" },
  { id: "club_profiles", label: "Profily klubov" },
  { id: "awards", label: "Ocenenia" },
  { id: "results_index", label: "Súťaže (index)" },
  { id: "competitions", label: "Prehľad súťaží (refresh)" },
];

interface ScrapeRun {
  id: string;
  source: string;
  status: "running" | "success" | "failed" | "partial";
  started_at: string;
  finished_at: string | null;
  items_processed: number;
  items_failed: number;
  items_total: number | null;
  current_item: string | null;
  current_item_index: number | null;
  errors: { messages?: string[] } | null;
}

interface ScrapeControlsProps {
  /** Sources to poll for an in-flight run on mount, so a refresh during a
   * long-running scrape still shows progress. */
  resumeSources?: Source[];
}

export function ScrapeControls({ resumeSources }: ScrapeControlsProps) {
  const router = useRouter();
  const [running, setRunning] = useState<Source | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<{ source: Source; run: ScrapeRun | null } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume modal if any source already has a running scrape (e.g. tab reopened).
  useEffect(() => {
    if (modal || running || !resumeSources?.length) return;
    let cancelled = false;
    (async () => {
      for (const src of resumeSources) {
        try {
          const res = await fetch(`/api/admin/scrape/status?source=${src}`);
          const body = (await res.json()) as { run: ScrapeRun | null };
          if (!cancelled && body.run?.status === "running") {
            setRunning(src);
            setModal({ source: src, run: body.run });
            break;
          }
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modal, running, resumeSources]);

  // Poll the status endpoint while a scrape is running.
  useEffect(() => {
    if (!modal || !running) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/scrape/status?source=${running}`);
        if (!res.ok) return;
        const body = (await res.json()) as { run: ScrapeRun | null };
        if (cancelled || !body.run) return;
        setModal((m) => (m ? { ...m, run: body.run } : m));
      } catch {
        /* ignore transient errors */
      }
    };

    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [modal, running]);

  async function run(source: Source) {
    setRunning(source);
    setMessage(null);
    setModal({ source, run: null });
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
      // Fetch one final snapshot so the modal reflects the terminal state.
      try {
        const r = await fetch(`/api/admin/scrape/status?source=${source}`);
        const b = (await r.json()) as { run: ScrapeRun | null };
        setModal((m) => (m ? { ...m, run: b.run } : m));
      } catch {
        /* ignore */
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

      {modal && (
        <ScrapeProgressModal
          source={modal.source}
          run={modal.run}
          live={running === modal.source}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function ScrapeProgressModal({
  source,
  run,
  live,
  onClose,
}: {
  source: Source;
  run: ScrapeRun | null;
  live: boolean;
  onClose: () => void;
}) {
  const total = run?.items_total ?? null;
  const processed = run?.items_processed ?? 0;
  const failed = run?.items_failed ?? 0;
  const index = run?.current_item_index ?? processed;
  const pct = total && total > 0 ? Math.min(100, Math.round((index / total) * 100)) : null;

  const isRunning = (run?.status ?? (live ? "running" : "running")) === "running";
  const isSuccess = run?.status === "success";
  const isPartial = run?.status === "partial";
  const isFailed = run?.status === "failed";

  const label = SOURCES.find((s) => s.id === source)?.label ?? source;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : isFailed ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <h3 className="text-base font-semibold">{label}</h3>
              <p className="text-xs text-zinc-500">
                {isRunning
                  ? "Prebieha…"
                  : isSuccess
                    ? "Hotovo"
                    : isPartial
                      ? "Hotovo s chybami"
                      : isFailed
                        ? "Zlyhalo"
                        : "—"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Zavrieť"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>
            {total != null
              ? `${index} / ${total}${pct != null ? ` (${pct} %)` : ""}`
              : isRunning
                ? "Pripravujem…"
                : `Spracovaných: ${processed}`}
          </span>
          {failed > 0 && (
            <span className="text-red-600 dark:text-red-400">{failed} chýb</span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full transition-all duration-300 ${
              isFailed
                ? "bg-red-500"
                : isPartial
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            } ${pct == null && isRunning ? "animate-pulse" : ""}`}
            style={{ width: pct != null ? `${pct}%` : isRunning ? "10%" : "100%" }}
          />
        </div>

        {/* Currently processed */}
        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-0.5 text-xs uppercase tracking-wide text-zinc-500">
            Aktuálne spracúvané
          </p>
          <p className="break-words font-mono text-sm">
            {run?.current_item ?? (isRunning ? "—" : "Dokončené")}
          </p>
        </div>

        {/* Errors */}
        {run?.errors?.messages && run.errors.messages.length > 0 && (
          <details className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
            <summary className="cursor-pointer text-red-800 dark:text-red-300">
              {run.errors.messages.length} chybových správ
            </summary>
            <ul className="mt-2 max-h-40 list-disc overflow-auto pl-5 text-xs text-red-700 dark:text-red-300">
              {run.errors.messages.slice(0, 50).map((m, i) => (
                <li key={i} className="break-words">
                  {m}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isRunning}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {isRunning ? "Beží…" : "Zavrieť"}
          </button>
        </div>
      </div>
    </div>
  );
}

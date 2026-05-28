"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  allowedArrowValues,
  arrowToNumber,
  sumArrows,
  countScoredArrows,
} from "@/lib/training/formats";

export interface EndRow {
  id: string;
  sort_order: number;
  distance_label: string | null;
  end_number: number;
  arrows: string[];
  end_total: number;
}

interface Props {
  sessionId: string;
  scoringType: string;
  initialEnds: EndRow[];
  isCustom: boolean;
}

export function ScoringForm({ sessionId, scoringType, initialEnds, isCustom }: Props) {
  const router = useRouter();
  const [ends, setEnds] = useState<EndRow[]>(() => initialEnds);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const allowed = useMemo(() => allowedArrowValues(scoringType), [scoringType]);

  // Group ends by distance_label, preserving order.
  const groups = useMemo(() => {
    const out: { distance_label: string | null; rows: EndRow[] }[] = [];
    for (const e of ends) {
      const last = out[out.length - 1];
      if (last && last.distance_label === e.distance_label) {
        last.rows.push(e);
      } else {
        out.push({ distance_label: e.distance_label, rows: [e] });
      }
    }
    return out;
  }, [ends]);

  const grandTotal = useMemo(
    () => ends.reduce((acc, e) => acc + sumArrows(e.arrows), 0),
    [ends],
  );
  const grandArrows = useMemo(
    () => ends.reduce((acc, e) => acc + countScoredArrows(e.arrows), 0),
    [ends],
  );

  function updateArrow(endIdx: number, arrowIdx: number, raw: string) {
    const v = raw.trim().toUpperCase();
    setEnds((prev) => {
      const copy = prev.map((e) => ({ ...e, arrows: [...e.arrows] }));
      copy[endIdx].arrows[arrowIdx] = v;
      copy[endIdx].end_total = sumArrows(copy[endIdx].arrows);
      return copy;
    });
  }

  function addEnd() {
    setEnds((prev) => {
      const last = prev[prev.length - 1];
      const arrowsCount = last?.arrows.length ?? 6;
      const distanceLabel = last?.distance_label ?? null;
      const nextSort = (last?.sort_order ?? -1) + 1;
      const nextNum = (last?.end_number ?? 0) + 1;
      return [
        ...prev,
        {
          id: `tmp-${nextSort}-${Date.now()}`,
          sort_order: nextSort,
          distance_label: distanceLabel,
          end_number: nextNum,
          arrows: Array.from({ length: arrowsCount }, () => ""),
          end_total: 0,
        },
      ];
    });
  }

  function removeEnd(idx: number) {
    setEnds((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setStatus("saving");
    setError(null);
    const supabase = createSupabaseBrowserClient();

    // For freeform (custom) we may have added/removed ends locally -> easiest is wipe & insert.
    if (isCustom) {
      const { error: delErr } = await supabase
        .from("training_session_ends")
        .delete()
        .eq("session_id", sessionId);
      if (delErr) {
        setError(delErr.message);
        setStatus("error");
        return;
      }
      const rows = ends.map((e, idx) => ({
        session_id: sessionId,
        sort_order: idx,
        distance_label: e.distance_label,
        end_number: idx + 1,
        arrows: e.arrows,
        end_total: sumArrows(e.arrows),
      }));
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("training_session_ends").insert(rows);
        if (insErr) {
          setError(insErr.message);
          setStatus("error");
          return;
        }
      }
    } else {
      // Fixed format -> update arrows for each existing row.
      for (const e of ends) {
        const { error: upErr } = await supabase
          .from("training_session_ends")
          .update({ arrows: e.arrows, end_total: sumArrows(e.arrows) })
          .eq("id", e.id);
        if (upErr) {
          setError(upErr.message);
          setStatus("error");
          return;
        }
      }
    }

    const { error: sessErr } = await supabase
      .from("training_sessions")
      .update({ total_score: grandTotal, total_arrows: grandArrows })
      .eq("id", sessionId);

    if (sessErr) {
      setError(sessErr.message);
      setStatus("error");
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
    router.refresh();
  }

  async function deleteSession() {
    if (!confirm("Naozaj zmazať tento tréning?")) return;
    const supabase = createSupabaseBrowserClient();
    const { error: delErr } = await supabase
      .from("training_sessions")
      .delete()
      .eq("id", sessionId);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    router.push("/profile/training");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500">
          Povolené hodnoty pre šíp:{" "}
          {allowed.length > 0 ? (
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs font-mono dark:bg-zinc-800">
              {allowed.join(" / ")}
            </code>
          ) : (
            "ľubovoľné číslo, M = miss"
          )}
          . Prázdne pole = nezapísaný šíp.
        </p>
      </div>

      {groups.map((g, gi) => {
        const groupStartIdx = ends.findIndex((e) => e === g.rows[0]);
        const groupTotal = g.rows.reduce((acc, e) => acc + sumArrows(e.arrows), 0);
        const groupArrows = g.rows.reduce(
          (acc, e) => acc + countScoredArrows(e.arrows),
          0,
        );
        return (
          <section
            key={`${g.distance_label ?? "free"}-${gi}`}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <header className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              <span>{g.distance_label ?? "Tréning"}</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                {groupTotal} <span className="text-xs text-zinc-500">({groupArrows} šípov)</span>
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">End</th>
                    {Array.from({ length: g.rows[0]?.arrows.length ?? 0 }).map((_, i) => (
                      <th key={i} className="px-1 py-2 font-medium text-center">
                        #{i + 1}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-medium text-right">Σ</th>
                    <th className="px-3 py-2 font-medium text-right">Cum</th>
                    {isCustom && <th className="px-2 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {g.rows.map((row, ri) => {
                    const idx = groupStartIdx + ri;
                    const endTotal = sumArrows(row.arrows);
                    // Cumulative within this group only.
                    const cum = g.rows
                      .slice(0, ri + 1)
                      .reduce((a, e) => a + sumArrows(e.arrows), 0);
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-1.5 font-mono text-xs text-zinc-500">
                          {row.end_number}
                        </td>
                        {row.arrows.map((a, ai) => {
                          const num = arrowToNumber(a);
                          const colour =
                            num == null
                              ? ""
                              : num === 0
                                ? "text-zinc-400"
                                : num >= 9
                                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                                  : num >= 6
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-zinc-700 dark:text-zinc-200";
                          return (
                            <td key={ai} className="px-1 py-1">
                              <input
                                value={a}
                                onChange={(e) => updateArrow(idx, ai, e.target.value)}
                                className={`w-10 rounded border border-zinc-300 bg-white px-1 py-1 text-center font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950 ${colour}`}
                                inputMode="text"
                                maxLength={2}
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-right font-mono font-semibold">
                          {endTotal}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-zinc-500">
                          {cum}
                        </td>
                        {isCustom && (
                          <td className="px-2 py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeEnd(idx)}
                              className="text-zinc-400 hover:text-red-600"
                              aria-label="Zmazať end"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="text-sm">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Σ tréning </span>
          <span className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {grandTotal}
          </span>
          <span className="ml-2 text-xs text-zinc-500">
            ({grandArrows} {grandArrows === 1 ? "šíp" : "šípov"})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isCustom && (
            <button
              type="button"
              onClick={addEnd}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" /> Pridať end
            </button>
          )}
          <button
            type="button"
            onClick={deleteSession}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950"
          >
            Zmazať tréning
          </button>
          <button
            type="button"
            onClick={save}
            disabled={status === "saving"}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {status === "saving" ? "Ukladám…" : "Uložiť"}
          </button>
          {status === "saved" && (
            <span className="text-xs text-emerald-700">Uložené.</span>
          )}
          {status === "error" && (
            <span className="text-xs text-red-600">{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}

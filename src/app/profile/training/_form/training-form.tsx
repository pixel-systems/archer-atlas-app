"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { TrainingFormatRow, EquipmentBowSetupRow } from "@/lib/supabase/types";
import { bowTypeLabel } from "@/lib/equipment";
import {
  WA_DIVISIONS,
  WA_AGE_CATEGORIES,
  IFAA_BOW_STYLES,
  IFAA_AGE_CATEGORIES,
  buildEndStubs,
  type FormatDistance,
} from "@/lib/training/formats";

export interface TrainingFormInitial {
  id: string;
  format_id: string;
  session_date: string;
  division: string | null;
  age_category: string | null;
  bow_style: string | null;
  bow_setup_id: string | null;
  location: string | null;
  weather: string | null;
  notes: string | null;
}

interface Props {
  formats: TrainingFormatRow[];
  bowSetups: EquipmentBowSetupRow[];
  initial?: TrainingFormInitial;
}

export function TrainingForm({ formats, bowSetups, initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial);

  const [formatId, setFormatId] = useState<string>(
    initial?.format_id ?? formats[0]?.id ?? "",
  );
  const [date, setDate] = useState<string>(
    initial?.session_date ?? new Date().toISOString().slice(0, 10),
  );
  const [division, setDivision] = useState(initial?.division ?? "");
  const [ageCategory, setAgeCategory] = useState(initial?.age_category ?? "");
  const [bowStyle, setBowStyle] = useState(initial?.bow_style ?? "");
  const [bowSetupId, setBowSetupId] = useState<string>(
    initial?.bow_setup_id ?? bowSetups.find((s) => s.is_default)?.id ?? "",
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [weather, setWeather] = useState(initial?.weather ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => formats.find((f) => f.id === formatId),
    [formats, formatId],
  );

  const isIfaa = selected?.organisation === "IFAA";
  const isCustom = selected?.scoring_type === "custom";
  const formatChanged = editing && initial?.format_id !== formatId;

  const grouped = useMemo(() => {
    const groups: Record<string, TrainingFormatRow[]> = {};
    for (const f of formats) {
      const key =
        f.organisation === "WA"
          ? "World Archery"
          : f.organisation === "IFAA"
            ? "IFAA"
            : "Ostatné";
      (groups[key] ??= []).push(f);
    }
    return groups;
  }, [formats]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    if (formatChanged) {
      const ok = window.confirm(
        "Zmenou formátu sa zmaže aktuálne skórovanie tohto tréningu (ends) a nahradí sa prázdnou štruktúrou nového formátu. Pokračovať?",
      );
      if (!ok) return;
    }

    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setError("Nie ste prihlásený.");
      setBusy(false);
      return;
    }

    const payload = {
      format_id: selected.id,
      session_date: date,
      division: division || null,
      age_category: ageCategory || null,
      bow_style: bowStyle || null,
      location: location || null,
      weather: weather || null,
      notes: notes || null,
      bow_setup_id: bowSetupId || null,
    };

    let sessionId: string;

    if (editing && initial) {
      const { error: updErr } = await supabase
        .from("training_sessions")
        .update(payload)
        .eq("id", initial.id);
      if (updErr) {
        setError(updErr.message);
        setBusy(false);
        return;
      }
      sessionId = initial.id;

      if (formatChanged) {
        const { error: delErr } = await supabase
          .from("training_session_ends")
          .delete()
          .eq("session_id", sessionId);
        if (delErr) {
          setError(delErr.message);
          setBusy(false);
          return;
        }
        await supabase
          .from("training_sessions")
          .update({ total_score: 0, total_arrows: 0 })
          .eq("id", sessionId);
        await insertStubs(supabase, sessionId, selected);
      }
    } else {
      const { data: session, error: insErr } = await supabase
        .from("training_sessions")
        .insert({
          ...payload,
          user_id: userRes.user.id,
          total_score: 0,
          total_arrows: 0,
        })
        .select("id")
        .single();

      if (insErr || !session) {
        setError(insErr?.message ?? "Nepodarilo sa uložiť.");
        setBusy(false);
        return;
      }
      sessionId = session.id;
      const stubErr = await insertStubs(supabase, sessionId, selected);
      if (stubErr) {
        setError(stubErr);
        setBusy(false);
        return;
      }
    }

    router.push(`/profile/training/${sessionId}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Field label="Formát">
        <select
          required
          value={formatId}
          onChange={(e) => setFormatId(e.target.value)}
          className="input"
        >
          {Object.entries(grouped).map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.max_score ? ` (max ${f.max_score})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      {selected && !isCustom && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <strong>Štruktúra:</strong>{" "}
          {(selected.default_distances ?? [])
            .map(
              (d) =>
                `${d.label}: ${d.ends}× ${d.arrows_per_end} šíp${d.arrows_per_end === 1 ? "" : "y"}`,
            )
            .join(" · ")}
          {selected.max_score ? ` · Max ${selected.max_score}` : ""}
        </div>
      )}

      {formatChanged && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⚠ Zmena formátu zmaže aktuálne zapísané ends tohto tréningu.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dátum">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </Field>

        <Field label={isIfaa ? "IFAA bow style" : "Divízia"}>
          {isIfaa ? (
            <select
              className="input"
              value={bowStyle}
              onChange={(e) => setBowStyle(e.target.value)}
            >
              <option value="">— vybrať —</option>
              {IFAA_BOW_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="input"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option value="">— vybrať —</option>
              {WA_DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Veková kategória">
          <select
            className="input"
            value={ageCategory}
            onChange={(e) => setAgeCategory(e.target.value)}
          >
            <option value="">— vybrať —</option>
            {(isIfaa ? IFAA_AGE_CATEGORIES : WA_AGE_CATEGORIES).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Miesto">
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Strelnica, klub, mesto…"
          />
        </Field>

        <Field label="Počasie / podmienky">
          <input
            className="input"
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            placeholder="napr. 18 °C, mierny vietor"
          />
        </Field>
      </div>

      <Field
        label={
          <>
            Bow setup{" "}
            <a
              href="/profile/equipment"
              className="text-xs text-emerald-700 hover:underline dark:text-emerald-400"
            >
              spravovať výbavu →
            </a>
          </>
        }
      >
        {bowSetups.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Zatiaľ nemáte vytvorený žiadny setup. Tréning môžete uložiť aj bez neho a priradiť ho neskôr.
          </div>
        ) : (
          <select
            className="input"
            value={bowSetupId}
            onChange={(e) => setBowSetupId(e.target.value)}
          >
            <option value="">— bez setupu —</option>
            {bowSetups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {bowTypeLabel(s.bow_type)}
                {s.is_default ? "  ★" : ""}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Poznámky">
        <textarea
          rows={3}
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Cieľ tréningu, nastavenie luku, technika…"
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !formatId}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy
            ? editing
              ? "Ukladám…"
              : "Vytváram…"
            : editing
              ? "Uložiť zmeny"
              : "Vytvoriť tréning"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => router.push(`/profile/training/${initial!.id}`)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Zrušiť
          </button>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(212 212 216);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        :global(.dark) .input {
          border-color: rgb(63 63 70);
          background: rgb(24 24 27);
          color: rgb(244 244 245);
        }
        .input:focus {
          outline: none;
          border-color: rgb(16 185 129);
          box-shadow: 0 0 0 3px rgb(16 185 129 / 0.2);
        }
      `}</style>
    </form>
  );
}

async function insertStubs(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  sessionId: string,
  selected: TrainingFormatRow,
): Promise<string | null> {
  const distances = (selected.default_distances ?? []) as FormatDistance[];
  const stubs = distances.length
    ? buildEndStubs(distances)
    : [{ sort_order: 0, distance_label: "", end_number: 1, arrows: ["", "", "", "", "", ""] }];

  if (stubs.length === 0) return null;

  const rows = stubs.map((s) => ({
    session_id: sessionId,
    sort_order: s.sort_order,
    distance_label: s.distance_label || null,
    end_number: s.end_number,
    arrows: s.arrows,
    end_total: 0,
  }));
  const { error: endErr } = await supabase.from("training_session_ends").insert(rows);
  return endErr ? endErr.message : null;
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  BOW_TYPES,
  FLETCHING_TYPES,
  LIMB_FITTINGS,
  LIMB_LENGTHS,
  SHAFT_TYPES,
  bowTypeLabel,
} from "@/lib/equipment";
import type {
  BowType,
  EquipmentArrowRow,
  EquipmentBowSetupRow,
  EquipmentLimbRow,
  EquipmentRiserRow,
} from "@/lib/supabase/types";

interface Props {
  userId: string;
  initialRisers: EquipmentRiserRow[];
  initialLimbs: EquipmentLimbRow[];
  initialArrows: EquipmentArrowRow[];
  initialSetups: EquipmentBowSetupRow[];
}

type Tab = "setups" | "risers" | "limbs" | "arrows";

export function EquipmentManager(props: Props) {
  const [tab, setTab] = useState<Tab>("setups");
  const [risers, setRisers] = useState(props.initialRisers);
  const [limbs, setLimbs] = useState(props.initialLimbs);
  const [arrows, setArrows] = useState(props.initialArrows);
  const [setups, setSetups] = useState(props.initialSetups);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "setups", label: "Bow setupy", count: setups.length },
    { id: "risers", label: "Rizery", count: risers.length },
    { id: "limbs", label: "Limby", count: limbs.length },
    { id: "arrows", label: "Šípy", count: arrows.length },
  ];

  return (
    <div>
      <nav className="mb-5 flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            }`}
          >
            {t.label}{" "}
            <span className="ml-1 rounded bg-zinc-200 px-1.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              {t.count}
            </span>
          </button>
        ))}
      </nav>

      {tab === "setups" && (
        <SetupsSection
          setups={setups}
          setSetups={setSetups}
          risers={risers}
          limbs={limbs}
          arrows={arrows}
        />
      )}
      {tab === "risers" && <RisersSection risers={risers} setRisers={setRisers} />}
      {tab === "limbs" && <LimbsSection limbs={limbs} setLimbs={setLimbs} />}
      {tab === "arrows" && <ArrowsSection arrows={arrows} setArrows={setArrows} />}
    </div>
  );
}

// ============================================================
// Generic helpers
// ============================================================

function SectionShell({
  title,
  description,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  description?: string;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{description}</p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
      {text}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: T | "";
  onChange: (v: T | "") => void;
  options: readonly { value: T; label: string }[] | readonly T[];
  placeholder?: string;
}) {
  const opts = options.map((o) =>
    typeof o === "string" ? { value: o as T, label: o } : o,
  );
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      >
        <option value="">{placeholder ?? "—"}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormCard({
  title,
  onCancel,
  onSubmit,
  busy,
  error,
  children,
}: {
  title: string;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/30"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <button type="button" onClick={onCancel} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Zrušiť
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy ? "Ukladám…" : "Uložiť"}
        </button>
      </div>
    </form>
  );
}

function ListCard({
  title,
  subtitle,
  meta,
  pill,
  onEdit,
  onDelete,
  busy,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string[];
  pill?: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold tracking-tight">{title}</h3>
          {pill}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{subtitle}</p>
        )}
        {meta && meta.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            {meta.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={onEdit}
          className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          title="Upraviť"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950"
          title="Zmazať"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function num(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ============================================================
// RISERS
// ============================================================

function RisersSection({
  risers,
  setRisers,
}: {
  risers: EquipmentRiserRow[];
  setRisers: (r: EquipmentRiserRow[]) => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [editing, setEditing] = useState<EquipmentRiserRow | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("Naozaj zmazať tento riser?")) return;
    setBusyId(id);
    const { error } = await supabase.from("equipment_risers").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setRisers(risers.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <SectionShell
      title="Rizery (recurve / barebow)"
      description="Centrálna časť olympijského luku — riser je nezávislý od limbov."
      addLabel="Pridať riser"
      onAdd={() => setEditing("new")}
    >
      {editing && (
        <RiserForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(row) => {
            setRisers(
              editing === "new"
                ? [row, ...risers]
                : risers.map((r) => (r.id === row.id ? row : r)),
            );
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {risers.length === 0 && !editing && (
        <EmptyCard text="Zatiaľ žiadne rizery. Pridajte si svoj prvý." />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {risers.map((r) => (
          <ListCard
            key={r.id}
            title={r.name}
            subtitle={[r.brand, r.model].filter(Boolean).join(" ") || null}
            meta={[
              r.length_inches ? `${r.length_inches}"` : "",
              r.handedness ?? "",
              r.color ?? "",
            ].filter(Boolean)}
            busy={busyId === r.id}
            onEdit={() => setEditing(r)}
            onDelete={() => onDelete(r.id)}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function RiserForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: EquipmentRiserRow | null;
  onCancel: () => void;
  onSaved: (r: EquipmentRiserRow) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [length, setLength] = useState(initial?.length_inches?.toString() ?? "");
  const [handed, setHanded] = useState<"RH" | "LH" | "">(initial?.handedness ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setError("Nie ste prihlásený.");
      setBusy(false);
      return;
    }
    const payload = {
      user_id: userRes.user.id,
      name: name.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      length_inches: num(length),
      handedness: handed || null,
      color: color.trim() || null,
      notes: notes.trim() || null,
    };
    const q = initial
      ? supabase.from("equipment_risers").update(payload).eq("id", initial.id).select("*").single()
      : supabase.from("equipment_risers").insert(payload).select("*").single();
    const { data, error } = await q;
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Nepodarilo sa uložiť.");
      return;
    }
    onSaved(data as EquipmentRiserRow);
  }

  return (
    <FormCard
      title={initial ? "Upraviť riser" : "Nový riser"}
      onCancel={onCancel}
      onSubmit={onSubmit}
      busy={busy}
      error={error}
    >
      <TextField label="Názov" value={name} onChange={setName} required placeholder="napr. Môj 25” riser" />
      <TextField label="Značka" value={brand} onChange={setBrand} placeholder="Hoyt, WIN&WIN, Uukha…" />
      <TextField label="Model" value={model} onChange={setModel} placeholder="GMX3, ATF-X…" />
      <TextField label="Dĺžka (palce)" value={length} onChange={setLength} type="number" step="0.5" placeholder="25" />
      <SelectField<"RH" | "LH">
        label="Ruka"
        value={handed}
        onChange={setHanded}
        options={[
          { value: "RH", label: "Right hand" },
          { value: "LH", label: "Left hand" },
        ]}
      />
      <TextField label="Farba" value={color} onChange={setColor} />
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Poznámky
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </label>
    </FormCard>
  );
}

// ============================================================
// LIMBS
// ============================================================

function LimbsSection({
  limbs,
  setLimbs,
}: {
  limbs: EquipmentLimbRow[];
  setLimbs: (l: EquipmentLimbRow[]) => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [editing, setEditing] = useState<EquipmentLimbRow | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("Naozaj zmazať tieto limby?")) return;
    setBusyId(id);
    const { error } = await supabase.from("equipment_limbs").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setLimbs(limbs.filter((l) => l.id !== id));
    router.refresh();
  }

  return (
    <SectionShell
      title="Limby (recurve / barebow)"
      description="Pružné ramená luku — môžete ich kombinovať s rôznymi rizermi."
      addLabel="Pridať limby"
      onAdd={() => setEditing("new")}
    >
      {editing && (
        <LimbsForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(row) => {
            setLimbs(
              editing === "new"
                ? [row, ...limbs]
                : limbs.map((l) => (l.id === row.id ? row : l)),
            );
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {limbs.length === 0 && !editing && (
        <EmptyCard text="Zatiaľ žiadne limby." />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {limbs.map((l) => (
          <ListCard
            key={l.id}
            title={l.name}
            subtitle={[l.brand, l.model].filter(Boolean).join(" ") || null}
            meta={[
              l.length ?? "",
              l.draw_weight_lbs ? `${l.draw_weight_lbs} lbs` : "",
              l.fitting ?? "",
              l.material ?? "",
            ].filter(Boolean)}
            busy={busyId === l.id}
            onEdit={() => setEditing(l)}
            onDelete={() => onDelete(l.id)}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function LimbsForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: EquipmentLimbRow | null;
  onCancel: () => void;
  onSaved: (r: EquipmentLimbRow) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [length, setLength] = useState<"short" | "medium" | "long" | "">(initial?.length ?? "");
  const [lbs, setLbs] = useState(initial?.draw_weight_lbs?.toString() ?? "");
  const [fitting, setFitting] = useState(initial?.fitting ?? "");
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setError("Nie ste prihlásený.");
      setBusy(false);
      return;
    }
    const payload = {
      user_id: userRes.user.id,
      name: name.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      length: length || null,
      draw_weight_lbs: num(lbs),
      fitting: fitting.trim() || null,
      material: material.trim() || null,
      notes: notes.trim() || null,
    };
    const q = initial
      ? supabase.from("equipment_limbs").update(payload).eq("id", initial.id).select("*").single()
      : supabase.from("equipment_limbs").insert(payload).select("*").single();
    const { data, error } = await q;
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Nepodarilo sa uložiť.");
      return;
    }
    onSaved(data as EquipmentLimbRow);
  }

  return (
    <FormCard
      title={initial ? "Upraviť limby" : "Nové limby"}
      onCancel={onCancel}
      onSubmit={onSubmit}
      busy={busy}
      error={error}
    >
      <TextField label="Názov" value={name} onChange={setName} required placeholder="napr. Outdoor 36 lbs" />
      <TextField label="Značka" value={brand} onChange={setBrand} />
      <TextField label="Model" value={model} onChange={setModel} placeholder="Velos, Veracity…" />
      <SelectField<"short" | "medium" | "long">
        label="Dĺžka"
        value={length}
        onChange={setLength}
        options={LIMB_LENGTHS}
      />
      <TextField label="Sila (lbs)" value={lbs} onChange={setLbs} type="number" step="0.5" placeholder="36" />
      <SelectField<string>
        label="Uchytenie"
        value={fitting}
        onChange={setFitting}
        options={LIMB_FITTINGS}
      />
      <TextField label="Materiál" value={material} onChange={setMaterial} placeholder="karbón / pena…" />
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Poznámky
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </label>
    </FormCard>
  );
}

// ============================================================
// ARROWS
// ============================================================

function ArrowsSection({
  arrows,
  setArrows,
}: {
  arrows: EquipmentArrowRow[];
  setArrows: (a: EquipmentArrowRow[]) => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [editing, setEditing] = useState<EquipmentArrowRow | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("Naozaj zmazať tento šípový set?")) return;
    setBusyId(id);
    const { error } = await supabase.from("equipment_arrows").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setArrows(arrows.filter((a) => a.id !== id));
    router.refresh();
  }

  return (
    <SectionShell
      title="Šípové sety"
      description="Šípy sú nezávislé od luku — môžete ich priradiť k ľubovoľnému bow setupu."
      addLabel="Pridať šípy"
      onAdd={() => setEditing("new")}
    >
      {editing && (
        <ArrowsForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(row) => {
            setArrows(
              editing === "new"
                ? [row, ...arrows]
                : arrows.map((a) => (a.id === row.id ? row : a)),
            );
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {arrows.length === 0 && !editing && (
        <EmptyCard text="Zatiaľ žiadne šípy." />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {arrows.map((a) => (
          <ListCard
            key={a.id}
            title={a.name}
            subtitle={[a.brand, a.model].filter(Boolean).join(" ") || null}
            meta={[
              a.spine ? `spine ${a.spine}` : "",
              a.shaft_type ?? "",
              a.length_inches ? `${a.length_inches}"` : "",
              a.point_grain ? `${a.point_grain} gr` : "",
              a.pin ? `pin: ${a.pin}` : "",
              a.nock ? `nock: ${a.nock}` : "",
              a.fletching_type
                ? `${a.fletching_type}${a.fletching_length ? ` ${a.fletching_length}` : ""}`
                : "",
              a.quantity ? `${a.quantity} ks` : "",
            ].filter(Boolean)}
            busy={busyId === a.id}
            onEdit={() => setEditing(a)}
            onDelete={() => onDelete(a.id)}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function ArrowsForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: EquipmentArrowRow | null;
  onCancel: () => void;
  onSaved: (r: EquipmentArrowRow) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [shaft, setShaft] = useState(initial?.shaft_type ?? "");
  const [spine, setSpine] = useState(initial?.spine ?? "");
  const [length, setLength] = useState(initial?.length_inches?.toString() ?? "");
  const [point, setPoint] = useState(initial?.point_grain?.toString() ?? "");
  const [pin, setPin] = useState(initial?.pin ?? "");
  const [nock, setNock] = useState(initial?.nock ?? "");
  const [flType, setFlType] = useState(initial?.fletching_type ?? "");
  const [flLen, setFlLen] = useState(initial?.fletching_length ?? "");
  const [flColor, setFlColor] = useState(initial?.fletching_color ?? "");
  const [qty, setQty] = useState(initial?.quantity?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setError("Nie ste prihlásený.");
      setBusy(false);
      return;
    }
    const qtyN = num(qty);
    const payload = {
      user_id: userRes.user.id,
      name: name.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      shaft_type: shaft || null,
      spine: spine.trim() || null,
      length_inches: num(length),
      point_grain: num(point),
      pin: pin.trim() || null,
      nock: nock.trim() || null,
      fletching_type: flType || null,
      fletching_length: flLen.trim() || null,
      fletching_color: flColor.trim() || null,
      quantity: qtyN !== null ? Math.round(qtyN) : null,
      notes: notes.trim() || null,
    };
    const q = initial
      ? supabase.from("equipment_arrows").update(payload).eq("id", initial.id).select("*").single()
      : supabase.from("equipment_arrows").insert(payload).select("*").single();
    const { data, error } = await q;
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Nepodarilo sa uložiť.");
      return;
    }
    onSaved(data as EquipmentArrowRow);
  }

  return (
    <FormCard
      title={initial ? "Upraviť šípový set" : "Nový šípový set"}
      onCancel={onCancel}
      onSubmit={onSubmit}
      busy={busy}
      error={error}
    >
      <TextField label="Názov setu" value={name} onChange={setName} required placeholder="napr. Outdoor 70m carbons" />
      <TextField label="Značka" value={brand} onChange={setBrand} placeholder="Easton, Carbon Express…" />
      <TextField label="Model" value={model} onChange={setModel} placeholder="X10, ACE, Procomp…" />
      <SelectField<string>
        label="Typ šaftu"
        value={shaft}
        onChange={setShaft}
        options={SHAFT_TYPES}
      />
      <TextField label="Spine" value={spine} onChange={setSpine} placeholder="600, 1000, 27/64…" required />
      <TextField label="Dĺžka (palce)" value={length} onChange={setLength} type="number" step="0.05" />
      <TextField label="Hrot (grain)" value={point} onChange={setPoint} type="number" step="0.5" placeholder="voliteľné" />
      <TextField label="Pin (voliteľné)" value={pin} onChange={setPin} placeholder="Easton 3-49" />
      <TextField label="Nock" value={nock} onChange={setNock} placeholder="napr. G nock, Pin nock…" />
      <SelectField<string>
        label="Typ letiek"
        value={flType}
        onChange={setFlType}
        options={FLETCHING_TYPES}
      />
      <TextField label="Dĺžka letiek" value={flLen} onChange={setFlLen} placeholder='napr. 1.75", 4", 3" parabolic' />
      <TextField label="Farba letiek" value={flColor} onChange={setFlColor} />
      <TextField label="Počet kusov" value={qty} onChange={setQty} type="number" />
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Poznámky
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </label>
    </FormCard>
  );
}

// ============================================================
// BOW SETUPS
// ============================================================

function SetupsSection({
  setups,
  setSetups,
  risers,
  limbs,
  arrows,
}: {
  setups: EquipmentBowSetupRow[];
  setSetups: (s: EquipmentBowSetupRow[]) => void;
  risers: EquipmentRiserRow[];
  limbs: EquipmentLimbRow[];
  arrows: EquipmentArrowRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [editing, setEditing] = useState<EquipmentBowSetupRow | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onDelete(id: string) {
    if (!confirm("Naozaj zmazať tento setup?")) return;
    setBusyId(id);
    const { error } = await supabase.from("equipment_bow_setups").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setSetups(setups.filter((s) => s.id !== id));
    router.refresh();
  }

  async function onMakeDefault(id: string) {
    setBusyId(id);
    // Two-step: clear existing default for this user, then set new one.
    // (RLS limits both queries to current user.)
    const { error: clearErr } = await supabase
      .from("equipment_bow_setups")
      .update({ is_default: false })
      .eq("is_default", true);
    if (clearErr) {
      setBusyId(null);
      alert(clearErr.message);
      return;
    }
    const { data, error } = await supabase
      .from("equipment_bow_setups")
      .update({ is_default: true })
      .eq("id", id)
      .select("*")
      .single();
    setBusyId(null);
    if (error || !data) {
      alert(error?.message ?? "Nepodarilo sa nastaviť predvolený setup.");
      return;
    }
    setSetups(
      setups.map((s) =>
        s.id === id ? (data as EquipmentBowSetupRow) : { ...s, is_default: false },
      ),
    );
    startTransition(() => router.refresh());
  }

  const riserById = (id: string | null) => risers.find((r) => r.id === id) ?? null;
  const limbsById = (id: string | null) => limbs.find((l) => l.id === id) ?? null;
  const arrowsById = (id: string | null) => arrows.find((a) => a.id === id) ?? null;

  return (
    <SectionShell
      title="Bow setupy"
      description="Pomenovaná kombinácia luku + (rizera, limbov) + šípov, ktorú priradíte k tréningu."
      addLabel="Nový setup"
      onAdd={() => setEditing("new")}
    >
      {editing && (
        <SetupForm
          initial={editing === "new" ? null : editing}
          risers={risers}
          limbs={limbs}
          arrows={arrows}
          onCancel={() => setEditing(null)}
          onSaved={(row) => {
            setSetups(
              editing === "new"
                ? [row, ...setups]
                : setups.map((s) => (s.id === row.id ? row : s)),
            );
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {setups.length === 0 && !editing && (
        <EmptyCard text="Zatiaľ žiadne setupy. Najprv si pridajte komponenty (riser/limby/šípy) a potom vytvorte setup." />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {setups.map((s) => {
          const r = riserById(s.riser_id);
          const l = limbsById(s.limbs_id);
          const a = arrowsById(s.arrows_id);
          const meta = [
            r ? `Riser: ${[r.brand, r.model].filter(Boolean).join(" ") || r.name}` : "",
            l ? `Limby: ${[l.brand, l.model].filter(Boolean).join(" ") || l.name}${l.draw_weight_lbs ? ` · ${l.draw_weight_lbs} lbs` : ""}` : "",
            a ? `Šípy: ${[a.brand, a.model].filter(Boolean).join(" ") || a.name}${a.spine ? ` (spine ${a.spine})` : ""}` : "",
            !r && !l && [s.brand, s.model].filter(Boolean).join(" ") || "",
            s.draw_weight_lbs ? `${s.draw_weight_lbs} lbs` : "",
            s.draw_length_inches ? `DL ${s.draw_length_inches}"` : "",
          ].filter(Boolean) as string[];
          return (
            <div key={s.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold tracking-tight">{s.name}</h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {bowTypeLabel(s.bow_type)}
                    </span>
                    {s.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        <Star className="h-3 w-3 fill-current" /> default
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {meta.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!s.is_default && (
                    <button
                      onClick={() => onMakeDefault(s.id)}
                      disabled={busyId === s.id || pending}
                      className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-950"
                      title="Nastaviť ako predvolený"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(s)}
                    className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    title="Upraviť"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    disabled={busyId === s.id}
                    className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950"
                    title="Zmazať"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function SetupForm({
  initial,
  risers,
  limbs,
  arrows,
  onCancel,
  onSaved,
}: {
  initial: EquipmentBowSetupRow | null;
  risers: EquipmentRiserRow[];
  limbs: EquipmentLimbRow[];
  arrows: EquipmentArrowRow[];
  onCancel: () => void;
  onSaved: (r: EquipmentBowSetupRow) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState(initial?.name ?? "");
  const [bowType, setBowType] = useState<BowType>(initial?.bow_type ?? "recurve");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [lbs, setLbs] = useState(initial?.draw_weight_lbs?.toString() ?? "");
  const [drawLen, setDrawLen] = useState(initial?.draw_length_inches?.toString() ?? "");
  const [riserId, setRiserId] = useState(initial?.riser_id ?? "");
  const [limbsId, setLimbsId] = useState(initial?.limbs_id ?? "");
  const [arrowsId, setArrowsId] = useState(initial?.arrows_id ?? "");
  const [makeDefault, setMakeDefault] = useState(initial?.is_default ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesRiserLimbs = BOW_TYPES.find((b) => b.value === bowType)?.usesRiserLimbs ?? false;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setError("Nie ste prihlásený.");
      setBusy(false);
      return;
    }

    // If marked default, clear other default rows first.
    if (makeDefault && (!initial || !initial.is_default)) {
      const { error: clearErr } = await supabase
        .from("equipment_bow_setups")
        .update({ is_default: false })
        .eq("is_default", true);
      if (clearErr) {
        setBusy(false);
        setError(clearErr.message);
        return;
      }
    }

    const payload = {
      user_id: userRes.user.id,
      name: name.trim(),
      bow_type: bowType,
      brand: brand.trim() || null,
      model: model.trim() || null,
      draw_weight_lbs: num(lbs),
      draw_length_inches: num(drawLen),
      riser_id: usesRiserLimbs ? riserId || null : null,
      limbs_id: usesRiserLimbs ? limbsId || null : null,
      arrows_id: arrowsId || null,
      is_default: makeDefault,
      notes: notes.trim() || null,
    };
    const q = initial
      ? supabase.from("equipment_bow_setups").update(payload).eq("id", initial.id).select("*").single()
      : supabase.from("equipment_bow_setups").insert(payload).select("*").single();
    const { data, error } = await q;
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Nepodarilo sa uložiť.");
      return;
    }
    onSaved(data as EquipmentBowSetupRow);
  }

  return (
    <FormCard
      title={initial ? "Upraviť bow setup" : "Nový bow setup"}
      onCancel={onCancel}
      onSubmit={onSubmit}
      busy={busy}
      error={error}
    >
      <TextField label="Názov setupu" value={name} onChange={setName} required placeholder="napr. Outdoor recurve 36#" />
      <SelectField<BowType>
        label="Typ luku"
        value={bowType}
        onChange={(v) => setBowType((v || "recurve") as BowType)}
        options={BOW_TYPES.map((b) => ({ value: b.value, label: b.label }))}
      />

      {usesRiserLimbs ? (
        <>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Riser
            </span>
            <select
              value={riserId}
              onChange={(e) => setRiserId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">— bez rizera —</option>
              {risers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.brand || r.model ? ` (${[r.brand, r.model].filter(Boolean).join(" ")})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Limby
            </span>
            <select
              value={limbsId}
              onChange={(e) => setLimbsId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">— bez limbov —</option>
              {limbs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.draw_weight_lbs ? ` · ${l.draw_weight_lbs} lbs` : ""}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <TextField label="Značka luku" value={brand} onChange={setBrand} placeholder="napr. Hoyt, Mathews…" />
          <TextField label="Model luku" value={model} onChange={setModel} />
        </>
      )}

      <TextField label="Ťah (lbs)" value={lbs} onChange={setLbs} type="number" step="0.5" />
      <TextField label="Draw length (palce)" value={drawLen} onChange={setDrawLen} type="number" step="0.25" />

      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Šípový set
        </span>
        <select
          value={arrowsId}
          onChange={(e) => setArrowsId(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">— bez priradených šípov —</option>
          {arrows.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.spine ? ` · spine ${a.spine}` : ""}
              {a.brand || a.model ? ` (${[a.brand, a.model].filter(Boolean).join(" ")})` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
        />
        Označiť ako predvolený setup
      </label>

      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Poznámky
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </label>
    </FormCard>
  );
}

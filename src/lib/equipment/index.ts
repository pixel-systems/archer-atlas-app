// Equipment domain helpers shared by the profile/equipment UI and training forms.

import type {
  BowType,
  EquipmentArrowRow,
  EquipmentBowSetupRow,
  EquipmentLimbRow,
  EquipmentRiserRow,
} from "@/lib/supabase/types";

export const BOW_TYPES: { value: BowType; label: string; usesRiserLimbs: boolean }[] = [
  { value: "recurve", label: "Olympic Recurve", usesRiserLimbs: true },
  { value: "barebow", label: "Barebow", usesRiserLimbs: true },
  { value: "compound", label: "Compound", usesRiserLimbs: false },
  { value: "longbow", label: "Longbow", usesRiserLimbs: false },
  { value: "traditional", label: "Traditional", usesRiserLimbs: false },
  { value: "horse_bow", label: "Horse bow", usesRiserLimbs: false },
  { value: "crossbow", label: "Crossbow", usesRiserLimbs: false },
  { value: "other", label: "Other / Custom", usesRiserLimbs: false },
];

export function bowTypeLabel(t: BowType | string | null | undefined): string {
  if (!t) return "—";
  return BOW_TYPES.find((b) => b.value === t)?.label ?? String(t);
}

export const SHAFT_TYPES = [
  "Carbon",
  "Aluminium",
  "Aluminium / Carbon",
  "Wood",
  "Fiberglass",
] as const;

export const FLETCHING_TYPES = ["Vanes", "Feathers", "Spin-Wing", "Mylar"] as const;

export const LIMB_FITTINGS = ["ILF", "Formula (Hoyt)", "Bolt-down", "Other"] as const;

export const LIMB_LENGTHS = ["short", "medium", "long"] as const;

// ---------- Display helpers ----------

export function formatRiser(r: EquipmentRiserRow): string {
  const parts = [r.brand, r.model].filter(Boolean).join(" ");
  const len = r.length_inches ? ` · ${r.length_inches}"` : "";
  const hand = r.handedness ? ` · ${r.handedness}` : "";
  return parts ? `${parts}${len}${hand}` : `${r.name}${len}${hand}`;
}

export function formatLimbs(l: EquipmentLimbRow): string {
  const parts = [l.brand, l.model].filter(Boolean).join(" ");
  const len = l.length ? ` · ${l.length}` : "";
  const lbs = l.draw_weight_lbs ? ` · ${l.draw_weight_lbs} lbs` : "";
  return parts ? `${parts}${len}${lbs}` : `${l.name}${len}${lbs}`;
}

export function formatArrows(a: EquipmentArrowRow): string {
  const parts = [a.brand, a.model].filter(Boolean).join(" ");
  const sp = a.spine ? ` · spine ${a.spine}` : "";
  const sh = a.shaft_type ? ` · ${a.shaft_type}` : "";
  return parts ? `${parts}${sp}${sh}` : `${a.name}${sp}${sh}`;
}

export interface SetupResolved extends EquipmentBowSetupRow {
  riser?: EquipmentRiserRow | null;
  limbs?: EquipmentLimbRow | null;
  arrows?: EquipmentArrowRow | null;
}

export function formatBowSetup(s: SetupResolved): string {
  const lbl = bowTypeLabel(s.bow_type);
  const monolithic = [s.brand, s.model].filter(Boolean).join(" ");
  const head =
    s.riser || s.limbs
      ? [s.riser?.brand, s.riser?.model].filter(Boolean).join(" ") ||
        [s.limbs?.brand, s.limbs?.model].filter(Boolean).join(" ")
      : monolithic;
  return head ? `${lbl} · ${head}` : lbl;
}

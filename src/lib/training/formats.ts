// Constants + helpers for the archery training journal.

export const WA_DIVISIONS = [
  "Recurve",
  "Compound",
  "Barebow",
  "Longbow",
  "Instinctive",
] as const;

export const WA_AGE_CATEGORIES = [
  "U13",
  "U15",
  "U18 (Cadet)",
  "U21 (Junior)",
  "Senior",
  "Masters 50+",
  "Masters 60+",
  "Masters 70+",
] as const;

// IFAA shooting styles also serve as "divisions".
export const IFAA_BOW_STYLES = [
  "BB-R · Barebow Recurve",
  "BB-C · Barebow Compound",
  "BH-C · Bowhunter Compound",
  "BH-R · Bowhunter Recurve",
  "BL · Bowhunter Limited",
  "BU · Bowhunter Unlimited",
  "CO · Crossbow",
  "FS-C · Freestyle Limited Compound",
  "FS-R · Freestyle Limited Recurve",
  "FU · Freestyle Unlimited",
  "HB · Historical Bow",
  "LB · Longbow",
  "OL · Olympic Recurve",
  "TR-C · Traditional Compound",
  "TR-R · Traditional Recurve",
] as const;

export const IFAA_AGE_CATEGORIES = [
  "Cub (<13)",
  "Junior (13–16)",
  "Young Adult (17–20)",
  "Adult (21–54)",
  "Veteran (55–64)",
  "Senior Veteran (65+)",
] as const;

export type FormatDistance = {
  label: string;
  ends: number;
  arrows_per_end: number;
  max_per_arrow: number;
};

export type ScoringType =
  | "wa_10_zone"
  | "wa_field_6_zone"
  | "wa_3d"
  | "ifaa_field_5_4_3"
  | "ifaa_indoor_5"
  | "ifaa_3d_5_4_3"
  | "ifaa_animal"
  | "custom";

/**
 * Allowed text values for an arrow per scoring system.
 * "M" = miss (0). "X" on 10-zone = 10 (inner ring).
 */
export function allowedArrowValues(scoring: ScoringType | string): string[] {
  switch (scoring) {
    case "wa_10_zone":
      return ["X", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "M"];
    case "wa_field_6_zone":
      return ["6", "5", "4", "3", "2", "1", "M"];
    case "wa_3d":
      return ["11", "10", "8", "5", "M"];
    case "ifaa_field_5_4_3":
      return ["5", "4", "3", "M"];
    case "ifaa_indoor_5":
      return ["5", "4", "3", "2", "1", "M"];
    case "ifaa_3d_5_4_3":
      return ["5", "4", "3", "M"];
    case "ifaa_animal":
      return ["21", "20", "18", "17", "16", "14", "13", "12", "10", "M"];
    default:
      return [];
  }
}

export function arrowToNumber(value: string | null | undefined): number | null {
  if (value == null) return null;
  const v = value.trim().toUpperCase();
  if (v === "") return null;
  if (v === "M") return 0;
  if (v === "X") return 10;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function sumArrows(arrows: (string | null | undefined)[]): number {
  return arrows.reduce((acc, a) => acc + (arrowToNumber(a) ?? 0), 0);
}

export function countScoredArrows(arrows: (string | null | undefined)[]): number {
  return arrows.reduce(
    (acc, a) => acc + (arrowToNumber(a) == null ? 0 : 1),
    0,
  );
}

export function buildEndStubs(
  distances: FormatDistance[],
): Array<{ sort_order: number; distance_label: string; end_number: number; arrows: string[] }> {
  const out: Array<{
    sort_order: number;
    distance_label: string;
    end_number: number;
    arrows: string[];
  }> = [];
  let order = 0;
  for (const d of distances) {
    for (let i = 1; i <= d.ends; i++) {
      out.push({
        sort_order: order++,
        distance_label: d.label,
        end_number: i,
        arrows: Array.from({ length: d.arrows_per_end }, () => ""),
      });
    }
  }
  return out;
}

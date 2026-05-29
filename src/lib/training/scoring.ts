// Scoring helpers shared by the training UI.
//
// Cell colours follow the standard archery target face:
//   X / 10 / 9  → yellow (gold)
//   8  / 7      → red
//   6  / 5      → blue
//   4  / 3      → black
//   2  / 1      → white
//   M (miss)    → green (a UI convention so misses are immediately visible)
//
// ArcherySuccess "Skill" rating
// -----------------------------
// ArcherySuccess publishes a "Skill" number on every scorecard. It is the
// archer's average arrow score expressed as a percentage of the maximum
// scoring value for that face — i.e. it normalises performance so a perfect
// round is always 100 regardless of the round type:
//
//   skill = (sum of arrow values) / (scored arrows × max per arrow) × 100
//
// For a 10-zone face (X scored as 10) this collapses to `average × 10`,
// matching the value shown on ArcherySuccess scorecards. For 6-zone field,
// IFAA 5-zone, 3D etc. the same formula scales correctly because the per-arrow
// maximum changes.

import { arrowToNumber } from "./formats";

export interface ArrowStats {
  /** Counts keyed by their UPPERCASE label, e.g. { X: 2, "10": 4, "9": 3, ... } */
  counts: Record<string, number>;
  /** Total scored arrows (excludes blanks). */
  scoredArrows: number;
  /** Sum of arrow values. */
  total: number;
  /** Average arrow score. 0 when no arrows scored. */
  average: number;
  /** Percentage of arrows that landed in the gold (X / 10 / 9). */
  goldPercent: number;
  /** ArcherySuccess-style "Skill" rating, 0–100. */
  skill: number;
}

export function computeArrowStats(
  arrows: (string | null | undefined)[],
  maxPerArrow: number,
): ArrowStats {
  const counts: Record<string, number> = {};
  let total = 0;
  let scoredArrows = 0;
  let golds = 0;

  for (const raw of arrows) {
    if (raw == null) continue;
    const label = raw.trim().toUpperCase();
    if (label === "") continue;

    const n = arrowToNumber(label);
    if (n == null) continue;

    counts[label] = (counts[label] ?? 0) + 1;
    total += n;
    scoredArrows += 1;
    if (label === "X" || n === 10 || n === 9) golds += 1;
  }

  const average = scoredArrows > 0 ? total / scoredArrows : 0;
  const goldPercent = scoredArrows > 0 ? (golds / scoredArrows) * 100 : 0;
  const skill =
    scoredArrows > 0 && maxPerArrow > 0 ? (total / (scoredArrows * maxPerArrow)) * 100 : 0;

  return { counts, scoredArrows, total, average, goldPercent, skill };
}

/**
 * Pick the cell colour classes for a single arrow input based on the standard
 * target-face colouring. The returned string is a Tailwind class list suitable
 * for an `<input>` element.
 */
export function arrowCellClasses(value: string | null | undefined): string {
  if (value == null) return "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200";
  const v = value.trim().toUpperCase();
  if (v === "") return "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200";

  if (v === "M") {
    // Miss → green so it stands out visually.
    return "bg-emerald-600 text-white border-emerald-700";
  }

  if (v === "X") {
    return "bg-amber-300 text-zinc-900 border-amber-500 font-bold";
  }

  const n = arrowToNumber(v);
  if (n == null) return "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200";

  if (n >= 9) return "bg-amber-300 text-zinc-900 border-amber-500 font-semibold";
  if (n >= 7) return "bg-red-600 text-white border-red-700 font-semibold";
  if (n >= 5) return "bg-blue-600 text-white border-blue-700 font-semibold";
  if (n >= 3) return "bg-zinc-900 text-white border-zinc-950 font-semibold";
  if (n >= 1) return "bg-white text-zinc-900 border-zinc-400";
  if (n === 0) return "bg-emerald-600 text-white border-emerald-700";

  return "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200";
}

/**
 * Ordered list of arrow labels to display in the summary panel.
 * We always include the labels relevant for the given allowed set, in the
 * canonical face order (X first, then descending numbers, then M last).
 */
export function summaryLabelOrder(allowed: string[]): string[] {
  if (allowed.length === 0) {
    return ["X", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "M"];
  }
  // Preserve allowed order — allowedArrowValues() already returns face order.
  return [...allowed];
}

/**
 * Background swatch for the per-value count chip in the summary panel.
 * Mirrors arrowCellClasses but tuned for small label/count pills.
 */
export function summaryChipClasses(label: string): string {
  const v = label.trim().toUpperCase();
  if (v === "M") return "bg-emerald-600 text-white";
  if (v === "X") return "bg-amber-300 text-zinc-900";
  const n = arrowToNumber(v);
  if (n == null) return "bg-zinc-200 text-zinc-700";
  if (n >= 9) return "bg-amber-300 text-zinc-900";
  if (n >= 7) return "bg-red-600 text-white";
  if (n >= 5) return "bg-blue-600 text-white";
  if (n >= 3) return "bg-zinc-900 text-white";
  if (n >= 1) return "bg-white text-zinc-900 border border-zinc-400";
  if (n === 0) return "bg-emerald-600 text-white";
  return "bg-zinc-200 text-zinc-700";
}

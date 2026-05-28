"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, ExternalLink, Trophy } from "lucide-react";

export interface ClubResultRow {
  id: string;
  member_id: string;
  score: number | null;
  achieved_on: string | null;
  competition_name: string | null;
  competition_id: string | null;
  discipline: string | null;
  setup: string | null;
  category: string | null;
  division: string | null;
  is_season_max: boolean;
  season: number;
}

export interface ClubMember {
  id: string;
  license_number: string;
  first_name: string | null;
  last_name: string | null;
  birth_year: number | null;
  category_target: string | null;
  category_3d: string | null;
  detail_scraped_at: string | null;
  detail_url: string | null;
}

export interface MemberAggregate {
  member: ClubMember;
  totalPoints: number;
  bestScore: number | null;
  entries: number;
  lastCompetitionOn: string | null;
}

interface Props {
  members: ClubMember[];
  aggregates: Record<string, MemberAggregate>;
  resultsByMember: Record<string, ClubResultRow[]>;
  season: number | null;
}

const UNCATEGORIZED = "Bez kategórie";

export function ClubMembersTable({ members, aggregates, resultsByMember, season }: Props) {
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byCategory = new Map<string, MemberAggregate[]>();
    for (const m of members) {
      const agg = aggregates[m.id] ?? {
        member: m,
        totalPoints: 0,
        bestScore: null,
        entries: 0,
        lastCompetitionOn: null,
      };
      const key = m.category_target?.trim() || UNCATEGORIZED;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(agg);
    }
    // Sort categories alphabetically, "Uncategorized" last.
    const cats = [...byCategory.keys()].sort((a, b) => {
      if (a === UNCATEGORIZED) return 1;
      if (b === UNCATEGORIZED) return -1;
      return a.localeCompare(b, "sk");
    });
    return cats.map((cat) => {
      const list = byCategory.get(cat)!.slice().sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        const aBest = a.bestScore ?? -1;
        const bBest = b.bestScore ?? -1;
        if (bBest !== aBest) return bBest - aBest;
        return (a.member.last_name ?? "").localeCompare(b.member.last_name ?? "", "sk");
      });
      return { category: cat, members: list };
    });
  }, [members, aggregates]);

  const openMember = openMemberId
    ? members.find((m) => m.id === openMemberId) ?? null
    : null;
  const openAggregate = openMemberId ? aggregates[openMemberId] : undefined;
  const openResults = openMemberId ? resultsByMember[openMemberId] ?? [] : [];

  return (
    <>
      {season != null && (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Poradie podľa bodov v sezóne <span className="font-semibold">{season}</span> (súčet
          bodov zo všetkých zaznamenaných výsledkov).
        </p>
      )}

      <div className="space-y-6">
        {groups.map(({ category, members: rows }) => (
          <section
            key={category}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <header className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              <span>{category}</span>
              <span className="text-xs font-normal text-zinc-500">
                {rows.length} {rows.length === 1 ? "člen" : "členov"}
              </span>
            </header>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Meno</th>
                  <th className="px-4 py-2 font-medium">Rok</th>
                  <th className="px-4 py-2 font-medium">Licencia</th>
                  <th className="px-4 py-2 font-medium text-right">Body</th>
                  <th className="px-4 py-2 font-medium text-right">Top skóre</th>
                  <th className="px-4 py-2 font-medium text-right">Štarty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((row, idx) => (
                  <tr
                    key={row.member.id}
                    onClick={() => setOpenMemberId(row.member.id)}
                    className="cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{row.member.last_name}</span>{" "}
                      {row.member.first_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {row.member.birth_year ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.member.license_number}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {row.totalPoints > 0 ? row.totalPoints : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400">
                      {row.bestScore ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500">{row.entries || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {openMember && (
        <MemberModal
          member={openMember}
          aggregate={openAggregate}
          results={openResults}
          season={season}
          onClose={() => setOpenMemberId(null)}
        />
      )}
    </>
  );
}

function MemberModal({
  member,
  aggregate,
  results,
  season,
  onClose,
}: {
  member: ClubMember;
  aggregate: MemberAggregate | undefined;
  results: ClubResultRow[];
  season: number | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const sortedResults = [...results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {member.last_name} {member.first_name}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Licencia <span className="font-mono">{member.license_number}</span>
              {member.birth_year ? ` · ${member.birth_year}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {member.category_target && (
                <Badge>Terč: {member.category_target}</Badge>
              )}
              {member.category_3d && <Badge>3D: {member.category_3d}</Badge>}
              {!member.detail_scraped_at && (
                <Badge tone="warn">Detail ešte nebol stiahnutý</Badge>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavrieť"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Body"
              value={aggregate?.totalPoints && aggregate.totalPoints > 0 ? aggregate.totalPoints : "—"}
              hint={season ? `sezóna ${season}` : undefined}
              tone="emerald"
            />
            <Stat
              label="Top skóre"
              value={aggregate?.bestScore ?? "—"}
              tone="amber"
            />
            <Stat label="Štarty" value={aggregate?.entries || "—"} />
            <Stat
              label="Posledná súťaž"
              value={
                aggregate?.lastCompetitionOn
                  ? new Date(aggregate.lastCompetitionOn).toLocaleDateString("sk-SK")
                  : "—"
              }
            />
          </div>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Trophy className="h-4 w-4 text-amber-500" /> Výsledky{" "}
              {season ? `v sezóne ${season}` : ""}
            </h3>
            {sortedResults.length === 0 ? (
              <p className="text-sm text-zinc-500">Žiadne zaznamenané výsledky.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Body</th>
                      <th className="px-3 py-2 font-medium">Dátum</th>
                      <th className="px-3 py-2 font-medium">Súťaž</th>
                      <th className="px-3 py-2 font-medium">Disciplína</th>
                      <th className="px-3 py-2 font-medium">Divízia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {sortedResults.slice(0, 25).map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-mono font-semibold text-amber-600 dark:text-amber-400">
                          {r.score ?? "—"}
                          {r.is_season_max && (
                            <span className="ml-1 text-[10px] uppercase text-emerald-600 dark:text-emerald-400">
                              max
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          {r.achieved_on
                            ? new Date(r.achieved_on).toLocaleDateString("sk-SK")
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {r.competition_id && r.competition_name ? (
                            <Link
                              href={`/competitions/${r.competition_id}${
                                r.category
                                  ? `?category=${encodeURIComponent(r.category)}`
                                  : ""
                              }`}
                              className="text-emerald-700 hover:underline dark:text-emerald-400"
                              prefetch={false}
                              title="Zobraziť výsledky súťaže v tejto kategórii"
                            >
                              {r.competition_name}
                            </Link>
                          ) : (
                            r.competition_name ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          {r.discipline ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          {r.division ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedResults.length > 25 && (
                  <p className="px-3 py-2 text-xs text-zinc-500">
                    Zobrazených prvých 25 výsledkov z {sortedResults.length}.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <Link
            href={`/members/${member.license_number}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            prefetch={false}
          >
            Otvoriť celý profil →
          </Link>
          {member.detail_url && (
            <a
              href={member.detail_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              slz.sk <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "emerald" | "amber";
}) {
  const colour =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-0.5 font-mono text-lg font-semibold ${colour}`}>{value}</p>
      {hint && <p className="text-[10px] text-zinc-500">{hint}</p>}
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn";
}) {
  const map = {
    neutral:
      "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    warn: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  } as const;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

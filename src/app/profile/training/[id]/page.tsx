import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/roles";
import type {
  TrainingFormatRow,
  TrainingSessionEndRow,
} from "@/lib/supabase/types";
import { ScoringForm } from "./scoring-form";

export const dynamic = "force-dynamic";

export default async function TrainingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("training_sessions")
    .select(
      "id, session_date, division, age_category, bow_style, location, weather, notes, total_score, total_arrows, bow_setup_id, format:training_formats(*), bow_setup:equipment_bow_setups(id, name, bow_type, brand, model, draw_weight_lbs, riser:equipment_risers(name, brand, model), limbs:equipment_limbs(name, brand, model, draw_weight_lbs), arrows:equipment_arrows(name, brand, model, spine, shaft_type))",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) notFound();
  const format = (Array.isArray(session.format) ? session.format[0] : session.format) as
    | TrainingFormatRow
    | null;
  if (!format) notFound();
  const setup = Array.isArray(session.bow_setup) ? session.bow_setup[0] : session.bow_setup;

  const { data: ends } = await supabase
    .from("training_session_ends")
    .select("*")
    .eq("session_id", id)
    .order("sort_order");

  return (
    <PageShell>
      <Link
        href="/profile/training"
        className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Späť na denníky
      </Link>

      <header className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{format.name}</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {new Date(session.session_date).toLocaleDateString("sk-SK")}
              {session.location ? ` · ${session.location}` : ""}
              {session.weather ? ` · ${session.weather}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge>{format.organisation}</Badge>
              {(session.division || session.bow_style) && (
                <Badge>{session.division || session.bow_style}</Badge>
              )}
              {session.age_category && <Badge>{session.age_category}</Badge>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Celkové skóre</p>
            <p className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {session.total_score ?? 0}
              {format.max_score ? (
                <span className="ml-1 text-base font-normal text-zinc-500">
                  / {format.max_score}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-zinc-500">{session.total_arrows ?? 0} šípov</p>
            <Link
              href={`/profile/training/${session.id}/edit`}
              className="mt-2 inline-block text-xs text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Upraviť tréning →
            </Link>
          </div>
        </div>
        {session.notes && (
          <p className="mt-4 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            {session.notes}
          </p>
        )}
        {setup && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Bow setup
                </p>
                <p className="font-semibold">{setup.name}</p>
              </div>
              <Link
                href="/profile/equipment"
                className="text-xs text-emerald-700 hover:underline dark:text-emerald-400"
              >
                spravovať →
              </Link>
            </div>
            <ul className="mt-2 grid gap-1 text-xs text-zinc-700 dark:text-zinc-200 sm:grid-cols-2">
              <li>
                <span className="text-zinc-500">Typ luku:</span> {String(setup.bow_type)}
                {setup.draw_weight_lbs ? ` · ${setup.draw_weight_lbs} lbs` : ""}
              </li>
              {(() => {
                const r = Array.isArray(setup.riser) ? setup.riser[0] : setup.riser;
                return r ? (
                  <li>
                    <span className="text-zinc-500">Riser:</span>{" "}
                    {[r.brand, r.model].filter(Boolean).join(" ") || r.name}
                  </li>
                ) : null;
              })()}
              {(() => {
                const l = Array.isArray(setup.limbs) ? setup.limbs[0] : setup.limbs;
                return l ? (
                  <li>
                    <span className="text-zinc-500">Limby:</span>{" "}
                    {[l.brand, l.model].filter(Boolean).join(" ") || l.name}
                    {l.draw_weight_lbs ? ` · ${l.draw_weight_lbs} lbs` : ""}
                  </li>
                ) : null;
              })()}
              {(() => {
                const a = Array.isArray(setup.arrows) ? setup.arrows[0] : setup.arrows;
                return a ? (
                  <li>
                    <span className="text-zinc-500">Šípy:</span>{" "}
                    {[a.brand, a.model].filter(Boolean).join(" ") || a.name}
                    {a.spine ? ` · spine ${a.spine}` : ""}
                    {a.shaft_type ? ` · ${a.shaft_type}` : ""}
                  </li>
                ) : null;
              })()}
              {!setup.riser && !setup.limbs && (setup.brand || setup.model) && (
                <li>
                  <span className="text-zinc-500">Luk:</span>{" "}
                  {[setup.brand, setup.model].filter(Boolean).join(" ")}
                </li>
              )}
            </ul>
          </div>
        )}
      </header>

      <ScoringForm
        sessionId={session.id}
        scoringType={format.scoring_type}
        initialEnds={((ends ?? []) as TrainingSessionEndRow[]).map((e) => ({
          id: e.id,
          sort_order: e.sort_order,
          distance_label: e.distance_label,
          end_number: e.end_number,
          arrows: (e.arrows ?? []) as string[],
          end_total: e.end_total ?? 0,
        }))}
        isCustom={format.scoring_type === "custom"}
      />
    </PageShell>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </span>
  );
}

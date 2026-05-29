import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/roles";
import type { TrainingFormatRow, EquipmentBowSetupRow } from "@/lib/supabase/types";
import { TrainingForm } from "../../_form/training-form";

export const dynamic = "force-dynamic";

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const [sessionRes, formatsRes, setupsRes] = await Promise.all([
    supabase
      .from("training_sessions")
      .select(
        "id, format_id, session_date, division, age_category, bow_style, bow_setup_id, location, weather, notes",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("training_formats").select("*").order("sort_order"),
    supabase
      .from("equipment_bow_setups")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false }),
  ]);

  if (!sessionRes.data) notFound();
  const s = sessionRes.data;

  return (
    <PageShell>
      <Link
        href={`/profile/training/${id}`}
        className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Späť na tréning
      </Link>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Upraviť tréning</h1>

      <TrainingForm
        formats={(formatsRes.data ?? []) as TrainingFormatRow[]}
        bowSetups={(setupsRes.data ?? []) as EquipmentBowSetupRow[]}
        initial={{
          id: s.id,
          format_id: s.format_id,
          session_date: s.session_date,
          division: s.division,
          age_category: s.age_category,
          bow_style: s.bow_style,
          bow_setup_id: s.bow_setup_id,
          location: s.location,
          weather: s.weather,
          notes: s.notes,
        }}
      />
    </PageShell>
  );
}

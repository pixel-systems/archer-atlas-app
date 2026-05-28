import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/roles";
import type { TrainingFormatRow } from "@/lib/supabase/types";
import { NewTrainingForm } from "./new-training-form";

export const dynamic = "force-dynamic";

export default async function NewTrainingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: formats } = await supabase
    .from("training_formats")
    .select("*")
    .order("sort_order");

  return (
    <PageShell>
      <Link
        href="/profile/training"
        className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
      >
        ← Späť na denníky
      </Link>
      <h1 className="mt-1 mb-6 text-3xl font-bold tracking-tight">Nový tréning</h1>

      <NewTrainingForm formats={(formats ?? []) as TrainingFormatRow[]} />
    </PageShell>
  );
}

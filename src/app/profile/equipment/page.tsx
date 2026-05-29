import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/roles";
import type {
  EquipmentArrowRow,
  EquipmentBowSetupRow,
  EquipmentLimbRow,
  EquipmentRiserRow,
} from "@/lib/supabase/types";
import { EquipmentManager } from "./equipment-manager";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();

  const [risersRes, limbsRes, arrowsRes, setupsRes] = await Promise.all([
    supabase
      .from("equipment_risers")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("equipment_limbs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("equipment_arrows")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("equipment_bow_setups")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <PageShell>
      <Link
        href="/profile"
        className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Späť na profil
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Moja výbava</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Spravujte komponenty (rizery, limby, šípy) nezávisle a kombinujte ich do
          pomenovaných „bow setupov“, ktoré priradíte k tréningu.
        </p>
      </header>

      <EquipmentManager
        userId={user.id}
        initialRisers={(risersRes.data ?? []) as EquipmentRiserRow[]}
        initialLimbs={(limbsRes.data ?? []) as EquipmentLimbRow[]}
        initialArrows={(arrowsRes.data ?? []) as EquipmentArrowRow[]}
        initialSetups={(setupsRes.data ?? []) as EquipmentBowSetupRow[]}
      />
    </PageShell>
  );
}

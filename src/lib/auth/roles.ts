import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/types";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getCurrentRole(): Promise<AppRole | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) return "user";
  return (data?.role as AppRole | undefined) ?? "user";
}

export async function requireAdmin() {
  const role = await getCurrentRole();
  if (role !== "admin") {
    throw new Error("Forbidden");
  }
}

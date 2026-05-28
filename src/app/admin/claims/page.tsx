import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClaimsTable } from "./claims-table";

export const dynamic = "force-dynamic";

export default async function AdminClaimsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase
    .from("member_claims")
    .select(
      "id, status, note, created_at, profile_id, member_id, member:members(first_name, last_name, license_number), profile:profiles(display_name, contact_email)",
    )
    .order("created_at", { ascending: false });

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-lg font-semibold tracking-tight">Žiadosti o prepojenie</h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
        Schvaľujte / zamietajte žiadosti používateľov o prepojenie s členskou licenciou.
      </p>
      <ClaimsTable
        claims={(claims ?? []).map((c) => ({
          id: c.id,
          status: c.status,
          note: c.note,
          created_at: c.created_at,
          profile_id: c.profile_id,
          member_id: c.member_id,
          member: Array.isArray(c.member) ? c.member[0] : c.member,
          profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
        }))}
      />
    </section>
  );
}

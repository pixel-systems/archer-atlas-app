import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/roles";
import { RolesTable, type UserRow } from "./roles-table";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const me = await getCurrentUser();
  const admin = createSupabaseAdminClient();

  // List all auth users (paginated; bump perPage if you grow past 1k accounts).
  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  const { data: roles, error: rolesErr } = await admin
    .from("app_roles")
    .select("user_id, role, created_at");

  const roleByUser = new Map<string, { role: "user" | "admin"; created_at: string }>();
  for (const r of roles ?? []) {
    roleByUser.set(r.user_id, { role: r.role, created_at: r.created_at });
  }

  const rows: UserRow[] = (usersData?.users ?? [])
    .map((u) => {
      const r = roleByUser.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        provider: (u.app_metadata as { provider?: string } | null)?.provider ?? null,
        role: r?.role ?? "user",
        has_role_row: !!r,
        is_self: u.id === me?.id,
      };
    })
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return (a.email ?? "").localeCompare(b.email ?? "");
    });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Roly používateľov</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Spravujte administrátorské oprávnenia. Bežní používatelia bez záznamu majú
          rolu <code>user</code> automaticky.
        </p>
      </header>

      {usersErr && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Chyba pri načítaní používateľov: {usersErr.message}
        </div>
      )}
      {rolesErr && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Chyba pri načítaní rolí: {rolesErr.message}
        </div>
      )}

      <RolesTable rows={rows} />
    </div>
  );
}

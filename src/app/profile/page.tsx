import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/auth/roles";
import { ProfileForm } from "./profile-form";
import { ClaimForm } from "./claim-form";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_url, contact_email, member_id, member:members(first_name, last_name, license_number)")
    .eq("id", user.id)
    .maybeSingle();

  const { data: claims } = await supabase
    .from("member_claims")
    .select("id, status, note, created_at, member:members(first_name, last_name, license_number)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const member = Array.isArray(profile?.member) ? profile?.member[0] : profile?.member;

  const role = await getCurrentRole();
  const { data: rawRoleRow, error: rawRoleErr } = await supabase
    .from("app_roles")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <PageShell>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Môj profil</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-900 dark:bg-amber-950">
        <p className="mb-1 font-semibold text-amber-900 dark:text-amber-200">Debug: rola & identita</p>
        <ul className="space-y-0.5 font-mono text-amber-900/90 dark:text-amber-100/90">
          <li>auth.uid() = <code>{user.id}</code></li>
          <li>email = <code>{user.email}</code></li>
          <li>detected role = <code>{role ?? "null"}</code></li>
          <li>app_roles row for me = <code>{rawRoleRow ? JSON.stringify(rawRoleRow) : "none"}</code></li>
          {rawRoleErr && <li>query error = <code>{rawRoleErr.message}</code></li>}
        </ul>
        <p className="mt-2 text-amber-800 dark:text-amber-200/80">
          Ak je &quot;app_roles row for me&quot; = none, vlož do tabuľky riadok{" "}
          <code>insert into public.app_roles(user_id, role) values (&apos;{user.id}&apos;, &apos;admin&apos;);</code>{" "}
          a obnov stránku.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Údaje profilu</h2>
          <ProfileForm
            initial={{
              display_name: profile?.display_name ?? "",
              bio: profile?.bio ?? "",
              avatar_url: profile?.avatar_url ?? "",
              contact_email: profile?.contact_email ?? user.email ?? "",
            }}
          />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Prepojenie s SLZ členstvom</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
            Zadajte vaše číslo licencie. Po schválení adminom sa profil prepojí s vašou
            kartou športovca.
          </p>

          {member ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              Prepojené s <strong>{member.last_name} {member.first_name}</strong> (licencia{" "}
              <span className="font-mono">{member.license_number}</span>).
            </div>
          ) : (
            <ClaimForm />
          )}

          {(claims?.length ?? 0) > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Vaše žiadosti
              </h3>
              <ul className="space-y-2 text-sm">
                {(claims ?? []).map((c) => {
                  const m = Array.isArray(c.member) ? c.member[0] : c.member;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <span>
                        {m ? `${m.last_name} ${m.first_name} (${m.license_number})` : "—"}
                      </span>
                      <StatusBadge status={c.status} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
      {status === "pending" ? "čaká" : status === "approved" ? "schválené" : "zamietnuté"}
    </span>
  );
}

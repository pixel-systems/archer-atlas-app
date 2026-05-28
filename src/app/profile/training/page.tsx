import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function TrainingListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: sessions } = await supabase
    .from("training_sessions")
    .select(
      "id, session_date, division, age_category, bow_style, location, total_score, total_arrows, format:training_formats(name, max_score, organisation)",
    )
    .eq("user_id", user.id)
    .order("session_date", { ascending: false });

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/profile"
            className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
          >
            ← Profil
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Tréningové denníky
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Záznamy vašich tréningov a kontrolných streľb (WA & IFAA formáty).
          </p>
        </div>
        <Link
          href="/profile/training/new"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Nový tréning
        </Link>
      </header>

      {(sessions?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          Zatiaľ žiadne záznamy. Vytvorte prvý tréning kliknutím na{" "}
          <strong>Nový tréning</strong>.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Dátum</th>
                <th className="px-4 py-2 font-medium">Formát</th>
                <th className="px-4 py-2 font-medium">Divízia</th>
                <th className="px-4 py-2 font-medium">Kategória</th>
                <th className="px-4 py-2 font-medium text-right">Skóre</th>
                <th className="px-4 py-2 font-medium text-right">Šípy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(sessions ?? []).map((s) => {
                const fmt = Array.isArray(s.format) ? s.format[0] : s.format;
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/training/${s.id}`}
                        className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {new Date(s.session_date).toLocaleDateString("sk-SK")}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {fmt?.organisation}
                      </span>{" "}
                      {fmt?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {s.division || s.bow_style || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {s.age_category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {s.total_score ?? "—"}
                      {fmt?.max_score ? (
                        <span className="ml-1 text-xs font-normal text-zinc-500">
                          / {fmt.max_score}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500">
                      {s.total_arrows ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

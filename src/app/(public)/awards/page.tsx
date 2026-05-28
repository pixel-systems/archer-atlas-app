import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AwardRow = {
  id: string;
  award_type: string;
  award_level: string | null;
  year: number | null;
  member:
    | { first_name: string; last_name: string; license_number: string }
    | { first_name: string; last_name: string; license_number: string }[]
    | null;
};

export default async function AwardsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: awards } = await supabase
    .from("awards")
    .select(
      "id, award_type, award_level, year, member:members(first_name, last_name, license_number)",
    )
    .order("year", { ascending: false, nullsFirst: false })
    .limit(500)
    .returns<AwardRow[]>();

  // Group by award_type
  const grouped = new Map<string, AwardRow[]>();
  (awards ?? []).forEach((a) => {
    if (!grouped.has(a.award_type)) grouped.set(a.award_type, []);
    grouped.get(a.award_type)!.push(a);
  });

  return (
    <PageShell>
      <h1 className="text-3xl font-bold tracking-tight">Ocenenia</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">
        Nositelia ocenení WA a SLZ.
      </p>

      {(awards?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          Žiadne ocenenia. Spustite scrape v admin sekcii.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([type, items]) => (
            <section key={type}>
              <h2 className="mb-2 text-lg font-semibold tracking-tight">{type}</h2>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {(items ?? []).map((a) => {
                      const member = Array.isArray(a.member) ? a.member[0] : a.member;
                      return (
                        <tr key={a.id}>
                          <td className="px-4 py-2.5">
                            {member ? (
                              <>
                                <span className="font-medium">{member.last_name}</span>{" "}
                                {member.first_name}
                              </>
                            ) : (
                              <span className="text-zinc-500">Neznámy člen</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-300">
                            {a.award_level ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-zinc-500">{a.year ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

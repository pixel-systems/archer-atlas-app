import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!club) notFound();

  const { data: members } = await supabase
    .from("members")
    .select("id, license_number, first_name, last_name, birth_year, category_target, category_3d")
    .eq("club_id", club.id)
    .order("last_name");

  return (
    <PageShell>
      <Link href="/clubs" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← Späť na kluby
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{club.name}</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">{members?.length ?? 0} členov</p>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Meno</th>
              <th className="px-4 py-3 font-medium">Rok</th>
              <th className="px-4 py-3 font-medium">Licencia</th>
              <th className="px-4 py-3 font-medium">Terč</th>
              <th className="px-4 py-3 font-medium">3D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(members ?? []).map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <span className="font-medium">{m.last_name}</span> {m.first_name}
                </td>
                <td className="px-4 py-3 text-zinc-500">{m.birth_year ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.license_number}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{m.category_target ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{m.category_3d ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

import Link from "next/link";
import { PageShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const supabase = await createSupabaseServerClient();
  const t = await getT();
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, slug, code, logo_url, website_url, members:members(count)")
    .order("name");

  return (
    <PageShell>
      <h1 className="text-3xl font-bold tracking-tight">{t.clubs.title}</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">{t.clubs.subtitle}</p>

      {(clubs?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          {t.members.empty}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(clubs ?? []).map((c) => {
            const count = Array.isArray(c.members) ? (c.members[0]?.count ?? 0) : 0;
            return (
              <Link
                key={c.id}
                href={`/clubs/${c.slug}`}
                className="group flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo_url}
                      alt={c.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs font-mono text-zinc-400">
                      {c.code ?? "—"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    {c.code && (
                      <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        {c.code}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {count} {t.clubs.members.toLowerCase()}
                    {c.website_url && (
                      <>
                        {" · "}
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {hostname(c.website_url)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

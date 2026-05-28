import Link from "next/link";
import { ArrowRight, Award, Target, Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";

export default function HomePage() {
  return (
    <PageShell>
      <section className="rounded-2xl border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-600">
          Slovenský lukostrelecký zväz
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Archer Atlas</h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
          Moderné rozhranie pre údaje o členoch, kluboch, výsledkoch a oceneniach
          slovenskej lukostre&shy;leckej komunity. Údaje sú denne synchronizované zo
          stránky slz.sk.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/members"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Prehliadnuť členov <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/results"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Posledné výsledky <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Users} title="Členovia" href="/members" desc="Vyhľadávanie a profily." />
        <Card icon={Target} title="Kluby" href="/clubs" desc="Klubová príslušnosť." />
        <Card icon={Trophy} title="Výsledky" href="/results" desc="Súťaže a archív." />
        <Card icon={Award} title="Ocenenia" href="/awards" desc="WA/SLZ ocenenia." />
      </section>
    </PageShell>
  );
}

function Card({
  icon: Icon,
  title,
  href,
  desc,
}: {
  icon: typeof Users;
  title: string;
  href: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Icon className="h-6 w-6 text-emerald-600" />
      <div className="mt-3 font-semibold">{title}</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{desc}</div>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 group-hover:gap-2 transition-all dark:text-emerald-400">
        Zobraziť <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

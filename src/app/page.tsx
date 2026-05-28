import Link from "next/link";
import { ArrowRight, Award, Target, Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { getT } from "@/lib/i18n/server";

export default async function HomePage() {
  const t = await getT();
  return (
    <PageShell>
      <section className="rounded-2xl border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-600">
          {t.home.eyebrow}
        </p>
        <h1 className="text-4xl font-bold tracking-tight">{t.home.title}</h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">{t.home.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/members"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            {t.home.ctaMembers} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/results"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t.home.ctaResults} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Users} title={t.home.cards.members.title} href="/members" desc={t.home.cards.members.desc} show={t.home.show} />
        <Card icon={Target} title={t.home.cards.clubs.title} href="/clubs" desc={t.home.cards.clubs.desc} show={t.home.show} />
        <Card icon={Trophy} title={t.home.cards.results.title} href="/results" desc={t.home.cards.results.desc} show={t.home.show} />
        <Card icon={Award} title={t.home.cards.awards.title} href="/awards" desc={t.home.cards.awards.desc} show={t.home.show} />
      </section>
    </PageShell>
  );
}

function Card({
  icon: Icon,
  title,
  href,
  desc,
  show,
}: {
  icon: typeof Users;
  title: string;
  href: string;
  desc: string;
  show: string;
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
        {show} <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

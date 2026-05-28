import Link from "next/link";
import type { ReactNode } from "react";
import { Target } from "lucide-react";
import { getCurrentUser, getCurrentRole } from "@/lib/auth/roles";
import { getLocale, getT } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const role = await getCurrentRole();
  const locale = await getLocale();
  const t = await getT();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Target className="h-5 w-5 text-emerald-600" />
          <span>Archer Atlas</span>
        </Link>
        <nav className="hidden gap-5 text-sm text-zinc-600 sm:flex dark:text-zinc-300">
          <NavLink href="/members" label={t.nav.members} />
          <NavLink href="/clubs" label={t.nav.clubs} />
          <NavLink href="/competitions" label={t.nav.competitions} />
          <NavLink href="/results" label={t.nav.results} />
          <NavLink href="/awards" label={t.nav.awards} />
          <NavLink href="/calendar" label={t.nav.calendar} />
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <LanguageSwitcher current={locale} labels={{ sk: t.language.sk, en: t.language.en }} />
          {role === "admin" && (
            <Link
              href="/admin/scraping"
              className="rounded-md border border-emerald-600/30 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
            >
              {t.nav.admin}
            </Link>
          )}
          {user ? (
            <Link
              href="/profile"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              {t.nav.profile}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              {t.nav.signIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
    >
      {label}
    </Link>
  );
}

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
      {t.footer.dataFrom}{" "}
      <a className="underline" href="https://slz.sk" target="_blank" rel="noreferrer">
        slz.sk
      </a>
      {t.footer.notOfficial}
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>;
}

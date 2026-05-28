import Link from "next/link";
import type { ReactNode } from "react";
import { Target } from "lucide-react";
import { getCurrentUser, getCurrentRole } from "@/lib/auth/roles";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const role = await getCurrentRole();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Target className="h-5 w-5 text-emerald-600" />
          <span>Archer Atlas</span>
        </Link>
        <nav className="hidden gap-5 text-sm text-zinc-600 sm:flex dark:text-zinc-300">
          <NavLink href="/members" label="Členovia" />
          <NavLink href="/clubs" label="Kluby" />
          <NavLink href="/competitions" label="Súťaže" />
          <NavLink href="/results" label="Výsledky" />
          <NavLink href="/awards" label="Ocenenia" />
          <NavLink href="/calendar" label="Kalendár" />
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {role === "admin" && (
            <Link
              href="/admin/scraping"
              className="rounded-md border border-emerald-600/30 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
            >
              Admin
            </Link>
          )}
          {user ? (
            <Link
              href="/profile"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              Profil
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              Prihlásiť
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

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
      Údaje pochádzajú z verejne dostupných zdrojov{" "}
      <a className="underline" href="https://slz.sk" target="_blank" rel="noreferrer">
        slz.sk
      </a>
      . Archer Atlas nie je oficiálnou stránkou SLZ.
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>;
}

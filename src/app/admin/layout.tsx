import { redirect } from "next/navigation";
import Link from "next/link";
import { Database, ShieldCheck, Users } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { getCurrentRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/");

  return (
    <PageShell>
      <header className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      </header>
      <nav className="mb-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <TabLink href="/admin/scraping" icon={<Database className="h-4 w-4" />}>
          Scraping
        </TabLink>
        <TabLink href="/admin/claims" icon={<ShieldCheck className="h-4 w-4" />}>
          Žiadosti o prepojenie
        </TabLink>
        <TabLink href="/admin/roles" icon={<Users className="h-4 w-4" />}>
          Roly
        </TabLink>
      </nav>
      {children}
    </PageShell>
  );
}

function TabLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm font-medium text-zinc-600 hover:border-emerald-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
    >
      {icon}
      {children}
    </Link>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, User as UserIcon } from "lucide-react";

export interface UserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string | null;
  role: "user" | "admin";
  has_role_row: boolean;
  is_self: boolean;
}

interface Props {
  rows: UserRow[];
}

export function RolesTable({ rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  async function setRole(userId: string, role: "user" | "admin") {
    setError(null);
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = rows.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (r.email ?? "").toLowerCase().includes(q) || r.id.includes(q);
  });

  const adminCount = rows.filter((r) => r.role === "admin").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Hľadať podľa emailu alebo user_id…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div className="text-xs text-zinc-500">
          {rows.length} používateľov · {adminCount} {adminCount === 1 ? "admin" : "adminov"}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Používateľ</th>
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Posledné prihlásenie</th>
              <th className="px-4 py-2 font-medium">Rola</th>
              <th className="px-4 py-2 font-medium text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((r) => (
              <tr key={r.id} className={r.is_self ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""}>
                <td className="px-4 py-2">
                  <div className="font-medium">{r.email ?? "—"}</div>
                  <div className="font-mono text-[10px] text-zinc-400">{r.id}</div>
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-300">{r.provider ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-300">
                  {r.last_sign_in_at
                    ? new Date(r.last_sign_in_at).toLocaleString("sk-SK")
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  {r.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                      <ShieldCheck className="h-3 w-3" /> admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <UserIcon className="h-3 w-3" /> user
                    </span>
                  )}
                  {r.is_self && (
                    <span className="ml-2 text-[10px] text-emerald-700 dark:text-emerald-400">
                      (vy)
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.role === "admin" ? (
                    <button
                      type="button"
                      disabled={pending || busyId === r.id || r.is_self}
                      onClick={() => setRole(r.id, "user")}
                      className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      title={r.is_self ? "Nemôžete si odobrať admina sami sebe" : "Demote to user"}
                    >
                      {busyId === r.id ? "…" : "Demote → user"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending || busyId === r.id}
                      onClick={() => setRole(r.id, "admin")}
                      className="rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {busyId === r.id ? "…" : "Promote → admin"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-500">
                  Nenašli sa žiadni používatelia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

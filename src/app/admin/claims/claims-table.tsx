"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface Claim {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  profile_id: string;
  member_id: string;
  member: { first_name: string; last_name: string; license_number: string } | null | undefined;
  profile: { display_name: string | null; contact_email: string | null } | null | undefined;
}

export function ClaimsTable({ claims }: { claims: Claim[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(claim: Claim, decision: "approved" | "rejected") {
    setBusyId(claim.id);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id ?? null;

    const { error: claimErr } = await supabase
      .from("member_claims")
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        decided_by: adminId,
      })
      .eq("id", claim.id);

    if (claimErr) {
      setError(claimErr.message);
      setBusyId(null);
      return;
    }

    if (decision === "approved") {
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ member_id: claim.member_id, updated_at: new Date().toISOString() })
        .eq("id", claim.profile_id);
      if (profErr) {
        setError(profErr.message);
        setBusyId(null);
        return;
      }
    }

    setBusyId(null);
    startTransition(() => router.refresh());
  }

  if (claims.length === 0) {
    return <p className="text-sm text-zinc-500">Žiadne žiadosti.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Používateľ</th>
              <th className="px-4 py-2.5 font-medium">Žiada o člena</th>
              <th className="px-4 py-2.5 font-medium">Poznámka</th>
              <th className="px-4 py-2.5 font-medium">Stav</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {claims.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{c.profile?.display_name ?? "—"}</div>
                  <div className="text-xs text-zinc-500">{c.profile?.contact_email ?? ""}</div>
                </td>
                <td className="px-4 py-3">
                  {c.member ? (
                    <>
                      <div className="font-medium">
                        {c.member.last_name} {c.member.first_name}
                      </div>
                      <div className="font-mono text-xs text-zinc-500">
                        {c.member.license_number}
                      </div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{c.note ?? "—"}</td>
                <td className="px-4 py-3">{c.status}</td>
                <td className="px-4 py-3 text-right">
                  {c.status === "pending" ? (
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => decide(c, "approved")}
                        disabled={busyId === c.id}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Schváliť
                      </button>
                      <button
                        onClick={() => decide(c, "rejected")}
                        disabled={busyId === c.id}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <X className="h-3.5 w-3.5" />
                        Zamietnuť
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

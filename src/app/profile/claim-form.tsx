"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ClaimForm() {
  const [license, setLicense] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage("Nie ste prihlásený.");
      setStatus("error");
      return;
    }

    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("id, first_name, last_name")
      .eq("license_number", license.trim())
      .maybeSingle();

    if (memberErr || !member) {
      setMessage("Člen so zadanou licenciou nebol nájdený.");
      setStatus("error");
      return;
    }

    const { error: insertErr } = await supabase.from("member_claims").insert({
      profile_id: userData.user.id,
      member_id: member.id,
      status: "pending",
      note: note || null,
    });

    if (insertErr) {
      setMessage(insertErr.message);
      setStatus("error");
    } else {
      setStatus("saved");
      setMessage(`Žiadosť odoslaná pre ${member.last_name} ${member.first_name}.`);
      setLicense("");
      setNote("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Číslo licencie
        </span>
        <input
          required
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          placeholder="napr. 2664"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Poznámka pre admina (voliteľné)
        </span>
        <textarea
          rows={2}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {status === "saving" ? "Odosielam…" : "Požiadať o prepojenie"}
      </button>
      {message && (
        <p
          className={`text-sm ${
            status === "error" ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}

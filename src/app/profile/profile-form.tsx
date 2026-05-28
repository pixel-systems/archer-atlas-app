"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface Props {
  initial: {
    display_name: string;
    bio: string;
    avatar_url: string;
    contact_email: string;
  };
}

export function ProfileForm({ initial }: Props) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Nie ste prihlásený.");
      setStatus("error");
      return;
    }

    const { error: upError } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name || null,
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        contact_email: form.contact_email || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.user.id);

    if (upError) {
      setError(upError.message);
      setStatus("error");
    } else {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Zobrazované meno">
        <input
          className="input"
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
        />
      </Field>
      <Field label="Kontaktný e-mail">
        <input
          type="email"
          className="input"
          value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
        />
      </Field>
      <Field label="Avatar URL">
        <input
          className="input"
          value={form.avatar_url}
          onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
          placeholder="https://…"
        />
      </Field>
      <Field label="O mne">
        <textarea
          rows={4}
          className="input"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {status === "saving" ? "Ukladám…" : "Uložiť"}
        </button>
        {status === "saved" && <span className="text-sm text-emerald-700">Uložené.</span>}
        {status === "error" && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(212 212 216);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        :global(.dark) .input {
          border-color: rgb(63 63 70);
          background: rgb(24 24 27);
          color: rgb(244 244 245);
        }
        .input:focus {
          outline: none;
          border-color: rgb(16 185 129);
          box-shadow: 0 0 0 3px rgb(16 185 129 / 0.2);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

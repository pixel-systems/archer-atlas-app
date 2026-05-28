"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";

type Locale = "sk" | "en";

export function LanguageSwitcher({
  current,
  labels,
}: {
  current: Locale;
  labels: { sk: string; en: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white p-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
      <Languages className="ml-1.5 h-3.5 w-3.5 text-zinc-400" aria-hidden />
      <button
        type="button"
        onClick={() => setLocale("sk")}
        disabled={pending || current === "sk"}
        title={labels.sk}
        className={`rounded px-2 py-1 font-medium transition-colors ${
          current === "sk"
            ? "bg-emerald-600 text-white"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        SK
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        disabled={pending || current === "en"}
        title={labels.en}
        className={`rounded px-2 py-1 font-medium transition-colors ${
          current === "en"
            ? "bg-emerald-600 text-white"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        EN
      </button>
    </div>
  );
}

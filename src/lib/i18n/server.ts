import { cookies } from "next/headers";
import { sk } from "./sk";
import { en } from "./en";
import type { Dictionary } from "./types";

export type Locale = "sk" | "en";
export const DEFAULT_LOCALE: Locale = "sk";
export const LOCALE_COOKIE = "NEXT_LOCALE";

const DICTS: Record<Locale, Dictionary> = { sk, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const val = c.get(LOCALE_COOKIE)?.value;
  if (val === "en" || val === "sk") return val;
  return DEFAULT_LOCALE;
}

export async function getT(): Promise<Dictionary> {
  const locale = await getLocale();
  return getDictionary(locale);
}

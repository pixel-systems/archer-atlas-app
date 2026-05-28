import { CalendarDays, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/layout/site-shell";
import { getT } from "@/lib/i18n/server";

export const metadata = {
  title: "Calendar — Archer Atlas",
  description: "Slovak Archery Federation events and competitions calendar.",
};

// Re-build at most once an hour; the iframe content itself is always live anyway.
export const revalidate = 3600;

// Calendar source IDs (Google base64-encoded). Original URL provided by SLZ.
const CALENDAR_SRCS_B64 = [
  "YXJjaGVyeXNsb3Zha2lhQGdtYWlsLmNvbQ",
  "bzFpb2R2aWQ5a2lybDc1ZGNmODQ4bGludG9AZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
  "cHRuMWxjcDdudDloaW9oYm5nN3FvbDM2a2tAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
  "Mm50MW00NzhkNW8zYmQzaHAzZ2FuYjdzMmdAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
  "ZWQ0MzAzNGNjNTdlZTgzYmVmMTk5Y2NkNDcwMWE4YzFhYjJmMDIxZDZmODEwNzA2YTdmZjJkNTgwOTVmY2M1ZEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t",
  "YjI0ZmIxNmRmYWIwNWY4ODMzOTEzOWY5YjBhZmZhZTVjMGI4YzdmZjJhMWFmMGI0MWMwMjBmNDNkNjM4NDFjNkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t",
  "YzhuZ3JucHIycWNkMmNtZWFiMTExMjBpYzhAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
];

// Per-calendar event colours (mirror the original embed link).
const CALENDAR_COLORS = [
  "%233f51b5",
  "%23f09300",
  "%2333b679",
  "%239e69af",
  "%23795548",
  "%23e4c441",
  "%23e67c73",
];

function buildEmbedUrl(mode: "AGENDA" | "MONTH" | "WEEK"): string {
  const base = "https://calendar.google.com/calendar/embed";
  const params = new URLSearchParams({
    height: "800",
    wkst: "2",
    ctz: "Europe/Bratislava",
    bgcolor: "%23ffffff",
    showPrint: "0",
    showCalendars: "1",
    showTabs: "1",
    showTz: "0",
    mode,
  });
  let qs = params.toString();
  for (const src of CALENDAR_SRCS_B64) {
    qs += `&src=${src}`;
  }
  for (const color of CALENDAR_COLORS) {
    qs += `&color=${color}`;
  }
  return `${base}?${qs}`;
}

const PUBLIC_OPEN_URL = `https://calendar.google.com/calendar/u/0/r?${CALENDAR_SRCS_B64.map(
  (s) => `cid=${s}`,
).join("&")}`;

export default async function CalendarPage() {
  const embedUrl = buildEmbedUrl("AGENDA");
  const t = await getT();

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <CalendarDays className="h-7 w-7 text-emerald-600" />
            {t.calendar.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{t.calendar.subtitle}</p>
        </div>
        <a
          href={PUBLIC_OPEN_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t.calendar.openInGoogle} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
          <span>{t.calendar.wkstInfo}</span>
          <span className="hidden sm:inline">{t.calendar.sources}</span>
        </div>
        <div className="relative h-[800px] w-full bg-white">
          <iframe
            src={embedUrl}
            title="SLZ Google Calendar"
            className="absolute inset-0 h-full w-full border-0"
            style={{ colorScheme: "light" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <ViewLink mode="MONTH" label={t.calendar.viewMonth} openLabel={t.calendar.openView} />
        <ViewLink mode="WEEK" label={t.calendar.viewWeek} openLabel={t.calendar.openView} />
        <ViewLink mode="AGENDA" label={t.calendar.viewAgenda} openLabel={t.calendar.openView} />
      </section>

      <p className="mt-6 text-xs text-zinc-500">{t.calendar.disclaimer}</p>
    </PageShell>
  );
}

function ViewLink({
  mode,
  label,
  openLabel,
}: {
  mode: "AGENDA" | "MONTH" | "WEEK";
  label: string;
  openLabel: string;
}) {
  return (
    <a
      href={buildEmbedUrl(mode)}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
    >
      <span className="font-medium">
        {openLabel}: {label}
      </span>
      <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-emerald-600" />
    </a>
  );
}

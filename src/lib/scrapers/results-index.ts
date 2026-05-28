import * as cheerio from "cheerio";
import { fetchSlzHtml } from "./http";
import { cleanWhitespace } from "./text";

export interface ScrapedCompetition {
  name: string;
  heldOn: string | null; // ISO yyyy-mm-dd if parseable
  season: number | null;
  sourceUrl: string;
  kind: string | null;
}

const RESULTS_URL = "https://slz.sk/index.php/results";
const ARCHIVE_URL =
  "https://slz.sk/index.php/component/content/article/10-vysledky-category/48-archiv-vysledkov";

const MONTHS_SK: Record<string, number> = {
  januar: 1, januára: 1, januára_: 1,
  februar: 2, februára: 2,
  marec: 3, marca: 3,
  april: 4, apríl: 4, apríla: 4,
  maj: 5, máj: 5, mája: 5,
  jun: 6, jún: 6, júna: 6,
  jul: 7, júl: 7, júla: 7,
  august: 8, augusta: 8,
  september: 9, septembra: 9,
  oktober: 10, október: 10, októbra: 10,
  november: 11, novembra: 11,
  december: 12, decembra: 12,
};

export async function scrapeResultsIndex(): Promise<ScrapedCompetition[]> {
  const html = await fetchSlzHtml(RESULTS_URL);
  return parseResultsList(html);
}

export async function scrapeResultsArchive(): Promise<ScrapedCompetition[]> {
  const html = await fetchSlzHtml(ARCHIVE_URL);
  return parseResultsList(html);
}

function parseResultsList(html: string): ScrapedCompetition[] {
  const $ = cheerio.load(html);
  const results: ScrapedCompetition[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!/\.pdf($|\?)/i.test(href) && !href.includes("vysledky")) return;
    if (!href.includes("/vysledky/") && !href.endsWith(".pdf")) return;

    const url = absUrl(href);
    if (seen.has(url)) return;
    seen.add(url);

    const text = cleanWhitespace($(el).parent().text());
    const date = parseDate(text);
    const season = parseSeason(url, date);
    const name = extractName(text);

    results.push({
      name: name || cleanWhitespace($(el).text()) || url,
      heldOn: date,
      season,
      sourceUrl: url,
      kind: guessKind(name),
    });
  });

  return results;
}

function absUrl(href: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `https://slz.sk${href}`;
  return `https://slz.sk/${href}`;
}

function parseDate(text: string): string | null {
  // e.g. "16.05.", "2. – 3. 05.", "10.05."
  const isoYear = /\b(20\d{2})\b/.exec(text);
  const year = isoYear ? Number.parseInt(isoYear[1], 10) : new Date().getFullYear();

  const dotMatch = /(\d{1,2})\.\s*(\d{1,2})\./.exec(text);
  if (dotMatch) {
    const day = Number.parseInt(dotMatch[1], 10);
    const month = Number.parseInt(dotMatch[2], 10);
    return safeIso(year, month, day);
  }

  const wordMatch = /(\d{1,2})\.\s*([a-zá-ž]+)/i.exec(text);
  if (wordMatch) {
    const day = Number.parseInt(wordMatch[1], 10);
    const month = MONTHS_SK[wordMatch[2].toLowerCase()];
    if (month) return safeIso(year, month, day);
  }
  return null;
}

function safeIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function parseSeason(url: string, date: string | null): number | null {
  const yearInUrl = /vysledky\/(\d{4})\//.exec(url);
  if (yearInUrl) return Number.parseInt(yearInUrl[1], 10);
  if (date) return Number.parseInt(date.slice(0, 4), 10);
  return null;
}

function extractName(text: string): string {
  return text
    .replace(/\d{1,2}\.\s*\d{1,2}\./, "")
    .replace(/\b20\d{2}\b/, "")
    .replace(/-\s*v[ýy]sledky?/i, "")
    .replace(/[-–]+\s*$/, "")
    .trim();
}

function guessKind(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes("3d")) return "3D";
  if (lower.includes("terén") || lower.includes("teren")) return "terén";
  if (lower.includes("hal")) return "halová";
  if (lower.includes("vonk")) return "vonkajšia";
  return null;
}

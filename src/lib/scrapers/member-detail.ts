import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";
import { fetchSlzHtml } from "./http";
import { cleanWhitespace } from "./text";

export interface DetailRow {
  score: number | null;
  achievedOn: string | null; // ISO yyyy-mm-dd
  competitionName: string;
  discipline: string;
  setup: string;
  category: string;
  division: string;
}

export interface MemberDetail {
  slzId: number;
  detailUrl: string;
  clubName: string | null;
  birthYear: number | null;
  category: string | null;
  availableYears: number[];
  personalBests: DetailRow[];
  seasonMaxes: DetailRow[]; // current year "Sezónne maximá"
  // year -> rows of "Výsledky v sezóne" for that year
  seasonResultsByYear: Map<number, DetailRow[]>;
}

const BASE = "https://slz.sk/clenovia/karta_sportovca.php";

export function memberDetailUrl(slzId: number, year?: number): string {
  const u = new URL(BASE);
  u.searchParams.set("ID", String(slzId));
  if (year != null) u.searchParams.set("sezona", String(year));
  return u.toString();
}

/**
 * Parse a `dd.mm.yyyy` Slovak date into ISO `yyyy-mm-dd`. Returns null on bad input.
 */
function parseSkDate(raw: string): string | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseNumber(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a result table whose rows have either 7 cells:
 *   [score, date, competition, discipline, setup, category, division]
 * Tables on the detail page share this structure for personal bests,
 * season maxes, and per-season results.
 */
function parseResultTable($: CheerioAPI, table: Cheerio<Element>): DetailRow[] {
  const rows: DetailRow[] = [];
  table.find("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .toArray()
      .map((td) => cleanWhitespace($(td).text()));
    if (cells.length < 7) return; // header row has <th> only, skipped here
    const [score, date, competition, discipline, setup, category, division] = cells;
    rows.push({
      score: parseNumber(score),
      achievedOn: parseSkDate(date),
      competitionName: competition,
      discipline,
      setup,
      category,
      division,
    });
  });
  return rows;
}

/**
 * Extract the three top-level data tables from a detail page in document order.
 * Layout (with `border=1`):
 *   #0 Osobné maximá (header starts with "Max body")
 *   #1 Sezónne maximá v sezóne YYYY (header starts with "Max body")
 *   #2 Výsledky v sezóne (header starts with "Body")
 *
 * Some pages omit #1 if the member has no results in the current season; the
 * "Výsledky" table is always the LAST border=1 table on the page.
 */
function extractDataTables($: CheerioAPI) {
  const tables = $('table[border="1"]').toArray();
  const wrapped = tables.map((t) => $(t));

  let personalBests: Cheerio<Element> | null = null;
  let seasonMaxes: Cheerio<Element> | null = null;
  let seasonResults: Cheerio<Element> | null = null;

  for (const t of wrapped) {
    const firstTh = cleanWhitespace(t.find("tr").first().find("th").first().text());
    if (firstTh === "Max body") {
      if (!personalBests) personalBests = t;
      else if (!seasonMaxes) seasonMaxes = t;
    } else if (firstTh === "Body") {
      seasonResults = t;
    }
  }

  return { personalBests, seasonMaxes, seasonResults };
}

function extractAvailableYears($: CheerioAPI): number[] {
  const years = new Set<number>();
  $("#select1 option, select[name='sezona'] option").each((_, opt) => {
    const v = $(opt).attr("value");
    const n = v ? Number.parseInt(v, 10) : NaN;
    if (Number.isFinite(n)) years.add(n);
  });
  return Array.from(years).sort((a, b) => b - a);
}

function extractBio($: CheerioAPI): { clubName: string | null; birthYear: number | null; category: string | null } {
  // Bio sits between the member-name <h1> and the "Osobné maximá" <h1>, as
  // <b>Label: </b>Value<BR> pairs. Use the body's HTML around the first <b>.
  const body = $("body").html() ?? "";
  const clubMatch = /<b>\s*Klub\s*:\s*<\/b>\s*([^<]+)/i.exec(body);
  const birthMatch = /<b>\s*Rok narodenia\s*:\s*<\/b>\s*([^<]+)/i.exec(body);
  const catMatch = /<b>\s*Kateg[oó]ria\s*:\s*<\/b>\s*([^<]+)/i.exec(body);
  const birthYear = birthMatch ? Number.parseInt(cleanWhitespace(birthMatch[1]), 10) : NaN;
  return {
    clubName: clubMatch ? cleanWhitespace(clubMatch[1]) : null,
    birthYear: Number.isFinite(birthYear) ? birthYear : null,
    category: catMatch ? cleanWhitespace(catMatch[1]) : null,
  };
}

/**
 * Fetch and parse a member detail page for a given year. If `year` is omitted
 * the site returns the current season.
 */
async function fetchDetailPage(slzId: number, year?: number) {
  const url = memberDetailUrl(slzId, year);
  const html = await fetchSlzHtml(url);
  const $ = cheerio.load(html);
  return { $, url };
}

/**
 * Scrape a member's full detail page, iterating every year offered in the
 * "Výsledky v sezóne" dropdown. The base load gives us bio + personal bests
 * + season maxes + the current year's results; subsequent loads add the
 * remaining years.
 */
export async function scrapeMemberDetail(
  slzId: number,
  options: { delayMs?: number } = {},
): Promise<MemberDetail> {
  const delayMs = options.delayMs ?? 300;
  const { $, url } = await fetchDetailPage(slzId);

  const bio = extractBio($);
  const availableYears = extractAvailableYears($);
  const tables = extractDataTables($);

  const personalBests = tables.personalBests ? parseResultTable($, tables.personalBests) : [];
  const seasonMaxes = tables.seasonMaxes ? parseResultTable($, tables.seasonMaxes) : [];

  const seasonResultsByYear = new Map<number, DetailRow[]>();
  const currentYearSelected = Number.parseInt(
    $("#select1 option[selected]").attr("value") ?? "",
    10,
  );
  if (tables.seasonResults && Number.isFinite(currentYearSelected)) {
    seasonResultsByYear.set(currentYearSelected, parseResultTable($, tables.seasonResults));
  }

  // Iterate the other years; the dropdown change is just a GET form submission
  // with ?sezona=<year>&ID=<id>, so we replicate it directly.
  for (const year of availableYears) {
    if (year === currentYearSelected) continue;
    await new Promise((r) => setTimeout(r, delayMs));
    try {
      const { $: $y } = await fetchDetailPage(slzId, year);
      const t = extractDataTables($y);
      seasonResultsByYear.set(year, t.seasonResults ? parseResultTable($y, t.seasonResults) : []);
    } catch {
      // record empty array so caller can see the year was attempted
      seasonResultsByYear.set(year, []);
    }
  }

  return {
    slzId,
    detailUrl: url,
    clubName: bio.clubName,
    birthYear: bio.birthYear,
    category: bio.category,
    availableYears,
    personalBests,
    seasonMaxes,
    seasonResultsByYear,
  };
}

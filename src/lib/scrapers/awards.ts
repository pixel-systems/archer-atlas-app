import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { fetchSlzHtml } from "./http";
import { cleanWhitespace } from "./text";

const AWARDS_URL = "https://slz.sk/ocenenia/index.php";

export interface ScrapedAward {
  licenseNumber: string | null;
  memberName: string;
  awardType: string;
  awardLevel: string | null;
  year: number | null;
}

/**
 * Best-effort awards scraper. The page contains explanatory prose followed by
 * tables of award recipients grouped by award type. We treat each table as a
 * single award type, taking the closest preceding heading as the type name.
 */
export async function scrapeAwards(): Promise<ScrapedAward[]> {
  const html = await fetchSlzHtml(AWARDS_URL);
  const $ = cheerio.load(html);
  const awards: ScrapedAward[] = [];

  $("table").each((_, table) => {
    const $table = $(table);
    const awardType = findPrecedingHeading($, $table) ?? "Unknown award";

    $table.find("tr").each((rowIdx, row) => {
      if (rowIdx === 0) return; // header
      const cells = $(row)
        .find("td")
        .toArray()
        .map((c) => cleanWhitespace($(c).text()));
      if (cells.length < 2) return;

      const name = cells[0];
      const year = pickYear(cells);
      const license = pickLicense($, row);
      const level = cells.length > 2 ? cells[2] : null;

      if (!name) return;
      awards.push({
        memberName: name,
        licenseNumber: license,
        awardType,
        awardLevel: level,
        year,
      });
    });
  });

  return awards;
}

function findPrecedingHeading(
  $: cheerio.CheerioAPI,
  $table: cheerio.Cheerio<Element>,
): string | null {
  let prev = $table.prev();
  for (let i = 0; i < 6 && prev.length > 0; i++) {
    const tag = (prev.prop("tagName") ?? "").toLowerCase();
    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "strong" || tag === "p") {
      const text = cleanWhitespace(prev.text());
      if (text) return text;
    }
    prev = prev.prev();
  }
  return null;
}

function pickYear(cells: string[]): number | null {
  for (const cell of cells) {
    const match = /(19|20)\d{2}/.exec(cell);
    if (match) return Number.parseInt(match[0], 10);
  }
  return null;
}

function pickLicense($: cheerio.CheerioAPI, row: Element): string | null {
  const link = $(row).find("a").attr("href") ?? "";
  const idMatch = /ID=(\d+)/.exec(link);
  return idMatch ? idMatch[1] : null;
}

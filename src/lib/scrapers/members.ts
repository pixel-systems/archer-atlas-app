import * as cheerio from "cheerio";
import { fetchSlzHtml } from "./http";
import { cleanWhitespace, slugify, splitName } from "./text";

export interface ScrapedMember {
  slzId: number | null;
  licenseNumber: string;
  firstName: string;
  lastName: string;
  birthYear: number | null;
  clubName: string;
  categoryTarget: string | null;
  category3d: string | null;
}

export interface ScrapedMembersResult {
  members: ScrapedMember[];
  clubs: { name: string; slug: string }[];
}

const MEMBERS_URL = "https://slz.sk/clenovia/";

export async function scrapeMembers(): Promise<ScrapedMembersResult> {
  const html = await fetchSlzHtml(MEMBERS_URL);
  const $ = cheerio.load(html);

  const members: ScrapedMember[] = [];
  const clubSet = new Map<string, string>();

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .toArray()
      .map((c) => cleanWhitespace($(c).text()));

    // Expected: [#, club#, name, birthYear, club, regNo, licenseNo, catTarget, cat3d]
    if (cells.length < 9) return;

    const nameCell = $(row).find("td").eq(2);
    const link = nameCell.find("a").attr("href") ?? "";
    const slzIdMatch = /ID=(\d+)/.exec(link);
    const slzId = slzIdMatch ? Number.parseInt(slzIdMatch[1], 10) : null;

    const fullName = cleanWhitespace(nameCell.text());
    if (!fullName) return;
    const { first, last } = splitName(fullName);

    const birthYearRaw = cells[3];
    const birthYear = /^\d{4}$/.test(birthYearRaw) ? Number.parseInt(birthYearRaw, 10) : null;

    const clubName = cells[4];
    const licenseNumber = cells[6] || cells[5];
    if (!licenseNumber) return;

    if (clubName) {
      const slug = slugify(clubName);
      clubSet.set(slug, clubName);
    }

    members.push({
      slzId,
      licenseNumber,
      firstName: first,
      lastName: last,
      birthYear,
      clubName,
      categoryTarget: cells[7] || null,
      category3d: cells[8] || null,
    });
  });

  return {
    members,
    clubs: Array.from(clubSet.entries()).map(([slug, name]) => ({ slug, name })),
  };
}

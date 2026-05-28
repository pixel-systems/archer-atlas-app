import * as cheerio from "cheerio";
import { fetchSlzHtml } from "./http";
import { cleanWhitespace } from "./text";

const CLUBS_URL = "https://slz.sk/index.php/klub";

export interface ScrapedClubProfile {
  /** 3-letter SLZ code (PET, ACG, ARB, ...) when present in the heading. */
  code: string | null;
  /** Full display name without trailing code. */
  name: string;
  /** Normalised slug used to match existing rows from the members scraper. */
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
}

/**
 * Parse https://slz.sk/index.php/klub. The page is a long flat list inside
 * `div.item-page`, where each club is rendered as a sequence of paragraphs:
 *
 *   <p><a href="..."><img src="..." /></a></p>   (or just <p><img></p>)
 *   <p><strong>Name - CODE<br /></strong></p>
 *   <p>Contact person</p>
 *   <p>e-mail: ...</p>
 *   <p>mobil: 0900 000 000</p>
 *
 * We walk children of the article body, then group runs of paragraphs starting
 * at one containing a logo image.
 */
export async function scrapeClubProfiles(): Promise<ScrapedClubProfile[]> {
  const html = await fetchSlzHtml(CLUBS_URL);
  const $ = cheerio.load(html);

  // The article body containing the flat list. Joomla usually renders into
  // `.item-page`; fall back to body if the structure changes.
  const root = $(".item-page").first().length
    ? $(".item-page").first()
    : $("body");

  // Collect all relevant block-level children in DOM order.
  const blocks = root.find("p, h1, h2, h3, h4").toArray();

  const results: ScrapedClubProfile[] = [];
  let current: Partial<ScrapedClubProfile> | null = null;
  let phase: "logo" | "name" | "details" = "logo";

  const flush = () => {
    if (!current) return;
    if (current.name) {
      const name = current.name;
      results.push({
        code: current.code ?? null,
        name,
        slug: nameSlug(name),
        logoUrl: current.logoUrl ?? null,
        websiteUrl: current.websiteUrl ?? null,
        contactName: current.contactName ?? null,
        contactPhone: current.contactPhone ?? null,
      });
    }
    current = null;
    phase = "logo";
  };

  for (const el of blocks) {
    const $el = $(el);
    const img = $el.find("img").first();
    const text = cleanWhitespace($el.text());

    // A paragraph containing an image starts a new club entry.
    if (img.length > 0) {
      flush();
      const link = img.closest("a").attr("href") ?? null;
      current = {
        logoUrl: absUrl(img.attr("src")),
        websiteUrl: link && !link.startsWith("mailto:") ? link : null,
      };
      phase = "name";
      continue;
    }

    // Some clubs have no logo — the entry starts with the <strong> name.
    const strong = $el.find("strong").first();
    if (strong.length > 0 && !current) {
      current = {};
      phase = "name";
    }

    if (!current) continue;

    if (phase === "name") {
      const headingText = strong.length > 0 ? cleanWhitespace(strong.text()) : text;
      if (!headingText) continue;
      const { name, code } = splitNameAndCode(headingText);
      current.name = name;
      current.code = code;
      phase = "details";
      continue;
    }

    // Details phase: keep filling in person + phone until we hit the next entry.
    if (!current.contactName && text && !/^e-?mail/i.test(text) && !/^mobil/i.test(text)) {
      current.contactName = text;
      continue;
    }
    const phoneMatch = /mobil\s*:?\s*(.+)$/i.exec(text);
    if (phoneMatch) {
      const phone = phoneMatch[1].trim();
      current.contactPhone = phone.length > 0 ? phone : null;
    }
  }
  flush();

  // Deduplicate by slug — keep the first complete record.
  const dedup = new Map<string, ScrapedClubProfile>();
  for (const c of results) {
    const prev = dedup.get(c.slug);
    if (!prev) {
      dedup.set(c.slug, c);
      continue;
    }
    // Merge: prefer non-null fields from either record.
    dedup.set(c.slug, {
      ...prev,
      logoUrl: prev.logoUrl ?? c.logoUrl,
      websiteUrl: prev.websiteUrl ?? c.websiteUrl,
      contactName: prev.contactName ?? c.contactName,
      contactPhone: prev.contactPhone ?? c.contactPhone,
      code: prev.code ?? c.code,
    });
  }

  return Array.from(dedup.values());
}

function splitNameAndCode(text: string): { name: string; code: string | null } {
  // "Archery Club Geronimo Trnava - ACG"  ->  name + ACG
  // Some entries use an em-dash or have trailing whitespace and HTML &nbsp;.
  const cleaned = text.replace(/\u00a0/g, " ").trim();
  const m = /^(.*?)\s*[-–]\s*([A-Z]{2,4})\s*$/.exec(cleaned);
  if (m) {
    return { name: m[1].trim(), code: m[2] };
  }
  return { name: cleaned, code: null };
}

function nameSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function absUrl(src: string | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `https://slz.sk${src}`;
  return `https://slz.sk/${src.replace(/^\.\//, "")}`;
}

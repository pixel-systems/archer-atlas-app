import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, ScrapeSource, ScrapeStatus } from "@/lib/supabase/types";
import { scrapeMembers, type ScrapedMember } from "./members";
import { scrapeAwards } from "./awards";
import { scrapeResultsIndex, scrapeResultsArchive } from "./results-index";
import { scrapeMemberDetail, memberDetailUrl, type DetailRow } from "./member-detail";
import { withDelay } from "./http";

type Admin = SupabaseClient<Database>;

export interface RunOutcome {
  source: ScrapeSource;
  status: ScrapeStatus;
  itemsProcessed: number;
  itemsFailed: number;
  errors: string[];
  runId: string;
}

async function startRun(db: Admin, source: ScrapeSource, triggeredBy: string | null) {
  const { data, error } = await db
    .from("scrape_runs")
    .insert({
      source,
      status: "running",
      items_processed: 0,
      items_failed: 0,
      triggered_by: triggeredBy,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to start scrape run: ${error?.message}`);
  return data.id;
}

async function finishRun(
  db: Admin,
  runId: string,
  status: ScrapeStatus,
  processed: number,
  failed: number,
  errors: string[],
) {
  await db
    .from("scrape_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      items_processed: processed,
      items_failed: failed,
      errors: errors.length ? { messages: errors } : null,
    })
    .eq("id", runId);
}

export async function runMembersScrape(triggeredBy: string | null = null): Promise<RunOutcome> {
  const db = createSupabaseAdminClient();
  const runId = await startRun(db, "members", triggeredBy);
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  try {
    const { members, clubs } = await scrapeMembers();

    // Upsert clubs first
    if (clubs.length > 0) {
      const { error } = await db.from("clubs").upsert(
        clubs.map((c) => ({ name: c.name, slug: c.slug })),
        { onConflict: "slug" },
      );
      if (error) errors.push(`clubs upsert: ${error.message}`);
    }

    // Map clubs slug -> id
    const { data: clubRows } = await db.from("clubs").select("id, slug");
    const clubIdBySlug = new Map((clubRows ?? []).map((c) => [c.slug, c.id]));

    // Upsert members in chunks
    const chunkSize = 200;
    for (let i = 0; i < members.length; i += chunkSize) {
      const chunk = members.slice(i, i + chunkSize);
      const payload = chunk.map((m) => memberToRow(m, clubIdBySlug));
      const { error } = await db.from("members").upsert(payload, { onConflict: "license_number" });
      if (error) {
        failed += chunk.length;
        errors.push(`members upsert: ${error.message}`);
      } else {
        processed += chunk.length;
      }
    }

    const status: ScrapeStatus = failed === 0 ? "success" : "partial";
    await finishRun(db, runId, status, processed, failed, errors);
    return { source: "members", status, itemsProcessed: processed, itemsFailed: failed, errors, runId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    await finishRun(db, runId, "failed", processed, failed, errors);
    return { source: "members", status: "failed", itemsProcessed: processed, itemsFailed: failed, errors, runId };
  }
}

function memberToRow(m: ScrapedMember, clubs: Map<string, string>) {
  const slug = m.clubName
    ? m.clubName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    : null;
  return {
    slz_id: m.slzId,
    license_number: m.licenseNumber,
    first_name: m.firstName,
    last_name: m.lastName,
    birth_year: m.birthYear,
    club_id: slug ? clubs.get(slug) ?? null : null,
    category_target: m.categoryTarget,
    category_3d: m.category3d,
    last_scraped_at: new Date().toISOString(),
  };
}

export async function runAwardsScrape(triggeredBy: string | null = null): Promise<RunOutcome> {
  const db = createSupabaseAdminClient();
  const runId = await startRun(db, "awards", triggeredBy);
  const errors: string[] = [];
  let processed = 0;

  try {
    const items = await scrapeAwards();

    // Match by license number when available; fall back to name only (no member_id).
    const licenseList = items.map((a) => a.licenseNumber).filter(Boolean) as string[];
    const { data: memberRows } = await db
      .from("members")
      .select("id, license_number")
      .in("license_number", licenseList.length ? licenseList : ["__none__"]);
    const memberIdByLicense = new Map((memberRows ?? []).map((m) => [m.license_number, m.id]));

    // Clear-and-replace strategy keeps this idempotent without unique keys on awards.
    const { error: delErr } = await db.from("awards").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) errors.push(`awards clear: ${delErr.message}`);

    const payload = items.map((a) => ({
      member_id: a.licenseNumber ? memberIdByLicense.get(a.licenseNumber) ?? null : null,
      award_type: a.awardType,
      award_level: a.awardLevel,
      year: a.year,
      source_url: "https://slz.sk/ocenenia/index.php",
    }));

    const chunkSize = 200;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error } = await db.from("awards").insert(chunk);
      if (error) errors.push(`awards insert: ${error.message}`);
      else processed += chunk.length;
    }

    const status: ScrapeStatus = errors.length ? "partial" : "success";
    await finishRun(db, runId, status, processed, 0, errors);
    return { source: "awards", status, itemsProcessed: processed, itemsFailed: 0, errors, runId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    await finishRun(db, runId, "failed", processed, 0, errors);
    return { source: "awards", status: "failed", itemsProcessed: processed, itemsFailed: 0, errors, runId };
  }
}

export async function runResultsIndexScrape(triggeredBy: string | null = null): Promise<RunOutcome> {
  const db = createSupabaseAdminClient();
  const runId = await startRun(db, "results_index", triggeredBy);
  const errors: string[] = [];
  let processed = 0;

  try {
    const [current, archive] = await Promise.all([scrapeResultsIndex(), scrapeResultsArchive()]);
    const all = [...current, ...archive];
    const dedup = new Map(all.map((c) => [c.sourceUrl, c]));

    const payload = Array.from(dedup.values()).map((c) => ({
      name: c.name,
      held_on: c.heldOn,
      season: c.season,
      source_url: c.sourceUrl,
      kind: c.kind,
    }));

    const chunkSize = 200;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error } = await db.from("competitions").upsert(chunk, { onConflict: "source_url" });
      if (error) errors.push(`competitions upsert: ${error.message}`);
      else processed += chunk.length;
    }

    const status: ScrapeStatus = errors.length ? "partial" : "success";
    await finishRun(db, runId, status, processed, 0, errors);
    return {
      source: "results_index",
      status,
      itemsProcessed: processed,
      itemsFailed: 0,
      errors,
      runId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    await finishRun(db, runId, "failed", processed, 0, errors);
    return {
      source: "results_index",
      status: "failed",
      itemsProcessed: processed,
      itemsFailed: 0,
      errors,
      runId,
    };
  }
}

export async function runAllScrapes(triggeredBy: string | null = null): Promise<RunOutcome[]> {
  // Members first (other scrapers may reference them).
  const members = await runMembersScrape(triggeredBy);
  const awards = await runAwardsScrape(triggeredBy);
  const results = await runResultsIndexScrape(triggeredBy);
  return [members, awards, results];
}

// ----------------------------------------------------------------------------
// Member details (per-member profile + per-year results)
// ----------------------------------------------------------------------------

export interface MemberDetailsRunOptions {
  /** Process at most this many members per run. Defaults to 30 to stay under
   * serverless timeouts. Set to null to process all stale members. */
  limit?: number | null;
  /** Re-enrich members whose `detail_scraped_at` is older than this many days.
   * Members that have never been enriched are always picked first. */
  staleAfterDays?: number;
  /** Delay between member detail fetches (ms). */
  delayMs?: number;
}

function detailRowToSeasonInsert(
  memberId: string,
  season: number,
  row: DetailRow,
  isSeasonMax: boolean,
) {
  return {
    member_id: memberId,
    season,
    score: row.score,
    achieved_on: row.achievedOn,
    competition_name: row.competitionName || null,
    discipline: row.discipline || null,
    setup: row.setup || null,
    category: row.category || null,
    division: row.division || null,
    is_season_max: isSeasonMax,
  };
}

function detailRowToPbInsert(memberId: string, row: DetailRow) {
  return {
    member_id: memberId,
    score: row.score,
    achieved_on: row.achievedOn,
    competition_name: row.competitionName || null,
    discipline: row.discipline || null,
    setup: row.setup || null,
    category: row.category || null,
    division: row.division || null,
  };
}

export async function runMemberDetailsScrape(
  triggeredBy: string | null = null,
  options: MemberDetailsRunOptions = {},
): Promise<RunOutcome> {
  const limit = options.limit === null ? null : options.limit ?? 30;
  const staleAfterDays = options.staleAfterDays ?? 7;
  const delayMs = options.delayMs ?? 600;

  const db = createSupabaseAdminClient();
  const runId = await startRun(db, "member_details", triggeredBy);
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  try {
    // Pick targets: members with an slz_id, never enriched OR stale enrichment.
    const staleCutoff = new Date(Date.now() - staleAfterDays * 24 * 60 * 60 * 1000).toISOString();

    let query = db
      .from("members")
      .select("id, slz_id, detail_scraped_at")
      .not("slz_id", "is", null)
      .or(`detail_scraped_at.is.null,detail_scraped_at.lt.${staleCutoff}`)
      // Never-enriched first (nulls first via ascending), then oldest enrichment.
      .order("detail_scraped_at", { ascending: true, nullsFirst: true });

    if (limit != null) query = query.limit(limit);

    const { data: targets, error: pickErr } = await query;
    if (pickErr) throw new Error(`pick targets: ${pickErr.message}`);

    const items = (targets ?? []).filter(
      (m): m is { id: string; slz_id: number; detail_scraped_at: string | null } => m.slz_id != null,
    );

    await withDelay(items, delayMs, async (m) => {
      try {
        const detail = await scrapeMemberDetail(m.slz_id, { delayMs });

        // Replace personal bests for this member.
        const pbDel = await db.from("member_personal_bests").delete().eq("member_id", m.id);
        if (pbDel.error) throw new Error(`pb delete: ${pbDel.error.message}`);
        if (detail.personalBests.length > 0) {
          const { error: pbErr } = await db
            .from("member_personal_bests")
            .insert(detail.personalBests.map((r) => detailRowToPbInsert(m.id, r)));
          if (pbErr) throw new Error(`pb insert: ${pbErr.message}`);
        }

        // Replace season results across all known years for this member.
        const srDel = await db.from("member_season_results").delete().eq("member_id", m.id);
        if (srDel.error) throw new Error(`sr delete: ${srDel.error.message}`);

        // Build a set of (year|date|competition|discipline|setup) keys that
        // appear in the season-maxes table for the current year so we can mark
        // the corresponding rows.
        const maxKeys = new Set(
          detail.seasonMaxes.map(
            (r) => `${r.achievedOn}|${r.competitionName}|${r.discipline}|${r.setup}`,
          ),
        );

        const inserts: ReturnType<typeof detailRowToSeasonInsert>[] = [];
        for (const [year, rows] of detail.seasonResultsByYear.entries()) {
          for (const r of rows) {
            const k = `${r.achievedOn}|${r.competitionName}|${r.discipline}|${r.setup}`;
            inserts.push(detailRowToSeasonInsert(m.id, year, r, maxKeys.has(k)));
          }
        }
        if (inserts.length > 0) {
          // Chunked insert
          const size = 500;
          for (let i = 0; i < inserts.length; i += size) {
            const { error } = await db
              .from("member_season_results")
              .insert(inserts.slice(i, i + size));
            if (error) throw new Error(`sr insert: ${error.message}`);
          }
        }

        // Update member metadata.
        const { error: upErr } = await db
          .from("members")
          .update({
            detail_scraped_at: new Date().toISOString(),
            detail_url: memberDetailUrl(m.slz_id),
          })
          .eq("id", m.id);
        if (upErr) throw new Error(`member update: ${upErr.message}`);

        processed += 1;
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`slz_id=${m.slz_id}: ${message}`);
      }
    });

    const status: ScrapeStatus = failed === 0 ? "success" : "partial";
    await finishRun(db, runId, status, processed, failed, errors);
    return {
      source: "member_details",
      status,
      itemsProcessed: processed,
      itemsFailed: failed,
      errors,
      runId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    await finishRun(db, runId, "failed", processed, failed, errors);
    return {
      source: "member_details",
      status: "failed",
      itemsProcessed: processed,
      itemsFailed: failed,
      errors,
      runId,
    };
  }
}

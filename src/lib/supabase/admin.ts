import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./types";

/**
 * Service-role client. Bypasses RLS. Use ONLY in:
 *  - Vercel Cron handler
 *  - Admin-authenticated server routes (after explicit role check)
 *  - Scraper jobs
 * Never expose to the browser.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

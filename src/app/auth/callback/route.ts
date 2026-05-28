import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function looksLikeJwt(value: string | undefined): boolean {
  return !!value && value.split(".").length === 3;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/profile";
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (oauthError) {
    console.error("[auth/callback] provider error:", oauthError);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, url),
    );
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      const msg = "Supabase env vars are missing on the server.";
      console.error("[auth/callback]", msg);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, url));
    }
    if (!looksLikeJwt(anonKey) && !anonKey.startsWith("sb_publishable_")) {
      const msg =
        "NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a valid Supabase anon key (expected a JWT starting with eyJ... or sb_publishable_...).";
      console.error("[auth/callback]", msg);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, url));
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", {
        message: error.message,
        status: error.status,
        name: error.name,
        supabaseUrl,
        anonKeyPrefix: anonKey.slice(0, 8) + "…",
      });
      const hint =
        error.message === "Invalid API key"
          ? "Invalid API key — your NEXT_PUBLIC_SUPABASE_ANON_KEY does not match NEXT_PUBLIC_SUPABASE_URL. Verify both come from the same Supabase project (Project Settings → API) and restart `next dev`."
          : error.message;
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(hint)}`, url));
    }
  }

  return NextResponse.redirect(new URL(next, url));
}

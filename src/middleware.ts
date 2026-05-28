import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Only refresh the Supabase session on routes that actually need a fresh
// auth context. Public listing pages do not, so we skip the network call
// to Supabase Auth there — that is the largest single perf win.
const SESSION_REFRESH_PREFIXES = ["/admin", "/profile", "/auth", "/api/admin", "/api/cron"];

function needsSessionRefresh(pathname: string): boolean {
  return SESSION_REFRESH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!needsSessionRefresh(request.nextUrl.pathname)) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the session if needed; ignore result.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Match everything except static assets and image optimizer output.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js|map)$).*)",
  ],
};

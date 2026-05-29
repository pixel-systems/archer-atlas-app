import { NextResponse, type NextRequest } from "next/server";
import { getCurrentRole, getCurrentUser } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  userId?: string;
  role?: "user" | "admin";
}

export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  const myRole = await getCurrentRole();
  if (!me || myRole !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const userId = body?.userId;
  const role = body?.role;
  if (!userId || (role !== "admin" && role !== "user")) {
    return NextResponse.json(
      { error: "userId and role ('admin' | 'user') required" },
      { status: 400 },
    );
  }

  // Safety: never let an admin demote themselves (would lock everyone out if
  // they were the last admin).
  if (userId === me.id && role === "user") {
    return NextResponse.json(
      { error: "Nemôžete si odobrať rolu admin sami sebe." },
      { status: 400 },
    );
  }

  const db = createSupabaseAdminClient();

  if (role === "admin") {
    const { error } = await db
      .from("app_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Demote = simply remove the row. getCurrentRole() defaults to 'user'.
    const { error } = await db.from("app_roles").delete().eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId, role });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, role, display_name");

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const merged = users.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    created_at: u.created_at,
    role: profileMap[u.id]?.role ?? null,
    display_name: profileMap[u.id]?.display_name ?? null,
  }));

  return NextResponse.json({ data: merged });
}

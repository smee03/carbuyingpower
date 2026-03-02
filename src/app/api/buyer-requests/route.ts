import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireActionsKey } from "@/lib/actionsAuth";

export async function POST(req: NextRequest) {
  const auth = requireActionsKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await req.json();

  // Minimal schema – extend as you like
  const payload = {
    buyer_id: body.buyer_id, // UUID
    zip: body.zip,
    radius_miles: body.radius_miles ?? 25,
    desired_models: body.desired_models ?? "",
    condition: body.condition ?? "either",
    credit_tier: body.credit_tier ?? "760+",
    term_months: body.term_months ?? 60,
    down_payment: body.down_payment ?? 0,
    notes: body.notes ?? null,
    status: "open",
  };

  const { data, error } = await supabaseAdmin
    .from("buyer_requests")
    .insert(payload)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data });
}

export async function GET(req: NextRequest) {
  const auth = requireActionsKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const buyer_id = url.searchParams.get("buyer_id");

  let q = supabaseAdmin.from("buyer_requests").select("*").order("created_at", { ascending: false });
  if (buyer_id) q = q.eq("buyer_id", buyer_id);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data });
}
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireActionsKey } from "@/lib/actionsAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireActionsKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("dealer_offers")
    .select("*")
    .eq("request_id", params.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data });
}
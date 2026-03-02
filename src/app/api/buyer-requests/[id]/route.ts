import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireActionsKey } from "@/lib/actionsAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireActionsKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("buyer_requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ data });
}
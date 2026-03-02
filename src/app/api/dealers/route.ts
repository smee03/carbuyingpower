import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireActionsKey } from "@/lib/actionsAuth";

export async function GET() {
  return Response.json({ status: "dealers route working" });
}

  const body = await req.json();
  const { dealer_id, display_name } = body;

  if (!dealer_id || !display_name) {
    return NextResponse.json(
      { error: "dealer_id and display_name are required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("profiles").insert({
    id: dealer_id,
    role: "dealer",
    display_name,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, dealer_id });
}
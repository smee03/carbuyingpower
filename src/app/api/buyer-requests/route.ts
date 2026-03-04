import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      // Log for debugging in Vercel logs
      console.error("supabase auth failure", { authError: authError?.message, tokenPreview: token?.slice?.(0, 8) });
      return NextResponse.json({ message: "Unauthorized", detail: authError?.message ?? "no user" }, { status: 401 });
    }

    const body = await req.json();

    const payload = {
      buyer_id: user.id,
      make: body.make ?? "",
      model: body.model ?? "",
      payment_method: body.payment_method ?? "finance",
      condition_types: body.condition_types ?? "used",
      min_price: body.min_price ?? null,
      max_price: body.max_price ?? null,
      year_min: body.year_min ?? 2015,
      year_max: body.year_max ?? 2027,
      max_miles: body.max_miles ?? null,
      zip: body.zip ?? "",
      radius_miles: body.radius_miles ?? 25,
      delivery_preference: body.delivery_preference ?? "both",
      credit_tier: body.credit_tier ?? "good",
      term_months: body.term_months ?? 60,
      down_payment: body.down_payment ?? 0,
      status: "open",
    };

    const { data, error } = await supabaseAdmin
      .from("buyer_requests")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error("supabase auth failure (GET)", { authError: authError?.message, tokenPreview: token?.slice?.(0, 8) });
      return NextResponse.json({ message: "Unauthorized", detail: authError?.message ?? "no user" }, { status: 401 });
    }

    const url = new URL(req.url);
    const buyer_id = url.searchParams.get("buyer_id");

    let q = supabaseAdmin
      .from("buyer_requests")
      .select("*")
      .eq("buyer_id", buyer_id || user.id)
      .order("created_at", { ascending: false });

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
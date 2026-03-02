import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireActionsKey } from "@/lib/actionsAuth";

type Addon = { name: string; amount: number };

function sumAddons(addons: Addon[]) {
  return (addons ?? []).reduce((acc, a) => acc + (Number(a?.amount) || 0), 0);
}

function calcOtd(args: {
  selling_price: number;
  dealer_discount: number;
  rebates: number;
  addons_total: number;
  doc_fee: number;
  tax: number;
  title_registration: number;
  other_fees: number;
}) {
  const a = args;
  return (
    (a.selling_price || 0) -
    (a.dealer_discount || 0) -
    (a.rebates || 0) +
    (a.addons_total || 0) +
    (a.doc_fee || 0) +
    (a.tax || 0) +
    (a.title_registration || 0) +
    (a.other_fees || 0)
  );
}

export async function POST(req: NextRequest) {
  const auth = requireActionsKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await req.json();

  const addons: Addon[] = Array.isArray(body.addons) ? body.addons : [];
  const addons_total = sumAddons(addons);

  // Server-calculated OTD (dealer can't spoof)
  const otd_total = calcOtd({
    selling_price: Number(body.selling_price) || 0,
    dealer_discount: Number(body.dealer_discount) || 0,
    rebates: Number(body.rebates) || 0,
    addons_total,
    doc_fee: Number(body.doc_fee) || 0,
    tax: Number(body.tax) || 0,
    title_registration: Number(body.title_registration) || 0,
    other_fees: Number(body.other_fees) || 0,
  });

  if (!body.request_id || !body.dealer_id) {
    return NextResponse.json({ error: "request_id and dealer_id are required" }, { status: 400 });
  }
  if ((Number(body.selling_price) || 0) <= 0) {
    return NextResponse.json({ error: "selling_price must be > 0" }, { status: 400 });
  }
  if (otd_total <= 0) {
    return NextResponse.json({ error: "Computed otd_total must be > 0" }, { status: 400 });
  }

  const insertPayload = {
    request_id: body.request_id,
    dealer_id: body.dealer_id,

    vin: body.vin?.trim() || null,
    stock_number: body.stock_number?.trim() || null,
    trim: body.trim?.trim() || null,

    msrp: body.msrp ?? null,
    selling_price: Number(body.selling_price) || 0,
    dealer_discount: Number(body.dealer_discount) || 0,
    rebates: Number(body.rebates) || 0,

    addons,

    doc_fee: Number(body.doc_fee) || 0,
    tax: Number(body.tax) || 0,
    title_registration: Number(body.title_registration) || 0,
    other_fees: Number(body.other_fees) || 0,

    otd_total,

    assumed_apr: body.assumed_apr ?? null,
    assumed_term_months: body.assumed_term_months ?? null,
    assumed_down_payment: body.assumed_down_payment ?? null,
    monthly_payment_est: body.monthly_payment_est ?? null,

    status: "submitted",
  };

  const { data, error } = await supabaseAdmin
    .from("dealer_offers")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data });
}
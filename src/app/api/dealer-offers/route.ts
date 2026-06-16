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

  // Notify buyer of new offer (fire-and-forget — don't block the response)
  sendNewOfferEmail(body.request_id, body.dealer_id, otd_total, req).catch(() => {});

  return NextResponse.json({ data });
}

async function sendNewOfferEmail(
  requestId: string,
  dealerId: string,
  otdTotal: number,
  req: NextRequest
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return;

  const [requestRes, dealerRes] = await Promise.all([
    supabaseAdmin
      .from("buyer_requests")
      .select("buyer_id, make, model, desired_models")
      .eq("id", requestId)
      .maybeSingle(),
    supabaseAdmin
      .from("profiles")
      .select("display_name, email")
      .eq("id", dealerId)
      .maybeSingle(),
  ]);

  if (!requestRes.data) return;
  const buyerRequest = requestRes.data as {
    buyer_id: string;
    make?: string | null;
    model?: string | null;
    desired_models?: string | null;
  };

  const dealerName =
    (dealerRes.data as { display_name?: string | null } | null)?.display_name ?? "A dealer";

  const buyerProfileRes = await supabaseAdmin
    .from("profiles")
    .select("display_name, email")
    .eq("id", buyerRequest.buyer_id)
    .maybeSingle();

  let buyerEmail: string | null =
    (buyerProfileRes.data as { email?: string | null } | null)?.email ?? null;
  const buyerName =
    (buyerProfileRes.data as { display_name?: string | null } | null)?.display_name ?? "there";

  if (!buyerEmail) {
    const authUser = await supabaseAdmin.auth.admin.getUserById(buyerRequest.buyer_id);
    buyerEmail = authUser.data.user?.email ?? null;
  }

  if (!buyerEmail) return;

  const vehicleTitle =
    [buyerRequest.make, buyerRequest.model].filter(Boolean).join(" ").trim() ||
    buyerRequest.desired_models ||
    "your vehicle request";

  const appUrl = process.env.APP_URL || new URL(req.url).origin;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: buyerEmail,
      subject: `New offer on your ${vehicleTitle} request`,
      text: [
        `Hi ${buyerName},`,
        "",
        `${dealerName} just submitted an offer on your ${vehicleTitle} request.`,
        `Out-the-door total: $${otdTotal.toLocaleString()}.`,
        "",
        `Review the offer: ${appUrl}/buyer/requests`,
      ].join("\n"),
      html: `<p>Hi ${buyerName},</p><p><b>${dealerName}</b> just submitted an offer on your <b>${vehicleTitle}</b> request.</p><p>Out-the-door total: <b>$${otdTotal.toLocaleString()}</b></p><p><a href="${appUrl}/buyer/requests">Review the offer →</a></p>`,
    }),
  });
}
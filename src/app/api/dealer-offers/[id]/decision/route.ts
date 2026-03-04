import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DecisionPayload = {
  decision?: "accepted" | "declined";
  reason?: string;
};

async function resolveProfileEmail(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();

  let email: string | null = (profile as { email?: string | null } | null)?.email ?? null;
  const displayName = (profile as { display_name?: string | null } | null)?.display_name ?? "User";

  if (!email) {
    const authUser = await supabaseAdmin.auth.admin.getUserById(userId);
    email = authUser.data.user?.email ?? null;
  }

  return { email, displayName };
}

async function sendDealAcceptedEmails(args: {
  buyerEmail: string;
  buyerName: string;
  dealerEmail: string;
  dealerName: string;
  requestTitle: string;
  otdTotal: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://carbuyingpower.vercel.app";

  if (!apiKey || !from) return { sent: false, reason: "email_not_configured" };

  const buyerSubject = "Congrats, your offer was accepted";
  const dealerSubject = "Your offer was accepted";

  const buyerText = [
    `Congrats ${args.buyerName},`,
    "",
    `You accepted an offer from ${args.dealerName} for ${args.requestTitle}.`,
    `Out-the-door total: $${args.otdTotal.toLocaleString()}.`,
    "",
    "Next steps:",
    "- Dealer will contact you to confirm vehicle and deal details.",
    "- You may be asked to provide license/insurance and financing docs.",
    "- Credit check may be required if financing applies.",
    "",
    `Open app: ${appUrl}/buyer/requests`,
  ].join("\n");

  const dealerText = [
    `Good news ${args.dealerName},`,
    "",
    `${args.buyerName} accepted your offer for ${args.requestTitle}.`,
    `Accepted OTD total: $${args.otdTotal.toLocaleString()}.`,
    "",
    "Next steps:",
    "- Reach out to buyer promptly to confirm details.",
    "- Request any required information for financing/verification.",
    "- Coordinate appointment and final paperwork.",
    "",
    `Open app: ${appUrl}/dealer/offers`,
  ].join("\n");

  const sends = [
    {
      to: args.buyerEmail,
      subject: buyerSubject,
      text: buyerText,
      html: `<p>Congrats ${args.buyerName},</p><p>You accepted an offer from ${args.dealerName} for <b>${args.requestTitle}</b>.</p><p>Out-the-door total: <b>$${args.otdTotal.toLocaleString()}</b></p><p>Next steps: dealer contact, detail confirmation, financing/credit steps if needed.</p>`,
    },
    {
      to: args.dealerEmail,
      subject: dealerSubject,
      text: dealerText,
      html: `<p>Good news ${args.dealerName},</p><p>${args.buyerName} accepted your offer for <b>${args.requestTitle}</b>.</p><p>Accepted OTD total: <b>$${args.otdTotal.toLocaleString()}</b></p><p>Please contact the buyer to confirm details and finalize paperwork.</p>`,
    },
  ];

  await Promise.all(
    sends.map((payload) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
        }),
      })
    )
  );

  return { sent: true };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    const user = authData.user;

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: offerId } = await context.params;
    const body = (await req.json()) as DecisionPayload;
    const decision = body.decision;
    const reason = (body.reason || "").trim();

    if (decision !== "accepted" && decision !== "declined") {
      return NextResponse.json({ message: "Invalid decision" }, { status: 400 });
    }

    if (decision === "declined" && !reason) {
      return NextResponse.json({ message: "Decline reason is required" }, { status: 400 });
    }

    const { data: offer, error: offerError } = await supabaseAdmin
      .from("dealer_offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ message: "Offer not found" }, { status: 404 });
    }

    const { data: buyerRequest, error: requestError } = await supabaseAdmin
      .from("buyer_requests")
      .select("id, buyer_id, desired_models, make, model, status")
      .eq("id", offer.request_id)
      .single();

    if (requestError || !buyerRequest) {
      return NextResponse.json({ message: "Buyer request not found" }, { status: 404 });
    }

    if (buyerRequest.buyer_id !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (decision === "accepted") {
      const { error: acceptError } = await supabaseAdmin
        .from("dealer_offers")
        .update({ status: "accepted" })
        .eq("id", offerId);

      if (acceptError) {
        return NextResponse.json({ message: acceptError.message }, { status: 400 });
      }

      await supabaseAdmin
        .from("dealer_offers")
        .update({ status: "expired" })
        .eq("request_id", offer.request_id)
        .neq("id", offerId)
        .in("status", ["submitted", "accepted"]);

      await supabaseAdmin
        .from("buyer_requests")
        .update({ status: "accepted" })
        .eq("id", offer.request_id);

      const buyerProfile = await resolveProfileEmail(buyerRequest.buyer_id);
      const dealerProfile = await resolveProfileEmail(offer.dealer_id);

      if (buyerProfile.email && dealerProfile.email) {
        const requestTitle =
          [buyerRequest.make, buyerRequest.model].filter(Boolean).join(" ").trim() ||
          buyerRequest.desired_models ||
          "vehicle request";

        await sendDealAcceptedEmails({
          buyerEmail: buyerProfile.email,
          buyerName: buyerProfile.displayName,
          dealerEmail: dealerProfile.email,
          dealerName: dealerProfile.displayName,
          requestTitle,
          otdTotal: Number(offer.otd_total || 0),
        });
      }

      return NextResponse.json({ success: true, status: "accepted" });
    }

    const declineWithReason = await supabaseAdmin
      .from("dealer_offers")
      .update({ status: "expired", decline_reason: reason })
      .eq("id", offerId);

    if (declineWithReason.error) {
      const fallback = await supabaseAdmin
        .from("dealer_offers")
        .update({ status: "expired" })
        .eq("id", offerId);

      if (fallback.error) {
        return NextResponse.json({ message: fallback.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, status: "declined" });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

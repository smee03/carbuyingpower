"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AcceptedOffer = {
  id: string;
  dealer_id: string;
  otd_total: number;
  monthly_payment_est: number | null;
  assumed_apr: number | null;
  assumed_term_months: number | null;
  assumed_down_payment: number | null;
  status: string;
};

type BuyerRequest = {
  id: string;
  desired_models: string;
  make?: string | null;
  model?: string | null;
  status: string;
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString()}`;
}

export default function AcceptedDealPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const requestId = params.id;
  const offerId = search.get("offerId");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [dealerName, setDealerName] = useState("the dealer");
  const [offer, setOffer] = useState<AcceptedOffer | null>(null);
  const [request, setRequest] = useState<BuyerRequest | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setMsg("Not signed in. Go to /auth");
        setLoading(false);
        return;
      }

      const requestRes = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (requestRes.error || !requestRes.data) {
        setMsg(requestRes.error?.message || "Request not found");
        setLoading(false);
        return;
      }

      if (requestRes.data.buyer_id !== user.id) {
        setMsg("You do not have access to this request.");
        setLoading(false);
        return;
      }

      setRequest(requestRes.data as BuyerRequest);

      const offerQuery = supabase
        .from("dealer_offers")
        .select("*")
        .eq("request_id", requestId)
        .eq("status", "accepted");

      const offerRes = offerId
        ? await offerQuery.eq("id", offerId).maybeSingle()
        : await offerQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (offerRes.error || !offerRes.data) {
        setMsg(offerRes.error?.message || "Accepted offer not found");
        setLoading(false);
        return;
      }

      const acceptedOffer = offerRes.data as AcceptedOffer;
      setOffer(acceptedOffer);

      const profileRes = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", acceptedOffer.dealer_id)
        .maybeSingle();

      if (profileRes.data?.display_name) {
        setDealerName(profileRes.data.display_name);
      }

      setLoading(false);
    })();
  }, [offerId, requestId]);

  const vehicleName = request?.make
    ? `${request.make}${request.model ? " " + request.model : ""}`
    : request?.desired_models ?? "your vehicle";

  return (
    <main className="min-h-screen bg-muted/40 p-8">
      <div className="max-w-xl mx-auto space-y-6">

        {msg && <p className="text-sm text-destructive">{msg}</p>}
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && offer && (
          <>
            {/* Success hero */}
            <div className="text-center space-y-3 py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mx-auto">
                ✓
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Deal accepted!</h1>
              <p className="text-muted-foreground">
                You locked in an offer from{" "}
                <span className="font-semibold text-foreground">{dealerName}</span>{" "}
                on your {vehicleName}.
              </p>
            </div>

            {/* Deal summary */}
            <Card>
              <CardHeader><CardTitle>Deal summary</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Out-the-door total</span>
                  <span className="text-2xl font-bold">{money(offer.otd_total)}</span>
                </div>
                {offer.monthly_payment_est != null && (
                  <div className="flex justify-between py-3 border-b border-border text-sm">
                    <span className="text-muted-foreground">Est. monthly payment</span>
                    <span className="font-semibold">{money(offer.monthly_payment_est)}/mo</span>
                  </div>
                )}
                {offer.assumed_apr != null && (
                  <div className="flex justify-between py-3 border-b border-border text-sm">
                    <span className="text-muted-foreground">APR</span>
                    <span className="font-medium">{offer.assumed_apr}%</span>
                  </div>
                )}
                {offer.assumed_term_months != null && (
                  <div className="flex justify-between py-3 border-b border-border text-sm">
                    <span className="text-muted-foreground">Term</span>
                    <span className="font-medium">{offer.assumed_term_months} months</span>
                  </div>
                )}
                {offer.assumed_down_payment != null && (
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Down payment</span>
                    <span className="font-medium">{money(offer.assumed_down_payment)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next steps */}
            <Card>
              <CardHeader><CardTitle>What happens next</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {NEXT_STEPS.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/buyer/requests"
                className={cn(buttonVariants(), "flex-1 text-center")}
              >
                Go to Dashboard
              </Link>
              <Link
                href={`/buyer/requests/${requestId}`}
                className={cn(buttonVariants({ variant: "outline" }), "flex-1 text-center")}
              >
                View Offer Details
              </Link>
            </div>
          </>
        )}

      </div>
    </main>
  );
}

const NEXT_STEPS = [
  "The dealer will contact you to confirm the vehicle and finalize pricing details.",
  "Have your ID, proof of insurance, and any required paperwork ready.",
  "If financing, the dealer may request a credit application or verification.",
  "Confirm pickup or delivery timing and review all final documents before signing.",
];

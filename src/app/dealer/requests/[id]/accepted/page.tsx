"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

type DealerOffer = {
  id: string;
  otd_total: number;
  selling_price: number;
  monthly_payment_est: number | null;
  assumed_apr: number | null;
  assumed_term_months: number | null;
  assumed_down_payment: number | null;
};

type BuyerRequest = {
  id: string;
  buyer_id: string;
  make?: string | null;
  model?: string | null;
  desired_models?: string | null;
};

type BuyerProfile = {
  display_name: string | null;
  email: string | null;
  phone: string | null;
};

function money(n: number | null | undefined) {
  return `$${Number(n || 0).toLocaleString()}`;
}

const NEXT_STEPS = [
  "Reach out to the buyer to introduce yourself and confirm their timeline.",
  "Verify the specific vehicle (VIN / stock #) is available and ready.",
  "Prepare financing documents, title transfer, and any add-on paperwork.",
  "Schedule the visit, walk the buyer through the final figures, and get signatures.",
];

function AcceptedContent() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const requestId = params.id;
  const offerId = search.get("offerId");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [offer, setOffer] = useState<DealerOffer | null>(null);
  const [request, setRequest] = useState<BuyerRequest | null>(null);
  const [buyer, setBuyer] = useState<BuyerProfile | null>(null);

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

      const offerQuery = supabase
        .from("dealer_offers")
        .select("*")
        .eq("request_id", requestId)
        .eq("dealer_id", user.id)
        .eq("status", "accepted");

      const offerRes = offerId
        ? await offerQuery.eq("id", offerId).maybeSingle()
        : await offerQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (offerRes.error || !offerRes.data) {
        setMsg(offerRes.error?.message || "Accepted offer not found.");
        setLoading(false);
        return;
      }

      setOffer(offerRes.data as DealerOffer);

      const reqRes = await supabase
        .from("buyer_requests")
        .select("id, buyer_id, make, model, desired_models")
        .eq("id", requestId)
        .single();

      if (reqRes.error || !reqRes.data) {
        setMsg(reqRes.error?.message || "Request not found.");
        setLoading(false);
        return;
      }

      const loadedReq = reqRes.data as BuyerRequest;
      setRequest(loadedReq);

      const profileRes = await supabase
        .from("profiles")
        .select("display_name, email, phone")
        .eq("id", loadedReq.buyer_id)
        .maybeSingle();

      if (profileRes.data) setBuyer(profileRes.data as BuyerProfile);

      setLoading(false);
    })();
  }, [offerId, requestId]);

  const vehicleName = request?.make
    ? `${request.make}${request.model ? " " + request.model : ""}`
    : request?.desired_models ?? "the vehicle";

  const buyerName = buyer?.display_name || "The buyer";

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (msg) return <p className="text-sm text-destructive">{msg}</p>;
  if (!offer) return null;

  return (
    <>
      {/* Success hero */}
      <div className="text-center space-y-3 py-6">
        <div className="flex justify-center">
          <CheckCircle2 className="size-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">You got the deal!</h1>
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{buyerName}</span> accepted
          your offer on the {vehicleName}.
        </p>
      </div>

      {/* Deal summary */}
      <Card>
        <CardHeader><CardTitle>Your offer</CardTitle></CardHeader>
        <CardContent className="space-y-0">
          <div className="flex justify-between items-center py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Out-the-door total</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{money(offer.otd_total)}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border text-sm">
            <span className="text-muted-foreground">Selling price</span>
            <span className="font-medium">{money(offer.selling_price)}</span>
          </div>
          {offer.monthly_payment_est != null && (
            <div className="flex justify-between py-3 border-b border-border text-sm">
              <span className="text-muted-foreground">Est. monthly</span>
              <span className="font-medium">{money(offer.monthly_payment_est)}/mo</span>
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

      {/* Buyer contact */}
      {buyer && (buyer.display_name || buyer.email || buyer.phone) && (
        <Card>
          <CardHeader><CardTitle>Buyer contact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {buyer.display_name && (
              <p className="font-semibold text-sm">{buyer.display_name}</p>
            )}
            {buyer.email && (
              <a
                href={`mailto:${buyer.email}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="size-4 flex-shrink-0" />
                {buyer.email}
              </a>
            )}
            {buyer.phone && (
              <a
                href={`tel:${buyer.phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="size-4 flex-shrink-0" />
                {buyer.phone}
              </a>
            )}
          </CardContent>
        </Card>
      )}

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
        <Link href="/dealer/offers" className={cn(buttonVariants(), "flex-1 text-center")}>
          My Offers
        </Link>
        <Link
          href="/dealer/requests"
          className={cn(buttonVariants({ variant: "outline" }), "flex-1 text-center")}
        >
          Browse Requests
        </Link>
      </div>
    </>
  );
}

export default function DealerAcceptedPage() {
  return (
    <main className="min-h-screen bg-muted/40 p-4 sm:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <AcceptedContent />
        </Suspense>
      </div>
    </main>
  );
}

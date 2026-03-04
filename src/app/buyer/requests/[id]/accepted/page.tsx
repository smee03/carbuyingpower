"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  const [dealerName, setDealerName] = useState("Dealer");
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

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Deal Accepted</h1>
          <Link className="underline text-sm" href={`/buyer/requests/${requestId}`}>
            Back to Offer
          </Link>
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
        {loading && <p>Loading...</p>}

        {!loading && offer && (
          <>
            <div className="bg-white border rounded-2xl p-6 space-y-2">
              <p className="text-lg font-semibold">Congrats on the deal.</p>
              <p className="text-sm text-gray-700">
                You accepted an offer from <span className="font-semibold text-black">{dealerName}</span>
                {" "}for{" "}
                <span className="font-semibold text-black">
                  {request?.make || request?.desired_models} {request?.model || ""}
                </span>.
              </p>
              <p className="text-sm text-gray-700">
                Out-the-door total: <span className="font-semibold text-black">{money(offer.otd_total)}</span>
              </p>
              {offer.monthly_payment_est != null && (
                <p className="text-sm text-gray-700">
                  Estimated payment: <span className="font-semibold text-black">{money(offer.monthly_payment_est)}/mo</span>
                </p>
              )}
            </div>

            <div className="bg-white border rounded-2xl p-6 space-y-3">
              <h2 className="text-lg font-semibold">Next Steps</h2>
              <ul className="list-disc ml-6 text-sm space-y-1">
                <li>Dealer will contact you to confirm vehicle and pricing details.</li>
                <li>Be ready to provide ID/insurance and any needed paperwork.</li>
                <li>If financing applies, dealer may request credit verification.</li>
                <li>Confirm pickup/delivery timing and final documents.</li>
              </ul>

              <div className="border rounded-lg p-3 text-sm">
                <div>APR: {offer.assumed_apr != null ? `${offer.assumed_apr}%` : "—"}</div>
                <div>Term: {offer.assumed_term_months != null ? `${offer.assumed_term_months} mo` : "—"}</div>
                <div>Down payment: {offer.assumed_down_payment != null ? money(offer.assumed_down_payment) : "—"}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/buyer/requests" className="bg-black text-white px-4 py-2 rounded-lg">
                Go to Dashboard
              </Link>
              <Link href={`/buyer/requests/${requestId}`} className="underline text-sm">
                View Accepted Offer
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

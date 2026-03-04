"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DealerOffer = {
  id: string;
  request_id: string;
  selling_price: number;
  otd_total: number;
  monthly_payment_est: number | null;
  status: "submitted" | "withdrawn" | "accepted" | "expired";
  created_at: string;
};

type BuyerRequestSummary = {
  id: string;
  make?: string | null;
  model?: string | null;
  desired_models?: string | null;
  year_min?: number | null;
  year_max?: number | null;
  zip: string;
};

export default function DealerOffersPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [offers, setOffers] = useState<DealerOffer[]>([]);
  const [requestsById, setRequestsById] = useState<Record<string, BuyerRequestSummary>>({});

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

      const { data: myOffers, error: offersError } = await supabase
        .from("dealer_offers")
        .select("id, request_id, selling_price, otd_total, monthly_payment_est, status, created_at")
        .eq("dealer_id", user.id)
        .order("created_at", { ascending: false });

      if (offersError) {
        setMsg(offersError.message);
        setLoading(false);
        return;
      }

      const loadedOffers = (myOffers || []) as DealerOffer[];
      setOffers(loadedOffers);

      const requestIds = Array.from(new Set(loadedOffers.map((o) => o.request_id).filter(Boolean)));
      if (requestIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: reqData, error: reqError } = await supabase
        .from("buyer_requests")
        .select("id, make, model, desired_models, year_min, year_max, zip")
        .in("id", requestIds);

      if (reqError) {
        setMsg(reqError.message);
        setLoading(false);
        return;
      }

      const map: Record<string, BuyerRequestSummary> = {};
      for (const r of (reqData || []) as BuyerRequestSummary[]) {
        map[r.id] = r;
      }
      setRequestsById(map);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Offers</h1>
        <div className="flex items-center gap-4">
          <Link className="underline text-sm" href="/dealer/requests">
            Open Requests
          </Link>
          <Link className="underline text-sm" href="/dealer/account">
            Account
          </Link>
        </div>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <p>Loading...</p>}

      {!loading && offers.length === 0 && (
        <p className="text-sm">No offers submitted yet.</p>
      )}

      <div className="space-y-3">
        {offers.map((offer) => {
          const req = requestsById[offer.request_id];
          const title = req
            ? `${req.make || req.desired_models || "Vehicle"}${req.model ? ` ${req.model}` : ""}`
            : "Vehicle";
          const years = req
            ? req.year_min || req.year_max
              ? `(${req.year_min && req.year_max ? `${req.year_min}–${req.year_max}` : `${req.year_min ?? req.year_max}`})`
              : ""
            : "";

          return (
            <div key={offer.id} className="border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {title} {years}
                </div>
                <span className="text-xs border px-2 py-1 rounded">
                  {offer.status}
                </span>
              </div>

              <div className="text-sm">
                OTD: ${offer.otd_total} • Selling: ${offer.selling_price} • Payment:{" "}
                {offer.monthly_payment_est != null ? `$${offer.monthly_payment_est}/mo` : "—"}
              </div>

              <div className="text-sm">
                ZIP: {req?.zip ?? "—"} • Submitted: {new Date(offer.created_at).toLocaleString()}
              </div>

              <Link className="underline text-sm" href={`/dealer/requests/${offer.request_id}/offer`}>
                View Request / Offer Page
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BuyerRequest = {
  id: string;
  zip: string;
  radius_miles: number;
  make?: string | null;
  model?: string | null;
  desired_models?: string;
  condition: "new" | "used" | "either";
  year_min?: number | null;
  year_max?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  max_miles?: number | null;
  payment_method?: string | null;
  credit_tier: "760+" | "720-759" | "680-719" | "620-679" | "<620";
  term_months: number;
  down_payment: number;
  notes: string | null;
  status: "open" | "paused" | "accepted" | "closed";
  created_at: string;
};

export default function DealerRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState<BuyerRequest[]>([]);
  const [submittedRequestIds, setSubmittedRequestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setMsg("");
      setLoading(true);

      // Optional sanity: require signed in
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMsg("Not signed in. Go to /auth");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) setMsg(error.message);
      setItems((data || []) as BuyerRequest[]);

      const { data: myOffers, error: myOffersError } = await supabase
        .from("dealer_offers")
        .select("request_id, status")
        .eq("dealer_id", auth.user.id)
        .in("status", ["submitted", "accepted"]);

      if (myOffersError) {
        setMsg(myOffersError.message);
      } else {
        setSubmittedRequestIds(new Set((myOffers || []).map((o) => o.request_id)));
      }

      setLoading(false);
    })();
  }, []);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Open Buyer Requests</h1>
        <div className="flex items-center gap-4">
          <Link href="/dealer/offers" className="underline text-sm">
            Offers
          </Link>
          <Link href="/dealer/account" className="underline text-sm">
            Account
          </Link>
        </div>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <p>Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm">No open requests right now.</p>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="border p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {r.make || r.desired_models}
                {r.model ? ` ${r.model}` : ""}{" "}
                {r.year_min || r.year_max
                  ? `(${r.year_min && r.year_max ? `${r.year_min}–${r.year_max}` : `${r.year_min ?? r.year_max}`})`
                  : `(${r.condition})`}
              </div>
              {submittedRequestIds.has(r.id) ? (
                <span className="border border-green-200 bg-green-50 text-green-700 px-3 py-1 rounded">
                  Offer submitted
                </span>
              ) : (
                <Link
                  className="border px-3 py-1"
                  href={`/dealer/requests/${r.id}/offer`}
                >
                  Make offer
                </Link>
              )}
            </div>

            <div className="text-sm mt-2">
              ZIP {r.zip} • {r.radius_miles} mi • Price: {r.min_price != null || r.max_price != null ? ` $${r.min_price ?? '0'} - $${r.max_price ?? '0'}` : 'Any'}
            </div>
            <div className="text-sm mt-2">
              Mileage: {r.max_miles != null ? `${r.max_miles.toLocaleString()} mi` : 'Any'} • Payment: {r.payment_method ?? 'Finance'}
            </div>
            <div className="text-sm mt-2">Credit: {r.credit_tier} • Term: {r.term_months} • Down: ${r.down_payment}</div>

            {r.notes && (
              <div className="text-sm mt-2">
                <span className="font-medium">Notes:</span> {r.notes}
              </div>
            )}

            <div className="text-xs mt-2 opacity-70">
              Created {new Date(r.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

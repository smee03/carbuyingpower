"use client";
/*
  Buyer Request Detail Page

  Route:
    /buyer/requests/[id]

  Purpose:
    - Show a single buyer request (what the buyer posted)
    - Show all dealer offers submitted for that request
    - Allow sorting offers to compare them cleanly
    - Flag suspicious / incomplete pricing patterns with warnings

  Notes:
    - UUID validation prevents Postgres uuid errors
    - Ownership check prevents viewing other users' requests (RLS later)
*/

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BuyerRequest = {
  id: string;
  buyer_id: string;
  zip: string;
  radius_miles: number;
  desired_models: string;
  condition: "new" | "used" | "either";
  year_min?: number | null;
  year_max?: number | null;
  credit_tier: "760+" | "720-759" | "680-719" | "620-679" | "<620";
  term_months: number;
  down_payment: number;
  notes: string | null;
  status: "open" | "paused" | "accepted" | "closed";
  created_at: string;
};

type Addon = { name: string; amount: number };

type DealerOffer = {
  id: string;
  request_id: string;
  dealer_id: string;

  vin: string | null;
  stock_number: string | null;
  trim: string | null;

  msrp: number | null;
  selling_price: number;
  dealer_discount: number;
  rebates: number;

  addons: Addon[];

  doc_fee: number;
  tax: number;
  title_registration: number;
  other_fees: number;

  otd_total: number;

  assumed_apr: number | null;
  assumed_term_months: number | null;
  assumed_down_payment: number | null;
  monthly_payment_est: number | null;

  status: "submitted" | "withdrawn" | "accepted" | "expired";
  created_at: string;
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function addonsTotal(addons: Addon[] | null | undefined) {
  if (!Array.isArray(addons)) return 0;
  return addons.reduce((sum, a) => sum + (Number(a?.amount) || 0), 0);
}

/*
  Integrity warnings:
  These are intentionally "dumb but useful" heuristics.
  Goal: flag common dealership nonsense / incomplete quotes.

  Tune these thresholds over time using real data.
*/
function getOfferWarnings(o: DealerOffer) {
  const warnings: string[] = [];

  const addOns = addonsTotal(o.addons);

  // Missing identification → harder to trust/verify
  const hasIdentifier =
    (o.vin && o.vin.trim().length > 0) ||
    (o.stock_number && o.stock_number.trim().length > 0) ||
    (o.trim && o.trim.trim().length > 0);

  if (!hasIdentifier) warnings.push("No VIN/Stock#/Trim provided (harder to verify this exact car).");

  // Add-ons exist → likely “forced packages”
  if (addOns > 0) warnings.push(`Add-ons included ($${addOns}). Confirm these are removable/optional.`);

  // Doc fee sanity (varies by state, but extreme values are worth flagging)
  if (o.doc_fee >= 700) warnings.push(`Doc fee is high ($${o.doc_fee}). Ask what it includes and if it's capped by state.`);

  // Tax too low → often placeholder / incomplete
  if (o.tax <= 50) warnings.push(`Sales tax looks unusually low ($${o.tax}). Confirm full tax calculation is included.`);

  // Title/reg too high → maybe padded
  if (o.title_registration >= 1500) warnings.push(`Title/registration looks high ($${o.title_registration}). Confirm DMV estimate.`);

  // “Other fees” can be a junk drawer
  if (o.other_fees >= 500) warnings.push(`Other fees are notable ($${o.other_fees}). Ask for itemization.`);

  // Discount bigger than selling price is nonsense (or input error)
  if (o.dealer_discount > o.selling_price) warnings.push("Dealer discount exceeds selling price (likely an input error).");

  // OTD sanity
  if (o.otd_total <= 0) warnings.push("OTD total is not valid (should be > 0).");

  return warnings;
}

type SortKey = "otd" | "payment" | "addons";

export default function BuyerRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => params.id, [params]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [req, setReq] = useState<BuyerRequest | null>(null);
  const [offers, setOffers] = useState<DealerOffer[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("otd");

  useEffect(() => {
    if (!id) return;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    (async () => {
      if (!uuidRegex.test(id)) {
        setMsg("Invalid request ID.");
        setReq(null);
        setOffers([]);
        setLoading(false);
        return;
      }

      setMsg("");
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setMsg("Not signed in. Go to /auth");
        setReq(null);
        setOffers([]);
        setLoading(false);
        return;
      }

      const reqRes = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (reqRes.error) {
        setMsg(reqRes.error.message);
        setReq(null);
        setOffers([]);
        setLoading(false);
        return;
      }

      const loadedReq = reqRes.data as BuyerRequest;

      if (loadedReq.buyer_id !== user.id) {
        setMsg("You do not have access to this request.");
        setReq(null);
        setOffers([]);
        setLoading(false);
        return;
      }

      setReq(loadedReq);

      const offersRes = await supabase
        .from("dealer_offers")
        .select("*")
        .eq("request_id", id)
        .eq("status", "submitted")
        .order("created_at", { ascending: false });

      if (offersRes.error) {
        setMsg(offersRes.error.message);
        setOffers([]);
        setLoading(false);
        return;
      }

      setOffers((offersRes.data || []) as DealerOffer[]);
      setLoading(false);
    })();
  }, [id]);

  const sortedOffers = useMemo(() => {
    const copy = [...offers];

    copy.sort((a, b) => {
      if (sortKey === "otd") return (a.otd_total ?? 0) - (b.otd_total ?? 0);

      if (sortKey === "payment") {
        const ap = a.monthly_payment_est ?? Number.MAX_SAFE_INTEGER;
        const bp = b.monthly_payment_est ?? Number.MAX_SAFE_INTEGER;
        return ap - bp;
      }

      return addonsTotal(a.addons) - addonsTotal(b.addons);
    });

    return copy;
  }, [offers, sortKey]);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Buyer Request</h1>
        <Link className="underline" href="/buyer/requests">
          Back
        </Link>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <p>Loading…</p>}

      {req && (
        <div className="border p-4 space-y-2">
          <div className="font-medium">
            {req.desired_models} {(req.year_min || req.year_max) ? `(${req.year_min && req.year_max ? `${req.year_min}–${req.year_max}` : `${req.year_min ?? req.year_max}`})` : `(${req.condition})`}
          </div>
          <div className="text-sm">
            ZIP {req.zip} • {req.radius_miles} mi • Credit: {req.credit_tier} • Term:{" "}
            {req.term_months} • Down: ${req.down_payment}
          </div>
          {req.notes && <div className="text-sm mt-2">Notes: {req.notes}</div>}
          <div className="text-xs opacity-70">
            Status: {req.status} • Created {new Date(req.created_at).toLocaleString()}
          </div>
        </div>
      )}

      <div className="border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Offers</h2>

          <div className="text-sm space-x-2">
            <span className="opacity-70">Sort:</span>
            <button className="underline" onClick={() => setSortKey("otd")}>
              OTD
            </button>
            <button className="underline" onClick={() => setSortKey("payment")}>
              Payment
            </button>
            <button className="underline" onClick={() => setSortKey("addons")}>
              Add-ons
            </button>
          </div>
        </div>

        {sortedOffers.length === 0 ? (
          <p className="text-sm opacity-80">No offers yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedOffers.map((o) => {
              const aTotal = addonsTotal(o.addons);
              const warnings = getOfferWarnings(o);
              const vehicleSubtotal = o.selling_price - o.dealer_discount - o.rebates + aTotal;
              const feesTotal = o.doc_fee + o.tax + o.title_registration + o.other_fees;

              return (
                <div key={o.id} className="border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      Offer • OTD <span className="font-semibold">{money(o.otd_total)}</span>
                    </div>
                    <div className="text-xs opacity-70">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Integrity warnings */}
                  {warnings.length > 0 && (
                    <div className="border p-3">
                      <div className="text-sm font-medium">Warnings</div>
                      <ul className="list-disc ml-6 mt-1 text-sm">
                        {warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden bg-white text-black">
                    <div className="bg-white px-3 py-2 text-sm font-semibold text-black">OTD Breakdown</div>
                    <div className="text-sm text-black">
                      <div className="grid grid-cols-2 px-3 py-2 border-t text-black">
                        <span>Selling price</span>
                        <span className="text-right">{money(o.selling_price)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t text-black">
                        <span>Dealer discount</span>
                        <span className="text-right">-{money(o.dealer_discount)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t text-black">
                        <span>Rebates</span>
                        <span className="text-right">-{money(o.rebates)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t text-black">
                        <span>Add-ons</span>
                        <span className="text-right">{money(aTotal)}</span>
                      </div>
                      {Array.isArray(o.addons) && o.addons.length > 0 && (
                        <div className="px-3 pb-2 text-xs text-black">
                          {o.addons.map((a, idx) => (
                            <div key={idx}>
                              {a.name || "(unnamed)"}: {money(a.amount || 0)}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 px-3 py-2 border-t font-medium text-black">
                        <span>Vehicle subtotal</span>
                        <span className="text-right">{money(vehicleSubtotal)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t text-black">
                        <span>Doc fee</span>
                        <span className="text-right">{money(o.doc_fee)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t text-black">
                        <span>Tax</span>
                        <span className="text-right">{money(o.tax)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t text-black">
                        <span>Title/registration</span>
                        <span className="text-right">{money(o.title_registration)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t text-black">
                        <span>Other fees</span>
                        <span className="text-right">{money(o.other_fees)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t font-medium text-black">
                        <span>Fees subtotal</span>
                        <span className="text-right">{money(feesTotal)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t bg-white font-semibold text-black">
                        <span>Out-the-door total</span>
                        <span className="text-right">{money(o.otd_total)}</span>
                      </div>
                      <div className="grid grid-cols-2 px-3 py-2 border-t font-semibold text-black">
                        <span>Est. payment</span>
                        <span className="text-right">
                          {o.monthly_payment_est ? `${money(o.monthly_payment_est)}/mo` : "—"}
                        </span>
                      </div>
                      {o.assumed_apr != null && (
                        <div className="px-3 py-2 border-t text-xs font-semibold text-black">
                          APR {o.assumed_apr}% • {o.assumed_term_months ?? "?"} mo • Down $
                          {o.assumed_down_payment ?? 0}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

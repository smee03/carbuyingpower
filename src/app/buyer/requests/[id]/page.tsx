"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  status: "submitted" | "withdrawn" | "accepted" | "expired" | "declined";
  decline_reason?: string | null;
  created_at: string;
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function addonsTotal(addons: Addon[] | null | undefined) {
  if (!Array.isArray(addons)) return 0;
  return addons.reduce((sum, a) => sum + (Number(a?.amount) || 0), 0);
}

function getOfferWarnings(o: DealerOffer) {
  const warnings: string[] = [];
  const addOns = addonsTotal(o.addons);
  const hasIdentifier =
    (o.vin && o.vin.trim().length > 0) ||
    (o.stock_number && o.stock_number.trim().length > 0) ||
    (o.trim && o.trim.trim().length > 0);
  if (!hasIdentifier) warnings.push("No VIN/Stock#/Trim provided — harder to verify this exact car.");
  if (addOns > 0) warnings.push(`Add-ons included (${money(addOns)}). Confirm these are removable/optional.`);
  if (o.doc_fee >= 700) warnings.push(`Doc fee is high (${money(o.doc_fee)}). Ask what it includes.`);
  if (o.tax <= 50) warnings.push(`Sales tax looks unusually low (${money(o.tax)}). Confirm full tax is included.`);
  if (o.title_registration >= 1500) warnings.push(`Title/registration looks high (${money(o.title_registration)}). Confirm DMV estimate.`);
  if (o.other_fees >= 500) warnings.push(`Other fees are notable (${money(o.other_fees)}). Ask for itemization.`);
  if (o.dealer_discount > o.selling_price) warnings.push("Dealer discount exceeds selling price — likely an input error.");
  if (o.otd_total <= 0) warnings.push("OTD total is not valid — should be greater than $0.");
  return warnings;
}

type SortKey = "otd" | "payment" | "addons";

const REQUEST_STATUS_COLORS: Record<string, string> = {
  open:     "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  accepted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  paused:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  closed:   "bg-muted text-muted-foreground",
};

const OFFER_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  accepted:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  expired:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  declined:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  withdrawn: "bg-muted text-muted-foreground",
};

export default function BuyerRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = useMemo(() => params.id, [params]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [req, setReq] = useState<BuyerRequest | null>(null);
  const [offers, setOffers] = useState<DealerOffer[]>([]);
  const [dealerNames, setDealerNames] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey>("otd");
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [decidingOfferId, setDecidingOfferId] = useState<string | null>(null);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    (async () => {
      if (!uuidRegex.test(id)) {
        setMsg("Invalid request ID.");
        setLoading(false);
        return;
      }

      setMsg("");
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setMsg("Not signed in. Go to /auth");
        setLoading(false);
        return;
      }

      const reqRes = await supabase.from("buyer_requests").select("*").eq("id", id).single();
      if (reqRes.error) {
        setMsg(reqRes.error.message);
        setLoading(false);
        return;
      }

      const loadedReq = reqRes.data as BuyerRequest;
      if (loadedReq.buyer_id !== user.id) {
        setMsg("You do not have access to this request.");
        setLoading(false);
        return;
      }
      setReq(loadedReq);

      const offersRes = await supabase
        .from("dealer_offers")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false });

      if (offersRes.error) {
        setMsg(offersRes.error.message);
        setLoading(false);
        return;
      }

      const loadedOffers = (offersRes.data || []) as DealerOffer[];
      setOffers(loadedOffers);

      const dealerIds = Array.from(new Set(loadedOffers.map((o) => o.dealer_id).filter(Boolean)));
      if (dealerIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", dealerIds);
        if (!profileError) {
          const map: Record<string, string> = {};
          for (const p of profileData || []) {
            const profile = p as { id: string; display_name: string | null };
            map[profile.id] = profile.display_name || "Dealer";
          }
          setDealerNames(map);
        }
      }
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

  const highestOtd = useMemo(
    () => Math.max(...offers.filter((o) => o.status === "submitted" || o.status === "accepted").map((o) => o.otd_total), 0),
    [offers]
  );

  function offerStatusLabel(status: DealerOffer["status"]) {
    if (status === "expired") return "declined";
    return status;
  }

  async function handleOfferDecision(offer: DealerOffer, decision: "accepted" | "declined") {
    if (!req) return;
    const note = (decisionNotes[offer.id] || "").trim();
    if (decision === "declined" && !note) {
      setMsg("Please provide a decline reason before declining.");
      return;
    }

    setMsg("");
    setDecidingOfferId(offer.id);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      setMsg("Not authenticated. Please sign in again.");
      setDecidingOfferId(null);
      return;
    }

    const res = await fetch(`/api/dealer-offers/${offer.id}/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ decision, reason: decision === "declined" ? note : undefined }),
    });

    const payload = await res.json();
    if (!res.ok) {
      setMsg(payload.message || "Failed to update offer");
      setDecidingOfferId(null);
      return;
    }

    if (decision === "accepted") {
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, status: "accepted" } : o)));
      setReq({ ...req, status: "accepted" });
      setDecidingOfferId(null);
      router.push(`/buyer/requests/${req.id}/accepted?offerId=${offer.id}`);
      return;
    }

    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, status: "expired", decline_reason: note } : o))
    );
    setDecidingOfferId(null);
  }

  const vehicleLabel = req
    ? `${req.desired_models}${req.year_min || req.year_max
        ? ` (${req.year_min && req.year_max ? `${req.year_min}–${req.year_max}` : `${req.year_min ?? req.year_max}`})`
        : ` (${req.condition})`}`
    : "";

  return (
    <main className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/buyer/requests"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 mb-1")}
            >
              ← Back to Dashboard
            </Link>
            {req && <h1 className="text-2xl font-bold tracking-tight">{vehicleLabel}</h1>}
          </div>
          {req && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${REQUEST_STATUS_COLORS[req.status] ?? "bg-muted text-muted-foreground"}`}>
              {req.status}
            </span>
          )}
        </div>

        {msg && <p className="text-sm text-destructive">{msg}</p>}
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {/* Request details card */}
        {req && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Request</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-foreground">
              <div><span className="text-muted-foreground">Location</span> — ZIP {req.zip} · {req.radius_miles} mi</div>
              <div><span className="text-muted-foreground">Credit</span> — {req.credit_tier}</div>
              <div><span className="text-muted-foreground">Term</span> — {req.term_months} months</div>
              <div><span className="text-muted-foreground">Down</span> — ${req.down_payment.toLocaleString()}</div>
            </div>
            {req.notes && (
              <div className="text-sm border-t border-border pt-3">
                <span className="text-muted-foreground">Notes</span> — {req.notes}
              </div>
            )}
            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              Posted {new Date(req.created_at).toLocaleString()}
            </div>
          </div>
        )}

        {/* Offers section */}
        <div className="space-y-4">
          <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">
              Offers
              {offers.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">{offers.length} received</span>
              )}
            </h2>

            {offers.length > 1 && (
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 text-sm">
                {(["otd", "payment", "addons"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSortKey(key)}
                    className={`px-3 py-1 rounded-lg transition text-sm ${
                      sortKey === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {key === "otd" ? "OTD" : key === "payment" ? "Payment" : "Add-ons"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Empty state */}
          {!loading && offers.length === 0 && req && (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/40 px-6 py-4 flex items-center gap-3">
                  <div className="relative flex-shrink-0 w-3 h-3">
                    <div className="absolute inset-0 rounded-full bg-green-500" />
                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
                  </div>
                  <div>
                    <div className="font-semibold text-green-800 dark:text-green-400 text-sm">Your request is live</div>
                    <div className="text-xs text-green-700 dark:text-green-500 mt-0.5">
                      Posted {timeAgo(req.created_at)} · dealers within {req.radius_miles} miles of {req.zip} are reviewing
                    </div>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-muted-foreground">Offers will appear here as dealers respond.</p>
                  <ol className="space-y-3">
                    {[
                      { done: true,  label: "Request posted",       desc: "Your request is visible to matching dealers." },
                      { done: false, label: "Dealers are reviewing", desc: "Local dealers are checking inventory and preparing offers." },
                      { done: false, label: "Offers arrive here",    desc: "Each offer includes a full OTD breakdown you can compare." },
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          step.done
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {step.done ? "✓" : i + 1}
                        </div>
                        <div>
                          <span className={`font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </span>
                          <span className="text-muted-foreground"> — {step.desc}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  What dealers see in your request
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                  {[
                    { label: "Vehicle",   value: vehicleLabel },
                    { label: "Condition", value: req.condition },
                    { label: "Location",  value: `ZIP ${req.zip} · ${req.radius_miles} mi radius` },
                    { label: "Credit",    value: req.credit_tier },
                    { label: "Term",      value: `${req.term_months} months` },
                    { label: "Down",      value: `$${req.down_payment.toLocaleString()}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-2">
                      <span className="text-muted-foreground w-20 flex-shrink-0">{label}</span>
                      <span className="text-foreground font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                {req.notes && (
                  <div className="mt-4 pt-4 border-t border-border text-sm">
                    <span className="text-muted-foreground">Notes — </span>
                    <span>{req.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Offer cards */}
          {sortedOffers.map((o, idx) => {
            const aTotal = addonsTotal(o.addons);
            const warnings = getOfferWarnings(o);
            const vehicleSubtotal = o.selling_price - o.dealer_discount - o.rebates + aTotal;
            const feesTotal = o.doc_fee + o.tax + o.title_registration + o.other_fees;
            const savingsVsHighest = highestOtd > 0 && o.otd_total < highestOtd ? highestOtd - o.otd_total : 0;
            const isExpanded = expandedOfferId === o.id;
            const isBest = idx === 0 && sortedOffers.length > 1 && (o.status === "submitted" || o.status === "accepted");
            const dealerName = dealerNames[o.dealer_id] || "Dealer";
            const isSubmitted = o.status === "submitted";

            return (
              <div
                key={o.id}
                className={`bg-card rounded-2xl border transition ${
                  isBest ? "border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-800" : "border-border"
                }`}
              >
                {/* Rank + dealer header */}
                <div className="flex items-center gap-3 px-6 pt-5 pb-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isBest ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="font-semibold">{dealerName}</span>
                  {isBest && (
                    <span className="text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
                      Best {sortKey === "otd" ? "OTD" : sortKey === "payment" ? "Payment" : "Fewest Add-ons"}
                    </span>
                  )}
                  <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium ${OFFER_STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground"}`}>
                    {offerStatusLabel(o.status)}
                  </span>
                </div>

                {/* At-a-glance summary */}
                <div className="px-6 pb-4 grid grid-cols-3 gap-2 sm:gap-4 border-b border-border">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Out-the-door</div>
                    <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{money(o.otd_total)}</div>
                    {savingsVsHighest > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                        {money(savingsVsHighest)} less than highest
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Est. monthly</div>
                    <div className="text-lg sm:text-xl font-bold">
                      {o.monthly_payment_est ? `${money(o.monthly_payment_est)}/mo` : "—"}
                    </div>
                    {o.assumed_apr != null && (
                      <div className="text-xs text-muted-foreground mt-0.5">{o.assumed_apr}% APR · {o.assumed_term_months} mo</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Add-ons</div>
                    <div className={`text-lg sm:text-xl font-bold ${aTotal > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {aTotal > 0 ? money(aTotal) : "None"}
                    </div>
                    {aTotal > 0 && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        {o.addons.length} item{o.addons.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>

                {/* Accept button — visible without expanding */}
                {isSubmitted && (
                  <div className="px-6 py-3 flex items-center gap-3 border-b border-border">
                    <Button
                      size="sm"
                      onClick={() => handleOfferDecision(o, "accepted")}
                      disabled={decidingOfferId === o.id}
                    >
                      {decidingOfferId === o.id ? "Processing…" : "Accept Offer"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setExpandedOfferId(isExpanded ? null : o.id)}
                      className="text-sm text-muted-foreground hover:text-foreground transition underline underline-offset-4"
                    >
                      Decline or view breakdown
                    </button>
                  </div>
                )}

                {/* Expand toggle (when not submitted) */}
                {!isSubmitted && (
                  <button
                    type="button"
                    onClick={() => setExpandedOfferId(isExpanded ? null : o.id)}
                    className="w-full flex items-center justify-center gap-1 py-3 text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    {isExpanded ? "Hide breakdown" : "View full breakdown"}
                    <span className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                  </button>
                )}

                {/* Expanded breakdown */}
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <div className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">Things to verify</div>
                        <ul className="space-y-1">
                          {warnings.map((w, i) => (
                            <li key={i} className="flex gap-2 text-sm text-amber-700 dark:text-amber-500">
                              <span className="mt-0.5 shrink-0">⚠</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* OTD Breakdown table */}
                    <div className="rounded-xl border border-border overflow-hidden text-sm">
                      <div className="bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        OTD Breakdown
                      </div>

                      {[
                        { label: "Selling price",    value: money(o.selling_price) },
                        { label: "Dealer discount",  value: `-${money(o.dealer_discount)}`, dim: o.dealer_discount === 0, save: o.dealer_discount > 0 },
                        { label: "Rebates",          value: `-${money(o.rebates)}`, dim: o.rebates === 0, save: o.rebates > 0 },
                        { label: "Add-ons",          value: money(aTotal), warn: aTotal > 0 },
                      ].map(({ label, value, dim, warn, save }) => (
                        <div key={label} className={`grid grid-cols-2 px-4 py-2.5 border-t border-border ${dim ? "text-muted-foreground" : ""}`}>
                          <span>{label}</span>
                          <span className={`text-right font-medium ${warn ? "text-amber-600 dark:text-amber-400" : save ? "text-green-600 dark:text-green-400" : ""}`}>
                            {value}
                          </span>
                        </div>
                      ))}

                      {Array.isArray(o.addons) && o.addons.length > 0 && (
                        <div className="px-4 pb-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-900/40">
                          {o.addons.map((a, i) => (
                            <div key={i} className="grid grid-cols-2 py-1 text-xs text-amber-700 dark:text-amber-500">
                              <span className="pl-3">{a.name || "(unnamed)"}</span>
                              <span className="text-right">{money(a.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 px-4 py-2.5 border-t border-border bg-muted/40 font-medium">
                        <span>Vehicle subtotal</span>
                        <span className="text-right">{money(vehicleSubtotal)}</span>
                      </div>

                      {[
                        { label: "Doc fee",            value: money(o.doc_fee) },
                        { label: "Sales tax",          value: money(o.tax) },
                        { label: "Title / registration", value: money(o.title_registration) },
                        { label: "Other fees",         value: money(o.other_fees) },
                      ].map(({ label, value }) => (
                        <div key={label} className="grid grid-cols-2 px-4 py-2.5 border-t border-border text-muted-foreground">
                          <span>{label}</span>
                          <span className="text-right">{value}</span>
                        </div>
                      ))}

                      <div className="grid grid-cols-2 px-4 py-2.5 border-t border-border bg-muted/40 font-medium text-muted-foreground">
                        <span>Fees subtotal</span>
                        <span className="text-right">{money(feesTotal)}</span>
                      </div>

                      <div className="grid grid-cols-2 px-4 py-3 border-t border-border font-bold text-base">
                        <span>Out-the-door total</span>
                        <span className="text-right text-green-600 dark:text-green-400">{money(o.otd_total)}</span>
                      </div>

                      <div className="border-t border-border grid grid-cols-3 px-4 py-3 text-sm text-muted-foreground bg-muted/40">
                        <div>
                          <div className="text-xs text-muted-foreground">APR</div>
                          {o.assumed_apr != null ? `${o.assumed_apr}%` : "—"}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Term</div>
                          {o.assumed_term_months != null ? `${o.assumed_term_months} mo` : "—"}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Down</div>
                          {o.assumed_down_payment != null ? money(o.assumed_down_payment) : "—"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 px-4 py-3 border-t border-border font-semibold">
                        <span>Est. monthly payment</span>
                        <span className="text-right">
                          {o.monthly_payment_est ? `${money(o.monthly_payment_est)}/mo` : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Vehicle identifiers */}
                    {(o.vin || o.stock_number || o.trim || o.msrp) && (
                      <div className="rounded-xl border border-border px-4 py-3 text-sm grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-muted-foreground">
                        {o.trim && <div><span className="text-muted-foreground">Trim</span> — {o.trim}</div>}
                        {o.vin && <div><span className="text-muted-foreground">VIN</span> — {o.vin}</div>}
                        {o.stock_number && <div><span className="text-muted-foreground">Stock #</span> — {o.stock_number}</div>}
                        {o.msrp != null && <div><span className="text-muted-foreground">MSRP</span> — {money(o.msrp)}</div>}
                      </div>
                    )}

                    {/* Decline reason (if already declined) */}
                    {(o.status === "expired" || o.status === "declined") && o.decline_reason && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                        <span className="font-semibold">Decline reason:</span> {o.decline_reason}
                      </div>
                    )}

                    {/* Decline section (only for submitted offers) */}
                    {isSubmitted && (
                      <div className="rounded-xl border border-border p-4 space-y-3">
                        <label className="block text-sm font-medium">
                          Decline reason{" "}
                          <span className="font-normal text-muted-foreground">(required to decline)</span>
                        </label>
                        <textarea
                          value={decisionNotes[o.id] || ""}
                          onChange={(e) => setDecisionNotes((prev) => ({ ...prev, [o.id]: e.target.value }))}
                          className="w-full border border-border rounded-lg p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                          rows={3}
                          placeholder="e.g. price above budget, fees too high, trim mismatch…"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOfferDecision(o, "declined")}
                          disabled={decidingOfferId === o.id}
                        >
                          Decline Offer
                        </Button>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground text-right">
                      Submitted {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

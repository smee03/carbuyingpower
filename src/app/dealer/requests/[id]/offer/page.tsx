"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  miles_per_year?: number | null;
  notes: string | null;
  status: "open" | "paused" | "accepted" | "closed";
};

type Addon = { name: string; amount: number };

function asInt(v: unknown) {
  const n = typeof v === "number" ? v : parseInt(String(v || "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

function sumAddons(addons: Addon[]) {
  return addons.reduce((acc, a) => acc + (Number.isFinite(a.amount) ? a.amount : 0), 0);
}

function calcOtdTotal(args: {
  sellingPrice: number; dealerDiscount: number; rebates: number;
  addonsTotal: number; docFee: number; tax: number; titleReg: number; otherFees: number;
}) {
  const { sellingPrice, dealerDiscount, rebates, addonsTotal, docFee, tax, titleReg, otherFees } = args;
  return (sellingPrice || 0) - (dealerDiscount || 0) - (rebates || 0) + (addonsTotal || 0) +
    (docFee || 0) + (tax || 0) + (titleReg || 0) + (otherFees || 0);
}

function calcMonthlyPayment(principal: number, aprPct: number, termMonths: number) {
  if (!principal || principal <= 0 || !termMonths || termMonths <= 0) return 0;
  if (!aprPct || aprPct <= 0) return Math.round(principal / termMonths);
  const r = aprPct / 100 / 12;
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -termMonths)));
}

function validateOffer(input: {
  vin: string; stockNumber: string; trim: string;
  sellingPrice: number; dealerDiscount: number; rebates: number;
  addons: Addon[]; docFee: number; tax: number; titleReg: number; otherFees: number;
  assumedApr: number; assumedTerm: number; assumedDown: number; otdTotal: number;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { vin, stockNumber, trim, sellingPrice, dealerDiscount, rebates, addons,
    docFee, tax, titleReg, otherFees, assumedApr, assumedTerm, assumedDown, otdTotal } = input;

  if (!vin.trim() && !stockNumber.trim() && !trim.trim())
    errors.push("Provide at least one identifier: VIN, Stock #, or Trim.");
  if (sellingPrice <= 0) errors.push("Selling price must be greater than 0.");

  for (const [f, v] of [["Dealer discount", dealerDiscount], ["Rebates", rebates],
    ["Doc fee", docFee], ["Tax", tax], ["Title/Reg", titleReg],
    ["Other fees", otherFees], ["Down payment", assumedDown]] as [string, number][]) {
    if (v < 0) errors.push(`${f} cannot be negative.`);
  }

  for (const [i, a] of addons.entries()) {
    const name = (a.name || "").trim();
    const amt = asInt(a.amount);
    if (!name && amt > 0) errors.push(`Add-on #${i + 1} has an amount but no name.`);
    if (name && amt <= 0) errors.push(`Add-on "${name}" must have an amount > 0.`);
    if (!name && amt === 0) errors.push(`Remove blank add-on row #${i + 1}.`);
  }

  if (otdTotal <= 0) errors.push("OTD total must be greater than 0. Check your numbers.");
  if (assumedApr < 0 || assumedApr > 25) errors.push("APR must be between 0% and 25%.");
  if (assumedTerm <= 0 || assumedTerm > 120) errors.push("Term months must be between 1 and 120.");

  if (tax <= 25) warnings.push("Tax looks very low. Confirm this is full sales tax.");
  if (docFee > 800) warnings.push("Doc fee looks high. Buyers may expect justification.");
  if (titleReg > 1500) warnings.push("Title/registration looks high. Confirm DMV estimate.");

  return { errors, warnings };
}

function FieldGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function DealerOfferPage() {
  const params = useParams<{ id: string }>();
  const requestId = useMemo(() => params.id, [params]);
  const router = useRouter();

  const [loadingReq, setLoadingReq] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [req, setReq] = useState<BuyerRequest | null>(null);
  const [existingOfferId, setExistingOfferId] = useState<string | null>(null);
  const [existingOfferDate, setExistingOfferDate] = useState<string | null>(null);

  const [vin, setVin] = useState("");
  const [stockNumber, setStockNumber] = useState("");
  const [trim, setTrim] = useState("");
  const [msrp, setMsrp] = useState<number | "">("");
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [dealerDiscount, setDealerDiscount] = useState<number>(0);
  const [rebates, setRebates] = useState<number>(0);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [docFee, setDocFee] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [titleReg, setTitleReg] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);
  const [assumedApr, setAssumedApr] = useState<number>(0);
  const [assumedTerm, setAssumedTerm] = useState<number>(60);
  const [assumedDown, setAssumedDown] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setMsg("");
      setLoadingReq(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setMsg("Not signed in. Go to /auth"); setLoadingReq(false); return; }

      const { data, error } = await supabase.from("buyer_requests").select("*").eq("id", requestId).single();
      if (error) { setMsg(error.message); setReq(null); setLoadingReq(false); return; }

      const reqData = data as BuyerRequest & { term_months: number; down_payment: number };
      setReq(reqData);
      setAssumedTerm(reqData.term_months ?? 60);
      setAssumedDown(reqData.down_payment ?? 0);

      // Load existing offer if dealer already submitted one
      const { data: existing } = await supabase
        .from("dealer_offers")
        .select("*")
        .eq("request_id", requestId)
        .eq("dealer_id", auth.user.id)
        .eq("status", "submitted")
        .maybeSingle();

      if (existing) {
        setExistingOfferId(existing.id);
        setExistingOfferDate(existing.created_at);
        setVin(existing.vin ?? "");
        setStockNumber(existing.stock_number ?? "");
        setTrim(existing.trim ?? "");
        setMsrp(existing.msrp ?? "");
        setSellingPrice(existing.selling_price ?? 0);
        setDealerDiscount(existing.dealer_discount ?? 0);
        setRebates(existing.rebates ?? 0);
        setAddons(Array.isArray(existing.addons) ? existing.addons : []);
        setDocFee(existing.doc_fee ?? 0);
        setTax(existing.tax ?? 0);
        setTitleReg(existing.title_registration ?? 0);
        setOtherFees(existing.other_fees ?? 0);
        setAssumedApr(existing.assumed_apr ?? 0);
        setAssumedTerm(existing.assumed_term_months ?? reqData.term_months ?? 60);
        setAssumedDown(existing.assumed_down_payment ?? reqData.down_payment ?? 0);
      }

      setLoadingReq(false);
    })();
  }, [requestId]);

  const addonsTotal = useMemo(() => sumAddons(addons), [addons]);
  const otdTotal = useMemo(() => calcOtdTotal({ sellingPrice, dealerDiscount, rebates, addonsTotal, docFee, tax, titleReg, otherFees }), [sellingPrice, dealerDiscount, rebates, addonsTotal, docFee, tax, titleReg, otherFees]);
  const principal = useMemo(() => Math.max(otdTotal - (assumedDown || 0), 0), [otdTotal, assumedDown]);
  const monthlyPaymentEst = useMemo(() => calcMonthlyPayment(principal, assumedApr || 0, assumedTerm || 60), [principal, assumedApr, assumedTerm]);

  function updateAddon(idx: number, patch: Partial<Addon>) {
    setAddons((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function removeAddon(idx: number) {
    setAddons((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitOffer() {
    setMsg("");
    setErrors([]);
    setWarnings([]);
    setSubmitting(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) { setMsg("Not signed in. Go to /auth"); setSubmitting(false); return; }
    if (!req) { setMsg("Request not loaded."); setSubmitting(false); return; }

    const v = validateOffer({ vin, stockNumber, trim, sellingPrice, dealerDiscount, rebates, addons, docFee, tax, titleReg, otherFees, assumedApr, assumedTerm, assumedDown, otdTotal });
    setErrors(v.errors);
    setWarnings(v.warnings);
    if (v.errors.length > 0) { setSubmitting(false); return; }

    const payload = {
      vin: vin.trim() || null,
      stock_number: stockNumber.trim() || null,
      trim: trim.trim() || null,
      msrp: msrp === "" ? null : msrp,
      selling_price: sellingPrice,
      dealer_discount: dealerDiscount || 0,
      rebates: rebates || 0,
      addons,
      doc_fee: docFee || 0,
      tax: tax || 0,
      title_registration: titleReg || 0,
      other_fees: otherFees || 0,
      otd_total: otdTotal,
      assumed_apr: assumedApr || null,
      assumed_credit_tier: req.credit_tier,
      assumed_term_months: assumedTerm || 60,
      assumed_down_payment: assumedDown || 0,
      monthly_payment_est: monthlyPaymentEst || null,
    };

    const { error } = existingOfferId
      ? await supabase.from("dealer_offers").update(payload).eq("id", existingOfferId)
      : await supabase.from("dealer_offers").insert({ request_id: requestId, dealer_id: user.id, ...payload });

    if (error) { setMsg(error.message); setSubmitting(false); return; }
    router.push("/dealer/requests");
  }

  return (
    <main className="min-h-screen bg-muted/40 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <Link href="/dealer/requests" className="text-sm text-muted-foreground hover:text-foreground transition">
              ← Back to requests
            </Link>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              {existingOfferId ? "Your Submitted Offer" : "Make an Offer"}
            </h1>
          </div>
        </div>

        {existingOfferId && existingOfferDate && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            You submitted this offer on {new Date(existingOfferDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.
            You can update any field below and save your changes.
          </div>
        )}

        {msg && <p className="text-sm text-destructive">{msg}</p>}

        {errors.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-destructive mb-2">Fix these before submitting:</p>
              <ul className="list-disc ml-5 space-y-1 text-sm text-destructive">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {warnings.length > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">Warnings (won't block submit):</p>
              <ul className="list-disc ml-5 space-y-1 text-sm text-amber-700">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {loadingReq && <p className="text-sm text-muted-foreground">Loading request…</p>}

        {/* Buyer request summary */}
        {req && (
          <Card className="bg-muted/20">
            <CardContent className="p-5 space-y-4">

              {/* Vehicle + condition */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Buyer Request
                  </p>
                  <p className="text-xl font-bold leading-tight">
                    {req.make && req.model
                      ? `${req.make} ${req.model}`
                      : req.make ?? req.desired_models ?? "Vehicle"}
                  </p>
                  {(req.year_min || req.year_max) && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {req.year_min && req.year_max
                        ? `${req.year_min}–${req.year_max}`
                        : req.year_min ? `From ${req.year_min}` : `Up to ${req.year_max}`}
                    </p>
                  )}
                </div>
                <span className={cn(
                  "flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium border",
                  req.condition === "new"    ? "bg-blue-50 text-blue-700 border-blue-200" :
                  req.condition === "used"   ? "bg-amber-50 text-amber-700 border-amber-200" :
                                              "bg-muted text-muted-foreground border-border"
                )}>
                  {req.condition === "new" ? "New" : req.condition === "used" ? "Used" : "New or Used"}
                </span>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  {
                    label: "Location",
                    value: `ZIP ${req.zip} · ${req.radius_miles} mi radius`,
                  },
                  {
                    label: "Price range",
                    value: req.min_price != null || req.max_price != null
                      ? `$${(req.min_price ?? 0).toLocaleString()} – $${(req.max_price ?? 0).toLocaleString()}`
                      : "Any",
                  },
                  req.payment_method === "lease"
                    ? {
                        label: "Miles/year",
                        value: req.miles_per_year ? `${req.miles_per_year.toLocaleString()} mi/yr` : "Any",
                      }
                    : {
                        label: "Max mileage",
                        value: req.max_miles != null ? `${req.max_miles.toLocaleString()} mi` : "Any",
                      },
                  {
                    label: "Credit tier",
                    value: req.credit_tier,
                  },
                  {
                    label: req.payment_method === "lease" ? "Lease term" : "Loan term",
                    value: `${req.term_months} months`,
                  },
                  {
                    label: req.payment_method === "lease" ? "Due at signing" : "Down payment",
                    value: `$${req.down_payment.toLocaleString()}`,
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-background rounded-lg px-3 py-2.5">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {req.notes && (
                <div className="bg-background rounded-lg px-3 py-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Buyer notes</p>
                  <p className="text-sm">{req.notes}</p>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* Vehicle identity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="VIN (optional)">
                <Input placeholder="1HGCM82633A123456" value={vin} onChange={(e) => setVin(e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Stock # (optional)">
                <Input placeholder="A12345" value={stockNumber} onChange={(e) => setStockNumber(e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Trim (optional)">
                <Input placeholder="e.g. EX-L, SEL, Sport" value={trim} onChange={(e) => setTrim(e.target.value)} />
              </FieldGroup>
              <FieldGroup label="MSRP (optional)">
                <Input type="number" placeholder="32000" value={msrp} onChange={(e) => setMsrp(e.target.value === "" ? "" : asInt(e.target.value))} />
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FieldGroup label="Selling price *">
                <Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(asInt(e.target.value))} />
              </FieldGroup>
              <FieldGroup label="Dealer discount">
                <Input type="number" value={dealerDiscount} onChange={(e) => setDealerDiscount(asInt(e.target.value))} />
              </FieldGroup>
              <FieldGroup label="Rebates">
                <Input type="number" value={rebates} onChange={(e) => setRebates(asInt(e.target.value))} />
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        {/* Add-ons */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dealer Add-ons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addons.length === 0 && (
              <p className="text-sm text-muted-foreground">No add-ons. Click below to add one.</p>
            )}
            {addons.map((a, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-7"
                  placeholder="Add-on name (e.g. Window Tint)"
                  value={a.name}
                  onChange={(e) => updateAddon(idx, { name: e.target.value })}
                />
                <Input
                  className="col-span-4"
                  type="number"
                  placeholder="Amount"
                  value={a.amount}
                  onChange={(e) => updateAddon(idx, { amount: asInt(e.target.value) })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-1 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAddon(idx)}
                >
                  ✕
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="sm" onClick={() => setAddons((p) => [...p, { name: "", amount: 0 }])}>
                + Add add-on
              </Button>
              {addons.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">${addonsTotal.toLocaleString()}</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fees */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fees &amp; Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <FieldGroup label="Doc fee">
                <Input type="number" value={docFee} onChange={(e) => setDocFee(asInt(e.target.value))} />
              </FieldGroup>
              <FieldGroup label="Sales tax">
                <Input type="number" value={tax} onChange={(e) => setTax(asInt(e.target.value))} />
              </FieldGroup>
              <FieldGroup label="Title / Reg">
                <Input type="number" value={titleReg} onChange={(e) => setTitleReg(asInt(e.target.value))} />
              </FieldGroup>
              <FieldGroup label="Other fees">
                <Input type="number" value={otherFees} onChange={(e) => setOtherFees(asInt(e.target.value))} />
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        {/* Finance / Lease assumptions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {req?.payment_method === "lease" ? "Lease Terms" : "Finance Assumptions"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FieldGroup label={req?.payment_method === "lease" ? "Money factor" : "APR %"}>
                <Input
                  type="number"
                  step={req?.payment_method === "lease" ? "0.0001" : "0.01"}
                  placeholder={req?.payment_method === "lease" ? "e.g. 0.0020" : "e.g. 6.9"}
                  value={assumedApr}
                  onChange={(e) => setAssumedApr(parseFloat(e.target.value || "0"))}
                />
              </FieldGroup>
              <FieldGroup label={req?.payment_method === "lease" ? "Lease term (months)" : "Term (months)"}>
                <Input type="number" value={assumedTerm} onChange={(e) => setAssumedTerm(asInt(e.target.value))} />
              </FieldGroup>
              <FieldGroup label={req?.payment_method === "lease" ? "Due at signing ($)" : "Down payment ($)"}>
                <Input type="number" value={assumedDown} onChange={(e) => setAssumedDown(asInt(e.target.value))} />
              </FieldGroup>
            </div>
            {req?.payment_method === "lease" && (
              <p className="text-xs text-muted-foreground">
                Money factor × 2400 ≈ APR equivalent. Leave 0 if quoting a flat monthly payment.
                Buyer requested <strong>{req.miles_per_year ? `${req.miles_per_year.toLocaleString()} mi/yr` : "any mileage"}</strong> — make sure your offer matches.
              </p>
            )}
          </CardContent>
        </Card>

        {/* OTD Summary */}
        <Card className="bg-muted/50">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Computed totals</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {req?.payment_method === "lease" ? "Cap cost (OTD)" : "Out-the-door"}
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">${otdTotal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {req?.payment_method === "lease" ? "Net cap cost" : "Financed amount"}
                </div>
                <div className="text-2xl font-bold">${principal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Est. monthly</div>
                <div className="text-2xl font-bold">${monthlyPaymentEst.toLocaleString()}/mo</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {req?.payment_method === "lease"
                ? "Monthly is a simplified estimate. Verify with your leasing system for exact figures."
                : "Payment is a simple amortization estimate — excludes insurance and other costs."}
            </p>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={submitOffer} disabled={submitting}>
          {submitting
            ? (existingOfferId ? "Saving…" : "Submitting…")
            : (existingOfferId ? "Save Changes" : "Submit Offer")}
        </Button>
      </div>
    </main>
  );
}

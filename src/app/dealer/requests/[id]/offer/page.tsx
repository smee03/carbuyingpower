"use client";
/*
  Dealer Offer Page (MVP)

  Route:
    /dealer/requests/[id]/offer

  Goal:
    Let a dealer respond to a buyer request with an itemized OTD offer.

  Key ideas:
    - OTD is computed, not typed (prevents "trust me bro" totals)
    - Add-ons are itemized (forces transparency)
    - Validation is client-side for now (we can move server-side later)
*/

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/*
  BuyerRequest type mirrors buyer_requests table.
  We use it to display what the buyer wants + initialize finance assumptions.
*/
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
};

/*
  Add-ons are stored as JSONB in Postgres in dealer_offers.addons.
  Each row is { name, amount }.
*/
type Addon = { name: string; amount: number };

/*
  asInt()
  Converts input values to safe integers so we avoid NaN or weird parsing behavior
  from HTML input fields.
*/
function asInt(v: unknown) {
  const n = typeof v === "number" ? v : parseInt(String(v || "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

/*
  sumAddons()
  Sums the dealer add-ons into a single number for display + OTD calculation.
*/
function sumAddons(addons: Addon[]) {
  return addons.reduce(
    (acc, a) => acc + (Number.isFinite(a.amount) ? a.amount : 0),
    0
  );
}

/*
  calcOtdTotal()
  The real heart of the app: a consistent, comparable OTD formula.

  OTD = selling
        - discount
        - rebates
        + add-ons
        + doc fee
        + tax
        + title/reg
        + other fees
*/
function calcOtdTotal(args: {
  sellingPrice: number;
  dealerDiscount: number;
  rebates: number;
  addonsTotal: number;
  docFee: number;
  tax: number;
  titleReg: number;
  otherFees: number;
}) {
  const {
    sellingPrice,
    dealerDiscount,
    rebates,
    addonsTotal,
    docFee,
    tax,
    titleReg,
    otherFees,
  } = args;

  return (
    (sellingPrice || 0) -
    (dealerDiscount || 0) -
    (rebates || 0) +
    (addonsTotal || 0) +
    (docFee || 0) +
    (tax || 0) +
    (titleReg || 0) +
    (otherFees || 0)
  );
}

/*
  calcMonthlyPayment()
  Simple amortization formula for estimated monthly payment.
  This is NOT a finance contract: it’s a comparison tool.
*/
function calcMonthlyPayment(principal: number, aprPct: number, termMonths: number) {
  if (!principal || principal <= 0) return 0;
  if (!termMonths || termMonths <= 0) return 0;

  // If APR is 0, treat as a simple division
  if (!aprPct || aprPct <= 0) return Math.round(principal / termMonths);

  const r = aprPct / 100 / 12;
  const n = termMonths;
  const payment = (principal * r) / (1 - Math.pow(1 + r, -n));
  return Math.round(payment);
}

/*
  validateOffer()
  Client-side guardrails.

  This blocks submission if:
    - No VIN/Stock#/Trim provided
    - Selling price <= 0
    - Negative fees
    - Add-ons are malformed (blank row, name without amount, amount without name)
    - OTD calculation ends up <= 0
    - APR/term are out of sane bounds

  It also generates warnings (non-blocking), like "tax looks too low".
*/
function validateOffer(input: {
  vin: string;
  stockNumber: string;
  trim: string;

  sellingPrice: number;
  dealerDiscount: number;
  rebates: number;

  addons: Addon[];

  docFee: number;
  tax: number;
  titleReg: number;
  otherFees: number;

  assumedApr: number;
  assumedTerm: number;
  assumedDown: number;

  otdTotal: number;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    vin,
    stockNumber,
    trim,
    sellingPrice,
    dealerDiscount,
    rebates,
    addons,
    docFee,
    tax,
    titleReg,
    otherFees,
    assumedApr,
    assumedTerm,
    assumedDown,
    otdTotal,
  } = input;

  // Require at least one vehicle identifier (so buyers trust the quote is tied to something real)
  if (!vin.trim() && !stockNumber.trim() && !trim.trim()) {
    errors.push("Provide at least one identifier: VIN, Stock #, or Trim.");
  }

  // Selling price must be > 0 (otherwise the quote is meaningless)
  if (sellingPrice <= 0) errors.push("Selling price must be greater than 0.");

  // Ensure money fields aren't negative
  const moneyFields = [
    { name: "Dealer discount", v: dealerDiscount },
    { name: "Rebates", v: rebates },
    { name: "Doc fee", v: docFee },
    { name: "Tax", v: tax },
    { name: "Title/Reg", v: titleReg },
    { name: "Other fees", v: otherFees },
    { name: "Down payment", v: assumedDown },
  ];
  for (const f of moneyFields) {
    if (f.v < 0) errors.push(`${f.name} cannot be negative.`);
  }

  // Add-ons validation: force clean itemization
  for (const [i, a] of addons.entries()) {
    const name = (a.name || "").trim();
    const amt = asInt(a.amount);

    if (!name && amt > 0)
      errors.push(`Add-on #${i + 1} has an amount but no name.`);

    if (name && amt <= 0)
      errors.push(`Add-on "${name}" must have an amount > 0.`);

    if (!name && amt === 0)
      errors.push(`Remove blank add-on row #${i + 1} (name and amount are empty).`);
  }

  // OTD sanity check (since it's computed, this usually catches weird inputs)
  if (otdTotal <= 0) errors.push("OTD total must be greater than 0. Check your numbers.");

  // Finance assumptions sanity (still helpful for comparison)
  if (assumedApr < 0 || assumedApr > 25) errors.push("APR must be between 0% and 25%.");
  if (assumedTerm <= 0 || assumedTerm > 120) errors.push("Term months must be between 1 and 120.");

  // Warnings (do not block submit)
  if (tax <= 25) warnings.push("Tax looks very low. Confirm this is full sales tax, not a placeholder.");
  if (docFee > 800) warnings.push("Doc fee looks high. Buyers may expect justification or a breakdown.");
  if (titleReg > 1500) warnings.push("Title/registration looks high. Confirm DMV/registration estimate is correct.");

  return { errors, warnings };
}

export default function DealerOfferPage() {
  /*
    requestId is the buyer request UUID from the URL.
    Example: /dealer/requests/<uuid>/offer
  */
  const params = useParams<{ id: string }>();
  const requestId = useMemo(() => params.id, [params]);
  const router = useRouter();

  /*
    Page state:
      - loadingReq: while we fetch buyer request details
      - msg: generic message (usually supabase errors)
      - errors/warnings: validation output
  */
  const [loadingReq, setLoadingReq] = useState(true);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // buyer request record being responded to
  const [req, setReq] = useState<BuyerRequest | null>(null);

  /*
    Form input state:
    Vehicle identity fields
  */
  const [vin, setVin] = useState("");
  const [stockNumber, setStockNumber] = useState("");
  const [trim, setTrim] = useState("");

  /*
    MSRP is optional, so we use "" to avoid showing "0" on first render.
    - If empty: we store null in DB
    - If number typed: store the number
  */
  const [msrp, setMsrp] = useState<number | "">("");

  /*
    Core pricing fields (start at 0 for simplicity)
    Later you could make these "" too for cleaner UX.
  */
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [dealerDiscount, setDealerDiscount] = useState<number>(0);
  const [rebates, setRebates] = useState<number>(0);

  // Add-ons (itemized)
  const [addons, setAddons] = useState<Addon[]>([]);

  // Fees and taxes
  const [docFee, setDocFee] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [titleReg, setTitleReg] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);

  /*
    Finance assumptions:
    We initialize term + down payment from the buyer request after we load it.
  */
  const [assumedApr, setAssumedApr] = useState<number>(0);
  const [assumedTerm, setAssumedTerm] = useState<number>(60);
  const [assumedDown, setAssumedDown] = useState<number>(0);

  /*
    Load buyer request details from Supabase.
    This gives dealer context and sets default assumptions.
  */
  useEffect(() => {
    (async () => {
      setMsg("");
      setLoadingReq(true);

      // Require a signed-in user (dealer)
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMsg("Not signed in. Go to /auth");
        setLoadingReq(false);
        return;
      }

      // Fetch request record
      const { data, error } = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (error) {
        setMsg(error.message);
        setReq(null);
        setLoadingReq(false);
        return;
      }

      setReq(data as BuyerRequest);

      // Initialize finance assumptions based on buyer request preferences
      setAssumedTerm((data as any).term_months ?? 60);
      setAssumedDown((data as any).down_payment ?? 0);

      setLoadingReq(false);
    })();
  }, [requestId]);

  /*
    Derived values:
      - addonsTotal = sum of add-ons
      - otdTotal = computed OTD from all pricing fields
      - principal = otd minus down payment
      - monthlyPaymentEst = estimated monthly payment
  */
  const addonsTotal = useMemo(() => sumAddons(addons), [addons]);

  const otdTotal = useMemo(
    () =>
      calcOtdTotal({
        sellingPrice,
        dealerDiscount,
        rebates,
        addonsTotal,
        docFee,
        tax,
        titleReg,
        otherFees,
      }),
    [sellingPrice, dealerDiscount, rebates, addonsTotal, docFee, tax, titleReg, otherFees]
  );

  const principal = useMemo(
    () => Math.max(otdTotal - (assumedDown || 0), 0),
    [otdTotal, assumedDown]
  );

  const monthlyPaymentEst = useMemo(
    () => calcMonthlyPayment(principal, assumedApr || 0, assumedTerm || 60),
    [principal, assumedApr, assumedTerm]
  );

  /*
    Helper to update an add-on row
  */
  function updateAddon(idx: number, patch: Partial<Addon>) {
    setAddons((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  /*
    Helper to remove an add-on row
  */
  function removeAddon(idx: number) {
    setAddons((prev) => prev.filter((_, i) => i !== idx));
  }

  /*
    Submit offer:
      - validate inputs
      - insert into dealer_offers
      - redirect dealer back to open requests
  */
  async function submitOffer() {
    setMsg("");
    setErrors([]);
    setWarnings([]);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return setMsg("Not signed in. Go to /auth");
    if (!req) return setMsg("Request not loaded.");

    // Run guardrails
    const v = validateOffer({
      vin,
      stockNumber,
      trim,

      sellingPrice,
      dealerDiscount,
      rebates,

      addons,

      docFee,
      tax,
      titleReg,
      otherFees,

      assumedApr,
      assumedTerm,
      assumedDown,

      otdTotal,
    });

    setErrors(v.errors);
    setWarnings(v.warnings);

    // Block submission if there are errors
    if (v.errors.length > 0) return;

    // Insert offer into DB (MVP: direct from client)
    // Later: move to API route for server-side validation & anti-tamper.
    const { error } = await supabase.from("dealer_offers").insert({
      request_id: requestId,
      dealer_id: user.id,

      vin: vin.trim() || null,
      stock_number: stockNumber.trim() || null,
      trim: trim.trim() || null,

      msrp: msrp === "" ? null : msrp, // keep MSRP optional + not forced

      selling_price: sellingPrice,
      dealer_discount: dealerDiscount || 0,
      rebates: rebates || 0,

      addons, // jsonb

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
    });

    if (error) return setMsg(error.message);

    router.push("/dealer/requests");
  }

  /*
    UI layout:
      - top nav (title + back link)
      - validation errors/warnings
      - buyer request summary box
      - dealer offer form sections
      - computed totals box
      - submit button
  */
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Make Offer</h1>
        <Link className="underline" href="/dealer/requests">
          Back
        </Link>
      </div>

      {msg && <p className="text-sm">{msg}</p>}

      {errors.length > 0 && (
        <div className="border p-4">
          <div className="font-semibold">Fix these before submitting:</div>
          <ul className="list-disc ml-6 mt-2 text-sm">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="border p-4">
          <div className="font-semibold">Warnings (not blocking):</div>
          <ul className="list-disc ml-6 mt-2 text-sm">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {loadingReq && <p>Loading request…</p>}

      {req && (
        <div className="border p-4 space-y-2">
          <div className="font-medium">
            Buyer wants: {req.desired_models} {req.condition === 'new' && (req.year_min || req.year_max) ? `(${req.year_min && req.year_max ? `${req.year_min}–${req.year_max}` : `${req.year_min ?? req.year_max}`})` : `(${req.condition})`}
          </div>
          <div className="text-sm">
            ZIP {req.zip} • {req.radius_miles} mi • Credit: {req.credit_tier} • Term:{" "}
            {req.term_months} • Down: ${req.down_payment}
          </div>
          {req.notes && <div className="text-sm">Notes: {req.notes}</div>}
        </div>
      )}

      <div className="border p-4 space-y-4">
        <h2 className="font-semibold">Vehicle</h2>

        {/* Vehicle identity fields (at least one required) */}
        <div className="grid grid-cols-2 gap-3">
          <input
            className="border p-2"
            placeholder="VIN (optional)"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
          />
          <input
            className="border p-2"
            placeholder="Stock # (optional)"
            value={stockNumber}
            onChange={(e) => setStockNumber(e.target.value)}
          />
          <input
            className="border p-2"
            placeholder="Trim (optional)"
            value={trim}
            onChange={(e) => setTrim(e.target.value)}
          />

          {/* MSRP optional; leaving blank stores NULL */}
          <input
            className="border p-2"
            type="number"
            placeholder="MSRP (optional)"
            value={msrp}
            onChange={(e) => setMsrp(e.target.value === "" ? "" : asInt(e.target.value))}
          />
        </div>

        <h2 className="font-semibold">Price (before fees)</h2>

        {/* Pricing inputs that impact OTD calculation */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs">Selling price</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(asInt(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs">Dealer discount</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={dealerDiscount}
              onChange={(e) => setDealerDiscount(asInt(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs">Rebates</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={rebates}
              onChange={(e) => setRebates(asInt(e.target.value))}
            />
          </div>
        </div>

        <h2 className="font-semibold">Dealer add-ons (itemized)</h2>

        {/* Add-ons list - this is where dealers usually hide nonsense */}
        <div className="space-y-2">
          {addons.length === 0 && <p className="text-sm opacity-70">No add-ons added.</p>}

          {addons.map((a, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="border p-2 col-span-7"
                placeholder="Add-on name (e.g., Tint)"
                value={a.name}
                onChange={(e) => updateAddon(idx, { name: e.target.value })}
              />
              <input
                className="border p-2 col-span-4"
                type="number"
                placeholder="Amount"
                value={a.amount}
                onChange={(e) => updateAddon(idx, { amount: asInt(e.target.value) })}
              />
              <button className="border px-2 py-2 col-span-1" onClick={() => removeAddon(idx)}>
                ✕
              </button>
            </div>
          ))}

          <button
            className="border px-3 py-2"
            onClick={() => setAddons((p) => [...p, { name: "", amount: 0 }])}
          >
            + Add add-on
          </button>

          <div className="text-sm">
            Add-ons total: <span className="font-medium">${addonsTotal}</span>
          </div>
        </div>

        <h2 className="font-semibold">Fees / Tax</h2>

        {/* Fees that buyers often discover later unless itemized */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-xs">Doc fee</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={docFee}
              onChange={(e) => setDocFee(asInt(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs">Sales tax</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={tax}
              onChange={(e) => setTax(asInt(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs">Title/Reg</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={titleReg}
              onChange={(e) => setTitleReg(asInt(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs">Other fees</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={otherFees}
              onChange={(e) => setOtherFees(asInt(e.target.value))}
            />
          </div>
        </div>

        <h2 className="font-semibold">Finance assumptions</h2>

        {/* Used for monthly payment estimate (comparison only) */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs">APR %</label>
            <input
              className="border p-2 w-full"
              type="number"
              step="0.01"
              value={assumedApr}
              onChange={(e) => setAssumedApr(parseFloat(e.target.value || "0"))}
            />
          </div>
          <div>
            <label className="text-xs">Term months</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={assumedTerm}
              onChange={(e) => setAssumedTerm(asInt(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs">Down payment</label>
            <input
              className="border p-2 w-full"
              type="number"
              value={assumedDown}
              onChange={(e) => setAssumedDown(asInt(e.target.value))}
            />
          </div>
        </div>

        {/* Computed summary - this is the whole point */}
        <div className="border p-3 mt-3 space-y-1">
          <div className="text-sm">
            OTD total: <span className="font-semibold">${otdTotal}</span>
          </div>
          <div className="text-sm">
            Estimated principal (OTD - down):{" "}
            <span className="font-semibold">${principal}</span>
          </div>
          <div className="text-sm">
            Estimated monthly payment:{" "}
            <span className="font-semibold">${monthlyPaymentEst}</span>
          </div>
          <p className="text-xs opacity-70">
            Payment estimate is a simple loan calc; excludes insurance, etc.
          </p>
        </div>

        <button className="border px-4 py-2 w-full" onClick={submitOffer}>
          Submit offer
        </button>
      </div>
    </main>
  );
}
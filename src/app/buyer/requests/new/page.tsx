"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Condition = "new" | "used" | "either";
type CreditTier = "760+" | "720-759" | "680-719" | "620-679" | "<620";

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [zip, setZip] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [desiredModels, setDesiredModels] = useState("Sonata SEL, Civic Hybrid");
  const [condition, setCondition] = useState<Condition>("new");
  const [creditTier, setCreditTier] = useState<CreditTier>("760+");
  const [termMonths, setTermMonths] = useState(60);
  const [downPayment, setDownPayment] = useState(0);
  const [notes, setNotes] = useState("");

  async function submit() {
    setMsg("");
    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setMsg("Not signed in. Go to /auth");
      setSaving(false);
      return;
    }

    if (!zip.trim()) {
      setMsg("ZIP is required");
      setSaving(false);
      return;
    }

    if (!desiredModels.trim()) {
      setMsg("Desired models is required");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("buyer_requests")
      .insert({
        buyer_id: user.id,
        zip: zip.trim(),
        radius_miles: radiusMiles,
        desired_models: desiredModels.trim(),
        condition,
        credit_tier: creditTier,
        term_months: termMonths,
        down_payment: downPayment,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    router.push(`/buyer/requests/${data.id}`);
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">New Buyer Request</h1>

      {msg && <p className="text-sm">{msg}</p>}

      <div className="space-y-2">
        <label className="block text-sm font-medium">ZIP</label>
        <input
          className="border p-2 w-full"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="e.g. 91942"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Radius (miles)</label>
        <input
          className="border p-2 w-full"
          type="number"
          value={radiusMiles}
          onChange={(e) => setRadiusMiles(parseInt(e.target.value || "0", 10))}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Desired models</label>
        <input
          className="border p-2 w-full"
          value={desiredModels}
          onChange={(e) => setDesiredModels(e.target.value)}
          placeholder="Sonata SEL, Civic Hybrid, Accord EX..."
        />
        <p className="text-xs opacity-70">
          MVP: free text is fine. We’ll add structured make/model later.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">New / Used</label>
        <select
          className="border p-2 w-full"
          value={condition}
          onChange={(e) => setCondition(e.target.value as Condition)}
        >
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="either">Either</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Credit tier</label>
        <select
          className="border p-2 w-full"
          value={creditTier}
          onChange={(e) => setCreditTier(e.target.value as CreditTier)}
        >
          <option value="760+">760+</option>
          <option value="720-759">720–759</option>
          <option value="680-719">680–719</option>
          <option value="620-679">620–679</option>
          <option value="<620">&lt;620</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Term (months)</label>
          <input
            className="border p-2 w-full"
            type="number"
            value={termMonths}
            onChange={(e) => setTermMonths(parseInt(e.target.value || "0", 10))}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Down payment ($)</label>
          <input
            className="border p-2 w-full"
            type="number"
            value={downPayment}
            onChange={(e) => setDownPayment(parseInt(e.target.value || "0", 10))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Notes (optional)</label>
        <textarea
          className="border p-2 w-full"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Must have: blind spot monitor. Timeline: 30 days. No dealer add-ons."
        />
      </div>

      <button
        className="border px-4 py-2 w-full"
        disabled={saving}
        onClick={submit}
      >
        {saving ? "Saving…" : "Create request"}
      </button>
    </main>
  );
}
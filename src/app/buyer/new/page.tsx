"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MAKES_AND_MODELS: Record<string, string[]> = {
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "4Runner", "Prius"],
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V"],
  Ford: ["F-150", "Mustang", "Explorer", "Escape", "Edge", "Ranger"],
  Hyundai: ["Elantra", "Sonata", "Santa Fe", "Tucson", "Venue", "Ioniq"],
};

const SELECT_CLS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50";

function FieldGroup({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    condition_types: "used",
    min_price: 0,
    max_price: 50000,
    payment_method: "finance",
    year_min: 2015,
    year_max: 2027,
    zip: "",
    radius_miles: 50,
    max_miles: null as number | null,
    credit_tier: "good",
    term_months: 60,
    down_payment: 5000,
    delivery_preference: "both",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => {
      const numericFields = [
        "radius_miles", "term_months", "down_payment",
        "year_min", "year_max", "max_miles", "min_price", "max_price",
      ];
      const next = { ...prev } as typeof prev & Record<string, unknown>;
      if (numericFields.includes(name)) {
        next[name] = value === "" ? null : parseInt(value);
      } else {
        next[name] = value;
      }
      if (name === "make") next.model = "";
      return next as typeof prev;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setMsg("Not authenticated. Please sign in.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/buyer-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        setMsg(error.message || "Failed to create request");
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(`/buyer/requests/${data.id}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  const years = Array.from({ length: 2027 - 1982 + 1 }, (_, i) => 1982 + i);

  return (
    <main className="min-h-screen bg-muted/40 p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <Link
          href="/buyer/requests"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3")}
        >
          ← Back to Requests
        </Link>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">New vehicle request</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell dealers what you&apos;re looking for and they&apos;ll compete with their best OTD price.
          </p>
        </div>

        {msg && <p className="text-sm text-destructive">{msg}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Vehicle */}
          <Card>
            <CardHeader><CardTitle>Vehicle</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Make *">
                  <select name="make" value={formData.make} onChange={handleChange} required className={SELECT_CLS}>
                    <option value="">Select a make</option>
                    {Object.keys(MAKES_AND_MODELS).map((make) => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup label="Model *">
                  <select
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    required
                    disabled={!formData.make}
                    className={SELECT_CLS}
                  >
                    <option value="">Select a model</option>
                    {formData.make &&
                      MAKES_AND_MODELS[formData.make].map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                  </select>
                </FieldGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Condition">
                  <select name="condition_types" value={formData.condition_types} onChange={handleChange} className={SELECT_CLS}>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="certified">Certified Pre-Owned</option>
                    <option value="new,used">New &amp; Used</option>
                    <option value="new,certified">New &amp; Certified</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Max Mileage">
                  <Input
                    type="number"
                    name="max_miles"
                    min="0"
                    step="1000"
                    value={formData.max_miles ?? ""}
                    onChange={handleChange}
                    placeholder="Any"
                  />
                </FieldGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Year From">
                  <select name="year_min" value={formData.year_min} onChange={handleChange} className={SELECT_CLS}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label="Year To">
                  <select name="year_max" value={formData.year_max} onChange={handleChange} className={SELECT_CLS}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </FieldGroup>
              </div>
            </CardContent>
          </Card>

          {/* Budget & Location */}
          <Card>
            <CardHeader><CardTitle>Budget &amp; Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Min Price ($)">
                  <Input type="number" name="min_price" min="0" step="500" value={formData.min_price} onChange={handleChange} />
                </FieldGroup>
                <FieldGroup label="Max Price ($)">
                  <Input type="number" name="max_price" min="0" step="500" value={formData.max_price} onChange={handleChange} />
                </FieldGroup>
              </div>

              <FieldGroup label="ZIP Code *">
                <Input
                  type="text"
                  name="zip"
                  placeholder="e.g. 92101"
                  value={formData.zip}
                  onChange={handleChange}
                  required
                  maxLength={10}
                  className="max-w-40"
                />
              </FieldGroup>

              <FieldGroup label={`Search radius: ${formData.radius_miles} miles`}>
                <input
                  type="range"
                  name="radius_miles"
                  min="10"
                  max="500"
                  step="10"
                  value={formData.radius_miles}
                  onChange={handleChange}
                  className="w-full accent-primary h-2 rounded-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>10 mi</span>
                  <span>500 mi</span>
                </div>
              </FieldGroup>

              <FieldGroup label="Delivery preference">
                <select name="delivery_preference" value={formData.delivery_preference} onChange={handleChange} className={SELECT_CLS}>
                  <option value="pickup">Pickup only</option>
                  <option value="delivery">Delivery only</option>
                  <option value="both">Either</option>
                </select>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup label="Payment method">
                <select name="payment_method" value={formData.payment_method} onChange={handleChange} className={SELECT_CLS}>
                  <option value="finance">Finance</option>
                  <option value="cash">Cash</option>
                </select>
              </FieldGroup>

              {formData.payment_method !== "cash" && (
                <>
                  <FieldGroup label="Credit tier">
                    <select name="credit_tier" value={formData.credit_tier} onChange={handleChange} className={SELECT_CLS}>
                      <option value="excellent">Excellent (750+)</option>
                      <option value="good">Good (700–749)</option>
                      <option value="fair">Fair (650–699)</option>
                      <option value="poor">Poor (620–679)</option>
                    </select>
                  </FieldGroup>

                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="Loan term">
                      <select name="term_months" value={formData.term_months} onChange={handleChange} className={SELECT_CLS}>
                        <option value={36}>36 months</option>
                        <option value={48}>48 months</option>
                        <option value={60}>60 months</option>
                        <option value={72}>72 months</option>
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Down payment ($)">
                      <Input
                        type="number"
                        name="down_payment"
                        min="0"
                        step="500"
                        value={formData.down_payment}
                        onChange={handleChange}
                        required
                      />
                    </FieldGroup>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Posting…" : "Post Request"}
            </Button>
            <Link
              href="/buyer/requests"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1 text-center")}
            >
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </main>
  );
}

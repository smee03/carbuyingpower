"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Profile = {
  display_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  dealer_name: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  website: string | null;
  license_number: string | null;
};

function FieldGroup({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function DealerAccountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "success">("error");
  const [userId, setUserId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [website, setWebsite] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

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

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      const p = data as Profile;
      if (p.role !== "dealer") {
        setMsg("This page is only for dealer accounts.");
        setLoading(false);
        return;
      }

      setDisplayName(p.display_name ?? "");
      setEmail(p.email ?? user.email ?? "");
      setPhone(p.phone ?? "");
      setDealerName(p.dealer_name ?? "");
      setAddressStreet(p.address_street ?? "");
      setAddressCity(p.address_city ?? "");
      setAddressState(p.address_state ?? "");
      setAddressZip(p.address_zip ?? "");
      setWebsite(p.website ?? "");
      setLicenseNumber(p.license_number ?? "");

      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setMsg("");

    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
      dealer_name: dealerName.trim() || null,
      address_street: addressStreet.trim() || null,
      address_city: addressCity.trim() || null,
      address_state: addressState.trim() || null,
      address_zip: addressZip.trim() || null,
      website: website.trim() || null,
      license_number: licenseNumber.trim() || null,
    }).eq("id", userId);

    if (error) {
      setMsg(error.message);
      setMsgType("error");
    } else {
      setMsg("Profile saved.");
      setMsgType("success");
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-muted/40 p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Account</h1>
              <Badge variant="secondary">Dealer</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your contact info and dealership details.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dealer/requests"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Browse Requests
            </Link>
            <Link
              href="/dealer/offers"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              My Offers
            </Link>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {msg && (
          <p className={cn("text-sm", msgType === "success" ? "text-green-600" : "text-destructive")}>
            {msg}
          </p>
        )}

        {!loading && (
          <div className="space-y-5">

            {/* Contact info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Info</CardTitle>
                <CardDescription>
                  Your name and contact details shown to buyers after they accept your offer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldGroup label="Your name">
                  <Input
                    placeholder="e.g. John Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup label="Email address">
                  <Input
                    type="email"
                    placeholder="you@dealership.com"
                    value={email}
                    disabled
                    className="disabled:opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email is tied to your login and cannot be changed here.
                  </p>
                </FieldGroup>
                <FieldGroup label="Phone number">
                  <Input
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Dealership info */}
            <Card>
              <CardHeader>
                <CardTitle>Dealership</CardTitle>
                <CardDescription>
                  Buyers see this information when reviewing your offers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldGroup label="Dealership name">
                  <Input
                    placeholder="e.g. Downtown Honda"
                    value={dealerName}
                    onChange={(e) => setDealerName(e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup label="Street address">
                  <Input
                    placeholder="123 Auto Row Drive"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                  />
                </FieldGroup>
                <div className="grid grid-cols-3 gap-3">
                  <FieldGroup label="City" className="col-span-1">
                    <Input
                      placeholder="San Diego"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                    />
                  </FieldGroup>
                  <FieldGroup label="State" className="col-span-1">
                    <Input
                      placeholder="CA"
                      maxLength={2}
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                    />
                  </FieldGroup>
                  <FieldGroup label="ZIP" className="col-span-1">
                    <Input
                      placeholder="92101"
                      maxLength={10}
                      value={addressZip}
                      onChange={(e) => setAddressZip(e.target.value)}
                    />
                  </FieldGroup>
                </div>
                <FieldGroup label="Website" hint="Optional — include https://">
                  <Input
                    type="url"
                    placeholder="https://www.yourdealer.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup
                  label="Dealer license number"
                  hint="Your state-issued dealer license. Builds buyer trust."
                >
                  <Input
                    placeholder="e.g. D12345678"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Save */}
            <Button className="w-full" size="lg" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </Button>

          </div>
        )}
      </div>
    </main>
  );
}

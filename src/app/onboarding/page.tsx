"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MAKE_LIST, getModels } from "@/lib/vehicleData";

const SELECT_CLS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"buyer" | "dealer">("buyer");
  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [zip, setZip] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const totalSteps = role === "buyer" ? 2 : 1;

  async function saveProfile() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return false;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      role,
      display_name: name || null,
      email: user.email ?? null,
    });

    if (error) { setMsg(error.message); return false; }
    return true;
  }

  async function handleStep1() {
    setMsg("");
    setLoading(true);
    const ok = await saveProfile();
    setLoading(false);
    if (!ok) return;

    if (role === "buyer") {
      setStep(2);
    } else {
      router.push(`/onboarding/welcome?role=${role}&name=${encodeURIComponent(name)}`);
    }
  }

  function handleStep2(skip = false) {
    const params = new URLSearchParams({ role, name });
    if (!skip && make) params.set("make", make);
    if (!skip && model) params.set("model", model);
    if (!skip && zip) params.set("zip", zip);
    router.push(`/onboarding/welcome?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Name + role */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Welcome to CarPub Market</h1>
              <p className="text-sm text-muted-foreground">
                Let&apos;s get your account set up in two quick steps.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Your name</Label>
                <Input
                  id="display-name"
                  placeholder="e.g. Steve"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStep1()}
                />
              </div>

              <div className="space-y-2">
                <Label>I am a…</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["buyer", "dealer"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "rounded-xl border-2 px-4 py-4 text-left transition",
                        role === r
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <div className="font-semibold capitalize">{r}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r === "buyer" ? "Looking for a vehicle" : "Selling vehicles"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleStep1} disabled={loading}>
                {loading ? "Saving…" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 (buyer only): What are you looking for? */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">What are you looking for?</h1>
              <p className="text-sm text-muted-foreground">
                Give us a head start — you can fill in the details when you post your request.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Make</Label>
                <select
                  value={make}
                  onChange={(e) => { setMake(e.target.value); setModel(""); }}
                  className={SELECT_CLS}
                >
                  <option value="">Select a make</option>
                  {MAKE_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Model</Label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!make}
                  className={SELECT_CLS}
                >
                  <option value="">Select a model</option>
                  {make && getModels(make).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>ZIP Code</Label>
                <Input
                  type="text"
                  placeholder="e.g. 92101"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  maxLength={10}
                />
              </div>

              <Button className="w-full" size="lg" onClick={() => handleStep2(false)}>
                Continue
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition underline underline-offset-4"
                onClick={() => handleStep2(true)}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {msg && <p className="text-sm text-destructive">{msg}</p>}
      </div>
    </main>
  );
}

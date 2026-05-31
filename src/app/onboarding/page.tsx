"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function Onboarding() {
  const [role, setRole] = useState<"buyer" | "dealer">("buyer");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    setMsg("");
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setMsg("Not signed in. Go to /auth");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      role,
      display_name: name || null,
      email: user.email ?? null,
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    router.push(role === "buyer" ? "/buyer/requests" : "/dealer/requests");
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Set up your account</h1>
          <p className="text-sm text-muted-foreground">
            Tell us who you are so we can personalize your experience.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              placeholder="e.g. Steve"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <Button className="w-full" size="lg" onClick={save} disabled={loading}>
            {loading ? "Saving…" : "Continue"}
          </Button>
        </div>

        {msg && <p className="text-sm text-destructive">{msg}</p>}
      </div>
    </main>
  );
}

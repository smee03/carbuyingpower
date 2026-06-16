"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    setMsg("");
    if (!email || !pw) return setMsg("Enter email + password");

    // Sign-ups are closed during the preview period
    if (mode === "signup") {
      setMsg("New sign-ups are paused. Check back soon.");
      return;
    }

    setLoading(true);

    const res = await supabase.auth.signInWithPassword({ email, password: pw });

    if (res.error) {
      setMsg(res.error.message);
      setLoading(false);
      return;
    }

    const signedInUser = res.data.user;
    if (!signedInUser) {
      setMsg("Check your email for a confirmation link, then sign in.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signedInUser.id)
      .maybeSingle();

    if (profileError) {
      setMsg(profileError.message);
      setLoading(false);
      return;
    }

    if (profile?.role === "admin") { router.push("/admin"); return; }
    if (profile?.role === "dealer") { router.push("/dealer/account"); return; }
    if (profile?.role === "buyer") { router.push("/buyer/requests"); return; }

    router.push("/onboarding");
  }

  async function forgotPassword() {
    setMsg("");
    if (!email) return setMsg("Enter your email first");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/update-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return setMsg(error.message);
    setMsg("Password reset email sent. Check your inbox.");
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signup" ? "Create account" : "Sign in"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signup"
              ? "Start comparing dealer offers today."
              : "Welcome back to CarPub Market."}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <Button className="w-full" size="lg" onClick={submit} disabled={loading}>
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </div>

        {msg && (
          <p className={`text-sm ${msg.includes("sent") ? "text-green-600" : "text-destructive"}`}>
            {msg}
          </p>
        )}

        <div className="flex flex-col items-start gap-2 text-sm">
          <button
            className="text-muted-foreground hover:text-foreground transition underline underline-offset-4"
            onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(""); }}
          >
            {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>

          {mode === "signin" && (
            <button
              className="text-muted-foreground hover:text-foreground transition underline underline-offset-4"
              onClick={forgotPassword}
            >
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

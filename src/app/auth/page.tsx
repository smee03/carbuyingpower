"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function submit() {
    setMsg("");
    if (!email || !pw) return setMsg("Enter email + password");

    const res =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password: pw })
        : await supabase.auth.signInWithPassword({ email, password: pw });

    if (res.error) return setMsg(res.error.message);

    if (mode === "signin") {
      const signedInUser = res.data.user;
      if (!signedInUser) {
        return setMsg("Check your email for a confirmation link, then sign in.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", signedInUser.id)
        .maybeSingle();

      if (profileError) return setMsg(profileError.message);

      if (profile?.role === "dealer") {
        router.push("/dealer/account");
        return;
      }

      if (profile?.role === "buyer") {
        router.push("/buyer/requests");
        return;
      }
    }

    router.push("/onboarding");
  }

  async function forgotPassword() {
    setMsg("");
    if (!email) return setMsg("Enter your email first");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/update-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) return setMsg(error.message);
    setMsg("Password reset email sent. Check your inbox.");
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">
        {mode === "signup" ? "Create account" : "Sign in"}
      </h1>

      <input
        className="border p-2 w-full"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 w-full"
        placeholder="password"
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />

      <button className="border px-4 py-2 w-full" onClick={submit}>
        Continue
      </button>

      <div className="space-y-2">
        <button
          className="underline text-sm"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Sign In" : "Create Account"}
        </button>

        {mode === "signin" && (
          <button className="block underline text-sm" onClick={forgotPassword}>
            Forgot Password
          </button>
        )}
      </div>

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}

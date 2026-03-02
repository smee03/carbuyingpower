"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
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

    router.push("/onboarding");
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

      <button
        className="underline text-sm"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
      >
        Switch to {mode === "signup" ? "sign in" : "create account"}
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
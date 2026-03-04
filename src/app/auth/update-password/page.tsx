"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function updatePassword() {
    setMsg("");
    if (!password) return setMsg("Enter a new password");
    if (password.length < 6) return setMsg("Password must be at least 6 characters");
    if (password !== confirmPassword) return setMsg("Passwords do not match");

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) return setMsg(error.message);

    setMsg("Password updated. Redirecting to sign in...");
    setTimeout(() => router.push("/auth"), 1000);
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Set new password</h1>

      <input
        className="border p-2 w-full"
        placeholder="new password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        className="border p-2 w-full"
        placeholder="confirm new password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <button
        className="border px-4 py-2 w-full disabled:opacity-50"
        onClick={updatePassword}
        disabled={saving}
      >
        {saving ? "Saving..." : "Update password"}
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}

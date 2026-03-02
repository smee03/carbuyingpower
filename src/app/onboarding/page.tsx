"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const [role, setRole] = useState<"buyer" | "dealer">("buyer");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function save() {
    setMsg("");
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return setMsg("Not signed in. Go to /auth");

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      role,
      display_name: name || null,
    });

    if (error) return setMsg(error.message);

    router.push(role === "buyer" ? "/buyer/requests" : "/dealer/requests");
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Account setup</h1>

      <input
        className="border p-2 w-full"
        placeholder="display name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="space-x-4">
        <label>
          <input
            type="radio"
            checked={role === "buyer"}
            onChange={() => setRole("buyer")}
          />{" "}
          Buyer
        </label>

        <label>
          <input
            type="radio"
            checked={role === "dealer"}
            onChange={() => setRole("dealer")}
          />{" "}
          Dealer
        </label>
      </div>

      <button className="border px-4 py-2 w-full" onClick={save}>
        Continue
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
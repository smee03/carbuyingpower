"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BuyerRequest = {
  id: string;
  zip: string;
  radius_miles: number;
  desired_models: string;
  condition: "new" | "used" | "either";
  credit_tier: "760+" | "720-759" | "680-719" | "620-679" | "<620";
  term_months: number;
  down_payment: number;
  status: "open" | "paused" | "accepted" | "closed";
  created_at: string;
};

export default function BuyerRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState<BuyerRequest[]>([]);

  useEffect(() => {
    (async () => {
      setMsg("");
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setMsg("Not signed in. Go to /auth");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) setMsg(error.message);
      setItems((data || []) as BuyerRequest[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Buyer Requests</h1>
        <Link className="border px-4 py-2" href="/buyer/requests/new">
          New request
        </Link>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <p>Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm">
          No requests yet. Create one and dealers can start sending structured offers.
        </p>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <Link
            key={r.id}
            href={`/buyer/requests/${r.id}`}
            className="block border p-4 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {r.desired_models} ({r.condition})
              </div>
              <div className="text-sm">{r.status}</div>
            </div>

            <div className="text-sm mt-2">
              ZIP {r.zip} • {r.radius_miles} mi • Credit: {r.credit_tier} • Term:{" "}
              {r.term_months} • Down: ${r.down_payment}
            </div>

            <div className="text-xs mt-2 opacity-70">
              Created {new Date(r.created_at).toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
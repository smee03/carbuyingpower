"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DealerProfile = {
  role: "dealer" | "buyer";
};

export default function DealerAccountPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [profile, setProfile] = useState<DealerProfile | null>(null);

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

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      const loaded = data as DealerProfile;
      if (loaded.role !== "dealer") {
        setMsg("This page is only for dealer accounts.");
        setLoading(false);
        return;
      }

      setProfile(loaded);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dealer Home</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your workflow and track offer activity.
          </p>
        </div>

        {loading && <p className="text-sm">Loading...</p>}
        {msg && <p className="text-sm text-red-600">{msg}</p>}

        {!loading && profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold">My Offers</h2>
              <p className="text-sm text-gray-600">
                View statuses like submitted, accepted, and declined.
              </p>
              <Link
                href="/dealer/offers"
                className="inline-block bg-black text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                Open My Offers
              </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Browse Open Requests</h2>
              <p className="text-sm text-gray-600">
                Find active buyer requests and submit new offers.
              </p>
              <Link href="/dealer/requests" className="block text-sm underline text-gray-700">
                Open Requests
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

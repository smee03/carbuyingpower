"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DealerProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: "dealer" | "buyer";
};

export default function DealerAccountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [displayName, setDisplayName] = useState("");

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
        .select("id, display_name, email, role")
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
      setDisplayName(loaded.display_name ?? "");
      setLoading(false);
    })();
  }, []);

  async function saveProfile() {
    if (!profile) return;

    setSaving(true);
    setMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Account updated.");
    setProfile({ ...profile, display_name: displayName || null });
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dealer/requests" className="text-blue-600 hover:underline text-sm">
            ← Back to Dealer Requests
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Dealer Account</h1>

          {loading && <p className="text-sm">Loading...</p>}
          {msg && <p className="text-sm text-red-600">{msg}</p>}

          {!loading && profile && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  placeholder="Dealer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email ?? ""}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="bg-black text-white px-6 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

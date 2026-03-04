"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  display_name: string;
  role: string;
};

export default function UserAccount() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .single();

      if (profile) setProfile(profile);
    }

    load();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  if (!profile) return null;

  return (
    <div className="relative">
      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 font-medium hover:opacity-80"
      >
        {profile.display_name}
        <span className="text-xs text-gray-500">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-md p-3 space-y-2 text-sm">

          <div className="text-gray-500">
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Account
          </div>

          <button
            onClick={logout}
            className="w-full text-left text-red-600 hover:opacity-80"
          >
            Logout
          </button>

        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  display_name: string;
  role: string;
};

export default function UserAccount() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const fallbackName =
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "Account";
      const metadataRole =
        typeof user.user_metadata?.role === "string"
          ? user.user_metadata.role.toLowerCase()
          : "";
      const fallbackRole = metadataRole === "dealer" ? "dealer" : "buyer";

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setProfile({
          display_name: profile.display_name || fallbackName,
          role: (profile.role || fallbackRole).toLowerCase(),
        });
        return;
      }

      setProfile({
        display_name: String(fallbackName),
        role: fallbackRole,
      });
    }

    load();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  if (!profile) return null;

  const normalizedRole = profile.role?.trim().toLowerCase();
  const isDealerContext = pathname?.startsWith("/dealer");
  const showDealerAccount = normalizedRole === "dealer" || isDealerContext;

  return (
    <div className="relative">
      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 font-medium hover:opacity-80"
      >
        {profile.display_name}
        <span className="text-xs text-black">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-md p-3 space-y-2 text-sm">

          {showDealerAccount ? (
            <>
              <Link href="/dealer/account" className="block text-gray-700 hover:underline">
                Profile
              </Link>
              <Link href="/dealer/offers" className="block text-gray-700 hover:underline">
                My Offers
              </Link>
            </>
          ) : (
            <Link href="/buyer/requests" className="block text-gray-700 hover:underline">
              Buyer Dashboard
            </Link>
          )}

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

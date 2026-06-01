"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type Profile = {
  display_name: string;
  role: string;
};

export default function UserAccount() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadProfile(
      userId: string,
      email: string | undefined,
      meta: Record<string, unknown>
    ) {
      const fallbackName =
        (meta?.display_name as string) || email?.split("@")[0] || "Account";
      const fallbackRole =
        typeof meta?.role === "string" && meta.role.toLowerCase() === "dealer"
          ? "dealer"
          : "buyer";

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", userId)
        .maybeSingle();

      setProfile({
        display_name: profileData?.display_name || String(fallbackName),
        role: (profileData?.role || fallbackRole).toLowerCase(),
      });
      setNotLoggedIn(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setNotLoggedIn(false);
        loadProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata ?? {}
        );
      } else {
        setProfile(null);
        setNotLoggedIn(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  // still loading
  if (!profile && !notLoggedIn) return null;

  if (notLoggedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/auth"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Sign in
        </Link>
        <Link
          href="/auth"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Get started
        </Link>
      </div>
    );
  }

  const isDealer = profile!.role === "dealer";

  return (
    <div className="flex items-center gap-5">
      {isDealer ? (
        <>
          <Link
            href="/dealer/requests"
            className="font-handwriting text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse Requests
          </Link>
          <Link
            href="/dealer/offers"
            className="font-handwriting text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            My Offers
          </Link>
        </>
      ) : (
        <Link
          href="/buyer/requests"
          className="font-handwriting text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          My Requests
        </Link>
      )}

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-full border border-border bg-muted hover:bg-accent transition-colors pl-1 pr-2.5 py-1"
        >
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
            {profile!.display_name.slice(0, 1).toUpperCase()}
          </div>
          <span className="font-handwriting text-base font-semibold hidden sm:inline max-w-[120px] truncate">
            {profile!.display_name}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 z-50 w-48 bg-popover border border-border rounded-xl shadow-md p-3 space-y-1 text-sm">
              {isDealer ? (
                <>
                  <Link
                    href="/dealer/account"
                    onClick={() => setOpen(false)}
                    className="block px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/dealer/offers"
                    onClick={() => setOpen(false)}
                    className="block px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    My Offers
                  </Link>
                </>
              ) : (
                <Link
                  href="/buyer/requests"
                  onClick={() => setOpen(false)}
                  className="block px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  Dashboard
                </Link>
              )}
              <div className="border-t border-border pt-1 mt-1">
                <button
                  onClick={logout}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

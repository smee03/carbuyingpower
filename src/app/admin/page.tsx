"use client";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Stats = {
  users: number;
  buyers: number;
  dealers: number;
  requests: number;
  offers: number;
};

export default function AdminPage() {
  const { ready, token } = useAdminGuard();
  const [stats, setStats] = useState<Stats | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!ready || !token) return;

    async function loadStats() {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, requestsRes, offersRes] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/requests", { headers }),
        fetch("/api/admin/offers", { headers }),
      ]);
      const [u, r, o] = await Promise.all([
        usersRes.json(),
        requestsRes.json(),
        offersRes.json(),
      ]);
      const users: { role: string | null }[] = u.data ?? [];
      setStats({
        users: users.length,
        buyers: users.filter((x) => x.role === "buyer").length,
        dealers: users.filter((x) => x.role === "dealer").length,
        requests: (r.data ?? []).length,
        offers: (o.data ?? []).length,
      });
    }
    loadStats();
  }, [ready, token]);

  if (!ready) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground text-sm">CarBuyingPower internal dashboard</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Total users", value: stats.users },
            { label: "Buyers", value: stats.buyers },
            { label: "Dealers", value: stats.dealers },
            { label: "Buyer requests", value: stats.requests },
            { label: "Dealer offers", value: stats.offers },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="text-2xl font-bold tabular-nums">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:bg-muted/50 transition-colors space-y-1 block"
          >
            <div className="text-lg">{item.icon}</div>
            <div className="font-semibold text-sm">{item.title}</div>
            <div className="text-xs text-muted-foreground">{item.desc}</div>
          </Link>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <button
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

const NAV_ITEMS = [
  { icon: "👥", title: "Users", desc: "All accounts — change roles, delete users", href: "/admin/users" },
  { icon: "📋", title: "Buyer Requests", desc: "All requests across all buyers", href: "/admin/requests" },
  { icon: "💬", title: "Dealer Offers", desc: "All offers submitted by dealers", href: "/admin/offers" },
];

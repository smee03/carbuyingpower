"use client";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Offer = {
  id: string;
  otd_total: number;
  status: string;
  created_at: string;
  profiles: { display_name: string | null; email: string | null } | null;
  buyer_requests: { make: string; model: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  declined: "bg-muted text-muted-foreground",
};

export default function AdminOffersPage() {
  const { ready, token } = useAdminGuard();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !token) return;
    fetch("/api/admin/offers", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => { setOffers(j.data ?? []); setLoading(false); });
  }, [ready, token]);

  if (!ready || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-16 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Dealer Offers</h1>
          <p className="text-sm text-muted-foreground">{offers.length} total</p>
        </div>
        <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          ← Admin
        </Link>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dealer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehicle</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">OTD Total</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {offers.map((o) => (
              <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{o.profiles?.display_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{o.profiles?.email ?? "—"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {o.buyer_requests ? `${o.buyer_requests.make} ${o.buyer_requests.model}` : "—"}
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">
                  ${o.otd_total.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[o.status] ?? STATUS_COLORS.declined)}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No offers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

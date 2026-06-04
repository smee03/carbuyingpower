"use client";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Request = {
  id: string;
  make: string;
  model: string;
  year_min: number;
  year_max: number;
  max_price: number | null;
  status: string;
  zip: string;
  created_at: string;
  profiles: { display_name: string | null; email: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function AdminRequestsPage() {
  const { ready, token } = useAdminGuard();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !token) return;
    fetch("/api/admin/requests", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => { setRequests(j.data ?? []); setLoading(false); });
  }, [ready, token]);

  if (!ready || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Buyer Requests</h1>
          <p className="text-sm text-muted-foreground">{requests.length} total</p>
        </div>
        <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          ← Admin
        </Link>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Buyer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehicle</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Budget</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">ZIP</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.profiles?.display_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.profiles?.email ?? "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.make} {r.model}</div>
                  <div className="text-xs text-muted-foreground">{r.year_min}–{r.year_max}</div>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {r.max_price ? `$${r.max_price.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.zip}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[r.status] ?? STATUS_COLORS.closed)}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No requests found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

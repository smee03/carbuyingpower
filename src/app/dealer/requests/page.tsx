"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";

type BuyerRequest = {
  id: string;
  zip: string;
  radius_miles: number;
  make?: string | null;
  model?: string | null;
  desired_models?: string;
  condition: "new" | "used" | "either";
  year_min?: number | null;
  year_max?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  max_miles?: number | null;
  payment_method?: string | null;
  credit_tier: "760+" | "720-759" | "680-719" | "620-679" | "<620";
  term_months: number;
  down_payment: number;
  notes: string | null;
  status: "open" | "paused" | "accepted" | "closed";
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function priceRange(min?: number | null, max?: number | null) {
  if (min == null && max == null) return "Any budget";
  if (min != null && max != null)
    return `$${min.toLocaleString()}–$${max.toLocaleString()}`;
  if (max != null) return `Up to $${max.toLocaleString()}`;
  return `From $${min!.toLocaleString()}`;
}

const CONDITION_BADGE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  used: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  either:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export default function DealerRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState<BuyerRequest[]>([]);
  const [submittedRequestIds, setSubmittedRequestIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    (async () => {
      setMsg("");
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMsg("Not signed in. Go to /auth");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) setMsg(error.message);
      setItems((data || []) as BuyerRequest[]);

      const { data: myOffers, error: myOffersError } = await supabase
        .from("dealer_offers")
        .select("request_id, status")
        .eq("dealer_id", auth.user.id)
        .in("status", ["submitted", "accepted"]);

      if (myOffersError) {
        setMsg(myOffersError.message);
      } else {
        setSubmittedRequestIds(
          new Set((myOffers || []).map((o) => o.request_id))
        );
      }

      setLoading(false);
    })();
  }, []);

  const submitted = items.filter((r) => submittedRequestIds.has(r.id));
  const pending = items.filter((r) => !submittedRequestIds.has(r.id));

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Page header */}
      <div className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Open Buyer Requests
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Buyers in your area looking for vehicles — submit an offer to
                compete.
              </p>
            </div>
            {!loading && items.length > 0 && (
              <div className="flex items-center gap-2 text-sm flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 font-medium text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {items.length} open
                </span>
                {submitted.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-medium text-xs text-muted-foreground">
                    {submitted.length} offered
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {msg && <p className="text-sm text-destructive">{msg}</p>}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <p className="text-lg font-semibold">No open requests right now</p>
              <p className="text-sm text-muted-foreground">
                Check back soon — new buyer requests are posted regularly.
              </p>
            </CardContent>
          </Card>
        )}

        {/* My submitted offers */}
        {!loading && submitted.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              My Submitted Offers
            </h2>
            {submitted.map((r) => (
              <RequestCard key={r.id} r={r} hasOffer />
            ))}
          </section>
        )}

        {/* Available requests */}
        {!loading && pending.length > 0 && (
          <section className="space-y-3">
            {submitted.length > 0 && (
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                New Opportunities
              </h2>
            )}
            {pending.map((r) => (
              <RequestCard key={r.id} r={r} hasOffer={false} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function RequestCard({ r, hasOffer }: { r: BuyerRequest; hasOffer: boolean }) {
  const vehicle = r.make
    ? `${r.make}${r.model ? " " + r.model : ""}`
    : (r.desired_models ?? "Any vehicle");

  const yearRange =
    r.year_min || r.year_max
      ? r.year_min && r.year_max
        ? `${r.year_min}–${r.year_max}`
        : String(r.year_min ?? r.year_max)
      : null;

  const chips = [
    { label: "Credit", value: r.credit_tier },
    { label: "Payment", value: r.payment_method ?? "Finance" },
    { label: "Term", value: `${r.term_months} mo` },
    {
      label: "Down",
      value:
        r.down_payment > 0 ? `$${r.down_payment.toLocaleString()}` : "$0",
    },
    ...(r.max_miles != null
      ? [{ label: "Max miles", value: r.max_miles.toLocaleString() }]
      : []),
  ];

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        hasOffer && "border-green-200 dark:border-green-900/50"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: vehicle info */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-base leading-tight">{vehicle}</h3>
              {yearRange && (
                <span className="text-sm text-muted-foreground font-medium">
                  {yearRange}
                </span>
              )}
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                  CONDITION_BADGE[r.condition] ?? CONDITION_BADGE.either
                )}
              >
                {r.condition}
              </span>
            </div>

            {/* Location + budget */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 flex-shrink-0" />
                ZIP {r.zip} · {r.radius_miles} mi radius
              </span>
              <span className="font-medium text-foreground">
                {priceRange(r.min_price, r.max_price)}
              </span>
            </div>

            {/* Detail chips */}
            <div className="flex flex-wrap gap-1.5">
              {chips.map((d) => (
                <span
                  key={d.label}
                  className="inline-flex items-center gap-1 text-xs rounded-md bg-muted px-2 py-1 text-muted-foreground"
                >
                  <span className="font-medium text-foreground/70">
                    {d.label}:
                  </span>
                  {d.value}
                </span>
              ))}
            </div>

            {r.notes && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                &ldquo;{r.notes}&rdquo;
              </p>
            )}
          </div>

          {/* Right: action + timestamp */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            {hasOffer ? (
              <Link
                href={`/dealer/requests/${r.id}/offer`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 gap-1.5"
                )}
              >
                <CheckCircle2 className="size-3.5" />
                Offer submitted
              </Link>
            ) : (
              <Link
                href={`/dealer/requests/${r.id}/offer`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Make an offer →
              </Link>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {timeAgo(r.created_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MapPin, Clock, TrendingUp, CheckCircle2, FileText } from "lucide-react";

type DealerOffer = {
  id: string;
  request_id: string;
  selling_price: number;
  otd_total: number;
  monthly_payment_est: number | null;
  status: "submitted" | "withdrawn" | "accepted" | "expired" | "declined";
  created_at: string;
};

type BuyerRequestSummary = {
  id: string;
  make?: string | null;
  model?: string | null;
  desired_models?: string | null;
  year_min?: number | null;
  year_max?: number | null;
  zip: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function money(n: number) {
  return `$${n.toLocaleString()}`;
}

const STATUS_META: Record<DealerOffer["status"], { label: string; className: string }> = {
  submitted: {
    label: "Pending",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  accepted: {
    label: "Accepted ✓",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  declined: {
    label: "Declined",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  expired: {
    label: "Declined",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-muted text-muted-foreground",
  },
};

// Torn left edge of the overlay strip (clip-path percentages relative to the 62px strip width)
const TORN_CLIP = `polygon(
  0% 0%,
  83% 0%, 91% 2%, 78% 4%, 94% 6%, 82% 8%, 89% 10%, 76% 12%, 93% 14%, 81% 16%,
  88% 18%, 75% 20%, 92% 22%, 83% 24%, 90% 26%, 77% 28%, 93% 30%, 80% 32%,
  87% 34%, 75% 36%, 91% 38%, 83% 40%, 89% 42%, 77% 44%, 94% 46%, 82% 48%,
  88% 50%, 76% 52%, 92% 54%, 80% 56%, 87% 58%, 75% 60%, 91% 62%, 83% 64%,
  89% 66%, 77% 68%, 93% 70%, 81% 72%, 88% 74%, 76% 76%, 94% 78%, 80% 80%,
  87% 82%, 75% 84%, 91% 86%, 82% 88%, 89% 90%, 77% 92%, 93% 94%, 80% 96%,
  87% 98%, 83% 100%,
  0% 100%
)`;

// y positions (px) for the ring holes — render plenty, overflow:hidden clips the rest
const HOLE_YS = [28, 78, 128, 178, 228, 278, 328, 378];

type FilterTab = "all" | "submitted" | "accepted" | "declined";

export default function DealerOffersPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [offers, setOffers] = useState<DealerOffer[]>([]);
  const [requestsById, setRequestsById] = useState<Record<string, BuyerRequestSummary>>({});
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

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

      const { data: myOffers, error: offersError } = await supabase
        .from("dealer_offers")
        .select("id, request_id, selling_price, otd_total, monthly_payment_est, status, created_at")
        .eq("dealer_id", user.id)
        .order("created_at", { ascending: false });

      if (offersError) {
        setMsg(offersError.message);
        setLoading(false);
        return;
      }

      const loadedOffers = (myOffers || []) as DealerOffer[];
      setOffers(loadedOffers);

      const requestIds = Array.from(
        new Set(loadedOffers.map((o) => o.request_id).filter(Boolean))
      );
      if (requestIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: reqData, error: reqError } = await supabase
        .from("buyer_requests")
        .select("id, make, model, desired_models, year_min, year_max, zip")
        .in("id", requestIds);

      if (reqError) {
        setMsg(reqError.message);
        setLoading(false);
        return;
      }

      const map: Record<string, BuyerRequestSummary> = {};
      for (const r of (reqData || []) as BuyerRequestSummary[]) {
        map[r.id] = r;
      }
      setRequestsById(map);
      setLoading(false);
    })();
  }, []);

  const accepted = offers.filter((o) => o.status === "accepted");
  const pending = offers.filter((o) => o.status === "submitted");
  const declined = offers.filter((o) => o.status === "declined" || o.status === "expired");

  const filtered =
    activeTab === "all"
      ? offers
      : activeTab === "submitted"
      ? pending
      : activeTab === "accepted"
      ? accepted
      : [...declined, ...offers.filter((o) => o.status === "withdrawn")];

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: offers.length },
    { key: "submitted", label: "Pending", count: pending.length },
    { key: "accepted", label: "Accepted", count: accepted.length },
    { key: "declined", label: "Declined", count: declined.length },
  ];

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Page header */}
      <div className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          <div>
            <h1 className="font-handwriting text-3xl font-bold tracking-tight">My Offers</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Every offer you&apos;ve written up, and where it stands.
            </p>
          </div>

          {/* Stats */}
          {!loading && offers.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/60 px-4 py-3 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="size-3.5" />
                  Total submitted
                </div>
                <div className="font-handwriting text-2xl font-bold">{offers.length}</div>
              </div>
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 px-4 py-3 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
                  <CheckCircle2 className="size-3.5" />
                  Accepted
                </div>
                <div className="font-handwriting text-2xl font-bold text-green-700 dark:text-green-400">
                  {accepted.length}
                </div>
              </div>
              <div className="rounded-xl bg-muted/60 px-4 py-3 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5" />
                  Win rate
                </div>
                <div className="font-handwriting text-2xl font-bold">
                  {offers.length > 0
                    ? `${Math.round((accepted.length / offers.length) * 100)}%`
                    : "—"}
                </div>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          {!loading && offers.length > 0 && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    activeTab === tab.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 text-xs rounded-full px-1.5 py-0.5",
                        activeTab === tab.key
                          ? "bg-primary/10 text-primary"
                          : "bg-muted-foreground/10"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-5">
        {msg && <p className="text-sm text-destructive">{msg}</p>}

        {loading && (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-r-md bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && offers.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-2xl">
                📋
              </div>
              <p className="font-handwriting text-xl font-semibold">No offers yet</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Browse open buyer requests and write up your first offer.
              </p>
              <Link href="/dealer/requests" className={cn(buttonVariants(), "mt-2")}>
                Browse open requests
              </Link>
            </CardContent>
          </Card>
        )}

        {!loading && filtered.length === 0 && offers.length > 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No offers in this category.</p>
            </CardContent>
          </Card>
        )}

        {filtered.map((offer) => {
          const req = requestsById[offer.request_id];
          const title = req
            ? `${req.make || req.desired_models || "Vehicle"}${req.model ? ` ${req.model}` : ""}`
            : "Vehicle";
          const yearRange =
            req?.year_min || req?.year_max
              ? req.year_min && req.year_max
                ? `${req.year_min}–${req.year_max}`
                : String(req.year_min ?? req.year_max)
              : null;

          const statusMeta = STATUS_META[offer.status] ?? STATUS_META.submitted;
          const isAccepted = offer.status === "accepted";

          return (
            <div
              key={offer.id}
              className="paper-card relative overflow-hidden rounded-r-md shadow-[0_2px_8px_rgba(0,0,0,0.10),0_6px_24px_rgba(0,0,0,0.07)]"
            >
              {/* ── Torn left edge overlay ── */}
              {/* Matches the page bg color to mask the straight card edge */}
              <div
                className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
                style={{
                  width: "62px",
                  backgroundColor: "var(--page-surface)",
                  clipPath: TORN_CLIP,
                }}
              />

              {/* ── Ring holes ── */}
              {HOLE_YS.map((y) => (
                <div
                  key={y}
                  className="absolute z-20 w-[18px] h-[18px] rounded-full border border-[#a89050] dark:border-[#5a4828] pointer-events-none"
                  style={{
                    top: y,
                    left: 64,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "var(--page-surface)",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.18)",
                  }}
                />
              ))}

              {/* ── Card content ── */}
              <div className="relative pl-[92px] pr-6 pt-5 pb-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-handwriting text-2xl font-bold leading-tight text-[#1a1510] dark:text-[#e8dfc8]">
                        {title}
                      </h3>
                      {yearRange && (
                        <span className="font-handwriting text-base text-[#6b5e40] dark:text-[#9a8a68]">
                          {yearRange}
                        </span>
                      )}
                    </div>
                    {req?.zip && (
                      <div className="flex items-center gap-1 font-handwriting text-sm text-[#6b5e40] dark:text-[#9a8a68]">
                        <MapPin className="size-3" />
                        ZIP {req.zip}
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0",
                      statusMeta.className
                    )}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                {/* Paper fields */}
                <div className="space-y-1">
                  <PaperField label="Out-the-door total" value={money(offer.otd_total)} highlight />
                  <PaperField label="Selling price" value={money(offer.selling_price)} />
                  <PaperField
                    label="Monthly est."
                    value={offer.monthly_payment_est != null ? `${money(offer.monthly_payment_est)}/mo` : "—"}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="flex items-center gap-1 font-handwriting text-sm text-[#6b5e40] dark:text-[#9a8a68]">
                    <Clock className="size-3.5" />
                    Submitted {timeAgo(offer.created_at)}
                  </span>
                  <Link
                    href={
                      isAccepted
                        ? `/dealer/requests/${offer.request_id}/accepted?offerId=${offer.id}`
                        : `/dealer/requests/${offer.request_id}/offer`
                    }
                    className={cn(
                      buttonVariants({ variant: isAccepted ? "default" : "outline", size: "sm" })
                    )}
                  >
                    {isAccepted ? "View deal →" : "View / edit →"}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaperField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-1 border-b border-[#c8b880] dark:border-[#4a3d20]">
      <span className="font-handwriting text-sm text-[#6b5e40] dark:text-[#9a8a68]">{label}</span>
      <span
        className={cn(
          "font-handwriting text-xl font-bold tabular-nums",
          highlight ? "text-green-700 dark:text-green-400" : "text-[#1a1510] dark:text-[#e8dfc8]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

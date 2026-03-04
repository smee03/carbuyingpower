"use client";

import UserAccount from "@/components/UserAccount";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BuyerRequest = {
  id: string;
  make: string;
  model: string;
  condition_types: string;
  min_price?: number | null;
  max_price?: number | null;
  payment_method?: string | null;
  year_min: number;
  year_max: number;
  zip: string;
  radius_miles: number;
  max_miles?: number | null;
  credit_tier: string;
  term_months: number;
  down_payment: number;
  delivery_preference: string;
  status: string;
  created_at: string;
};

export default function BuyerRequestsPage() {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMsg("");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMsg("Not signed in. Go to /auth");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("buyer_requests")
        .select("*")
        .eq("buyer_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setMsg(error.message);
      } else {
        setRequests(data || []);
      }

      setLoading(false);
    }

    load();
  }, []);

  // 📊 Dashboard stats
  const openCount = requests.filter((r) => r.status === "open").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted").length;
  const offerCount = 0; // wire later

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">

{/* Header */}
<div className="flex items-start justify-between">

  {/* Left side */}
  <div>
    <h1 className="text-3xl font-bold tracking-tight">
      Buyer Dashboard
    </h1>

    <p className="text-sm text-gray-500 mt-1">
      Manage your vehicle requests and compare dealer offers.
    </p>

    <Link
      href="/buyer/new"
      className="inline-block mt-4 bg-black text-white px-5 py-2 rounded-xl hover:opacity-90 transition"
    >
      + New Request
    </Link>
  </div>

</div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6">
          <StatCard title="Open Requests" value={openCount} />
          <StatCard title="Offers Received" value={offerCount} />
          <StatCard title="Accepted Deals" value={acceptedCount} />
        </div>

        {/* Content */}
        {loading && <p>Loading…</p>}
        {msg && <p className="text-sm text-red-600">{msg}</p>}

        {!loading && requests.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            No requests yet. Create your first one.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} />
          ))}
        </div>

      </div>
    </main>
  );
}

/* ---------------------- COMPONENTS ---------------------- */

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-semibold mt-2">{value}</div>
    </div>
  );
}

function RequestCard({ request }: { request: BuyerRequest }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4 hover:shadow-md transition">
      
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {request.make} {request.model} {request.year_min && request.year_max ? `(${request.year_min}–${request.year_max})` : ''}
        </h2>
        <StatusBadge status={request.status} />
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div>
          ZIP {request.zip} • {request.radius_miles} mi
        </div>
        <div>
          Price: {request.min_price != null || request.max_price != null ? ` $${request.min_price ?? '0'} - $${request.max_price ?? '0'}` : 'Any'}
        </div>
        <div>
          Mileage: {request.max_miles != null ? `${request.max_miles.toLocaleString()} mi` : 'Any'} • Delivery: {request.delivery_preference}
        </div>
        <div>
          Payment: {request.payment_method === "cash" ? "Cash" : "Finance"}
        </div>
        {request.payment_method !== "cash" && (
          <>
            <div>
              Credit: {request.credit_tier} • Term: {request.term_months} mo
            </div>
            <div>
              Down: ${request.down_payment}
            </div>
          </>
        )}
      </div>

      <div className="pt-2">
        <Link
          href={`/buyer/requests/${request.id}`}
          className="inline-block bg-black text-white px-4 py-2 rounded-xl hover:opacity-90 transition"
        >
          View Offers
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "open"
      ? "bg-green-100 text-green-700"
      : status === "accepted"
      ? "bg-blue-100 text-blue-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
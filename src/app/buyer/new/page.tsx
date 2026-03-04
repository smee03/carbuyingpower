"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const MAKES_AND_MODELS = {
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "4Runner", "Prius"],
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V"],
  Ford: ["F-150", "Mustang", "Explorer", "Escape", "Edge", "Ranger"],
  Hyundai: ["Elantra", "Sonata", "Santa Fe", "Tucson", "Venue", "Ioniq"],
};

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    condition_types: "used",
    min_price: 0,
    max_price: 50000,
    payment_method: "finance",
    year_min: 2015,
    year_max: 2027,
    zip: "",
    radius_miles: 50,
    max_miles: null,
    credit_tier: "good",
    term_months: 60,
    down_payment: 5000,
    delivery_preference: "both",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const numericFields = [
        "radius_miles",
        "term_months",
        "down_payment",
        "year_min",
        "year_max",
        "max_miles",
        "min_price",
        "max_price",
      ];
      const newData: any = { ...prev };
      if (numericFields.includes(name)) {
        newData[name] = value === "" ? null : parseInt(value);
      } else {
        newData[name] = value;
      }
      // Reset model when make changes
      if (name === "make") {
        newData.model = "";
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      // Get the user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setMsg("Not authenticated. Please sign in.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/buyer-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        setMsg(error.message || "Failed to create request");
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(`/buyer/requests/${data.id}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/buyer/requests" className="text-blue-600 hover:underline text-sm">
            ← Back to Requests
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Request</h1>
          <p className="text-sm text-gray-500 mb-8">
            Tell us what vehicle you're looking for and we'll find matching dealer offers.
          </p>

          {msg && <p className="text-sm text-red-600 mb-4">{msg}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Make */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Make *
              </label>
              <select
                name="make"
                value={formData.make}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              >
                <option value="">Select a make</option>
                {Object.keys(MAKES_AND_MODELS).map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model *
              </label>
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                disabled={!formData.make}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a model</option>
                {formData.make &&
                  MAKES_AND_MODELS[formData.make as keyof typeof MAKES_AND_MODELS].map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition *
              </label>
              <select
                name="condition_types"
                value={formData.condition_types}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="certified">Certified Pre-Owned</option>
                <option value="new,used">New & Used</option>
                <option value="new,certified">New & Certified</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Price ($)</label>
                <input
                  type="number"
                  name="min_price"
                  min="0"
                  step="500"
                  value={formData.min_price}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price ($)</label>
                <input
                  type="number"
                  name="max_price"
                  min="0"
                  step="500"
                  value={formData.max_price}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Year Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Year *
                </label>
                <select
                  name="year_min"
                  value={formData.year_min}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                >
                  {Array.from({ length: 2027 - 1982 + 1 }, (_, i) => 1982 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Year *
                </label>
                <select
                  name="year_max"
                  value={formData.year_max}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                >
                  {Array.from({ length: 2027 - 1982 + 1 }, (_, i) => 1982 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Max Miles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Mileage *
              </label>
              <input
                type="number"
                name="max_miles"
                min="0"
                step="1000"
                value={formData.max_miles ?? ""}
                onChange={handleChange}
                placeholder="Any"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              />
            </div>

            {/* Delivery Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Preference *
              </label>
              <select
                name="delivery_preference"
                value={formData.delivery_preference}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              >
                <option value="pickup">Pickup Only</option>
                <option value="delivery">Delivery Only</option>
                <option value="both">Either</option>
              </select>
            </div>

            {/* ZIP Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code *
              </label>
              <input
                type="text"
                name="zip"
                placeholder="12345"
                value={formData.zip}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              />
            </div>

            {/* Search Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Radius (miles): {formData.radius_miles}
              </label>
              <input
                type="range"
                name="radius_miles"
                min="10"
                max="500"
                step="10"
                value={formData.radius_miles}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              >
                <option value="finance">Finance</option>
                <option value="cash">Pay with Cash</option>
              </select>
            </div>

            {/* Financing fields shown only when financing */}
            {formData.payment_method !== "cash" && (
              <>
                {/* Credit Tier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Credit Tier *</label>
                  <select
                    name="credit_tier"
                    value={formData.credit_tier}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  >
                    <option value="excellent">Excellent (750+)</option>
                    <option value="good">Good (700-749)</option>
                    <option value="fair">Fair (650-699)</option>
                    <option value="poor">Poor (&lt;650)</option>
                  </select>
                </div>

                {/* Term Months */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Term (months) *</label>
                  <select
                    name="term_months"
                    value={formData.term_months}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  >
                    <option value={36}>36 months</option>
                    <option value={48}>48 months</option>
                    <option value={60}>60 months</option>
                    <option value={72}>72 months</option>
                  </select>
                </div>

                {/* Down Payment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment ($) *</label>
                  <input
                    type="number"
                    name="down_payment"
                    min="0"
                    step="500"
                    value={formData.down_payment}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black text-white px-6 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Request"}
              </button>
              <Link
                href="/buyer/requests"
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-xl hover:bg-gray-300 transition text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

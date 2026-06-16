"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function WelcomeContent() {
  const params = useSearchParams();
  const name = params.get("name") || "";
  const role = params.get("role") || "buyer";
  const make = params.get("make") || "";
  const model = params.get("model") || "";
  const zip = params.get("zip") || "";

  const newRequestParams = new URLSearchParams();
  if (make) newRequestParams.set("make", make);
  if (model) newRequestParams.set("model", model);
  if (zip) newRequestParams.set("zip", zip);
  const newRequestHref = `/buyer/new${newRequestParams.size > 0 ? `?${newRequestParams.toString()}` : ""}`;

  return (
    <div className="w-full max-w-sm space-y-8 text-center">

      <div className="flex justify-center">
        <CheckCircle2 className="size-16 text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="font-handwriting text-4xl font-bold tracking-tight">
          You&apos;re all set{name ? `, ${name}` : ""}!
        </h1>
        <p className="text-muted-foreground">
          {role === "buyer"
            ? "CarPub Market is ready to put dealers to work for you."
            : "Your dealer account is ready. Start reviewing buyer requests near you."}
        </p>
      </div>

      {role === "buyer" && (
        <div className="rounded-xl border border-border bg-muted/40 p-5 text-left space-y-3">
          <p className="text-sm font-semibold">Here&apos;s how it works</p>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="font-bold text-foreground">1.</span>
              <span>Post a request for the car you want — make, model, budget, and location.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-foreground">2.</span>
              <span>Local dealers compete and send you real, transparent out-the-door prices.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-foreground">3.</span>
              <span>Compare offers and accept the best deal. No haggling, no brokers.</span>
            </li>
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {role === "buyer" ? (
          <>
            <Link href={newRequestHref} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
              Post my first request
            </Link>
            <Link
              href="/buyer/requests"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
            >
              Go to dashboard
            </Link>
          </>
        ) : (
          <Link href="/dealer/requests" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            View buyer requests
          </Link>
        )}
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <WelcomeContent />
      </Suspense>
    </main>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div>

      {/* ── Hero ── */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-28 text-center space-y-7">
          <div className="inline-block rounded-full border border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground">
            Free for buyers · Transparent OTD pricing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Make dealers compete<br className="hidden md:block" /> for your business
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Post what you&apos;re looking for. Local dealers respond with their best
            out-the-door price. You compare and choose — no haggling required.
          </p>
          <div className="flex gap-4 justify-center flex-wrap pt-2">
            <Link href="/auth" className={cn(buttonVariants({ size: "lg" }), "text-base px-8")}>
              Post a request — it&apos;s free
            </Link>
            <Link href="/auth" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-base px-8")}>
              I&apos;m a dealer →
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="text-muted-foreground mt-2">Three steps from request to deal.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="space-y-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OTD transparency ── */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold tracking-tight">
              No hidden fees.<br />No surprises at the table.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Every offer shows the full out-the-door breakdown: selling price,
              dealer discount, rebates, add-ons, doc fee, tax, title, and
              registration. You see exactly what you&apos;ll pay before you set
              foot in a dealership.
            </p>
            <Link href="/auth" className={cn(buttonVariants({ variant: "outline" }))}>
              See a sample offer →
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-3 text-sm">
            {OTD_BREAKDOWN.map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-medium tabular-nums", row.credit && "text-green-600")}>
                  {row.value}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
              <span>Out-the-door total</span>
              <span className="text-green-600 dark:text-green-400">$37,915</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── For dealers ── */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold tracking-tight">
              For dealers: reach motivated buyers
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Browse open requests from buyers in your area. Submit offers only on
              vehicles you actually have in stock. No cold calls, no unqualified
              floor traffic, no wasted time.
            </p>
            <Link href="/auth" className={cn(buttonVariants({ variant: "outline" }))}>
              Apply as a dealer →
            </Link>
          </div>
          <div className="space-y-4">
            {DEALER_BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-4 items-start">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg flex-shrink-0">
                  {b.icon}
                </div>
                <div>
                  <div className="font-medium text-sm">{b.title}</div>
                  <div className="text-sm text-muted-foreground">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-primary text-primary-foreground border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Ready to buy smarter?</h2>
          <p className="text-lg opacity-75 max-w-lg mx-auto">
            Join buyers saving thousands by letting local dealers compete for
            their business.
          </p>
          <Link
            href="/auth"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "text-base px-8")}
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2025 CarBuyingPower</span>
          <div className="flex gap-6">
            <Link href="/auth" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/auth" className="hover:text-foreground transition-colors">Create account</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Post your request",
    desc: "Tell us the make, model, year range, and budget you're working with. It takes about two minutes.",
  },
  {
    title: "Dealers compete",
    desc: "Local dealers see your request and submit their best out-the-door price. You don't negotiate — they do.",
  },
  {
    title: "Compare and choose",
    desc: "See every offer ranked side by side. Accept the best one, decline the rest. No pressure, no pushy sales calls.",
  },
];

const OTD_BREAKDOWN = [
  { label: "Selling price", value: "$36,500" },
  { label: "Dealer discount", value: "−$1,500", credit: true },
  { label: "Manufacturer rebate", value: "−$750", credit: true },
  { label: "Add-ons (tint, mats)", value: "$295" },
  { label: "Doc fee", value: "$499" },
  { label: "Tax (7.5%)", value: "$2,591" },
  { label: "Title & registration", value: "$280" },
];

const DEALER_BENEFITS = [
  {
    icon: "🎯",
    title: "Only motivated buyers",
    desc: "Every request comes from someone actively looking to purchase — not just browsing.",
  },
  {
    icon: "📋",
    title: "Full buyer context upfront",
    desc: "See credit tier, budget, financing terms, and zip code before you spend time on an offer.",
  },
  {
    icon: "⚡",
    title: "Submit in minutes",
    desc: "Our structured offer form makes it fast to put your best price forward.",
  },
];

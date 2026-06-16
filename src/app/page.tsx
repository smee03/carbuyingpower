import { ClipboardList, MessageSquare, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const steps = [
  {
    icon: ClipboardList,
    title: "Post your request",
    description: "Tell us exactly what you want — make, model, trim, and budget.",
  },
  {
    icon: MessageSquare,
    title: "Dealers come to you",
    description: "Local dealers respond with real out-the-door prices. No runaround.",
  },
  {
    icon: Trophy,
    title: "Pick the best deal",
    description: "Compare offers side by side and choose. No haggling, no brokers.",
  },
]

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center">
      <div className="space-y-10 max-w-2xl w-full">

        {/* Badge */}
        <div className="inline-block rounded-full border border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground">
          Early access — join the waitlist
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="font-handwriting text-6xl md:text-7xl font-bold leading-tight">
            Bringing power back<br className="hidden md:block" /> to the people.
          </h1>
          <p className="text-2xl font-semibold tracking-tight">
            Dealers come to you.
          </p>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Car buying has always favored the dealer. We&apos;re changing that. Post what you want — local dealers compete for your business with real, transparent out-the-door prices. No brokers. No games. Just you and the deal.
          </p>
        </div>

        {/* CTA */}
        <form className="flex gap-2 max-w-sm mx-auto w-full">
          <Input
            type="email"
            placeholder="Enter your email"
            className="flex-1"
          />
          <Button type="submit" size="lg">
            Get early access
          </Button>
        </form>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-left">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <step.icon className="size-4 text-primary" />
                <span>Step {i + 1}</span>
              </div>
              <p className="font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}

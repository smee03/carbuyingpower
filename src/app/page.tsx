export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center">
      <div className="space-y-6 max-w-xl">
        <div className="inline-block rounded-full border border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground">
          Coming soon
        </div>
        <h1 className="font-handwriting text-6xl md:text-7xl font-bold leading-tight">
          Make dealers compete<br className="hidden md:block" /> for your business
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Post what you&apos;re looking for. Local dealers respond with their best
          out-the-door price. You compare and choose — no haggling required.
        </p>
        <p className="text-sm text-muted-foreground">
          We&apos;re putting the finishing touches on things. Check back soon.
        </p>
      </div>
    </main>
  );
}

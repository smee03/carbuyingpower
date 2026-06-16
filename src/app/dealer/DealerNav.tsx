"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dealer/requests", label: "Browse Requests" },
  { href: "/dealer/offers", label: "My Offers" },
  { href: "/dealer/account", label: "Account" },
];

export default function DealerNav() {
  const pathname = usePathname();
  return (
    <nav className="bg-background border-b border-border">
      <div className="max-w-5xl mx-auto px-6 h-11 flex items-center gap-1">
        {NAV.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

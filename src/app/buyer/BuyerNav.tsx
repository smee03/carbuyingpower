"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/buyer/requests", label: "Dashboard" },
  { href: "/buyer/new", label: "New Request" },
];

export default function BuyerNav() {
  const pathname = usePathname();
  return (
    <nav className="bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-11 flex items-center gap-1">
        {NAV.map(({ href, label }) => {
          const active =
            href === "/buyer/requests"
              ? pathname.startsWith("/buyer/requests") && !pathname.startsWith("/buyer/requests/new")
              : pathname.startsWith(href) || pathname.startsWith("/buyer/requests/new");
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

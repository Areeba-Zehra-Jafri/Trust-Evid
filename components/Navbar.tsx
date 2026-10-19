"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { STUB_USER } from "@/lib/stub-store";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cases/new", label: "New Case" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-brand-700">
          <span className="text-xl">🔍</span>
          <span className="hidden sm:inline">TRUST-EVID AI</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Stub user pill */}
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
          <span className="size-2 rounded-full bg-green-400" aria-hidden />
          <span className="hidden sm:inline">{STUB_USER.displayName}</span>
          <span className="sm:hidden">Demo</span>
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-800 text-[10px] font-semibold uppercase tracking-wide">
            stub
          </span>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useState, useEffect } from 'react';
import { supabaseBrowser } from '../lib/supabase/browser'; // TODO: Use real supabase client session user in Phase 2

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cases/new", label: "New Case" },
];

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = supabaseBrowser.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    setUser(null);
  }

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

        {/* User pill and sign-out */}
        {user ? (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <span className="size-2 rounded-full bg-green-400" aria-hidden />
            <span className="hidden sm:inline">{user.email}</span>
            <button
              onClick={signOut}
              className="ml-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <span className="hidden sm:inline">Not signed in</span>
          </div>
        )}
      </div>
    </header>
  );
}

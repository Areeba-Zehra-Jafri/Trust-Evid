"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) return;
    setUser(null);
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <nav className="flex min-w-0 flex-wrap items-center justify-between gap-3 bg-gray-800 p-4 text-white">
      <Link href="/dashboard" className="font-bold">
        Trust-Evid
      </Link>
      {user ? (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-sm">
          <span className="max-w-[14rem] truncate text-slate-200" title={user.email ?? undefined}>
            {user.email}
          </span>
          <Link
            href="/dashboard"
            className="rounded px-2 py-1 hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Dashboard
          </Link>
          <button
            onClick={signOut}
            className="rounded bg-red-600 px-3 py-1.5 font-medium hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Sign out
          </button>
        </div>
      ) : (
        <Link href="/auth/login">Login</Link>
      )}
    </nav>
  );
}

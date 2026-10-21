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
    <nav className="bg-gray-800 text-white p-4 flex justify-between">
      <Link href="/dashboard" className="font-bold">
        Trust-Evid
      </Link>
      {user ? (
        <div className="flex items-center">
          <span>{user.email}</span>
          <button
            onClick={signOut}
            className="ml-4 bg-red-600 px-2 py-1 rounded"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <Link href="/auth/login">Login</Link>
      )}
    </nav>
  );
}

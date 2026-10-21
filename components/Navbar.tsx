"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    setUser(null);
  }

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between">
      <Link href="/dashboard" className="font-bold">
        Trust-Evid
      </Link>
      {user ? (
        <>
          <span>{user.email}</span>
          <button onClick={signOut} className="ml-4 bg-red-600 px-2 py-1 rounded">
            Sign Out
          </button>
        </>
      ) : (
        <Link href="/auth/login">Login</Link>
      )}
    </nav>
  );
}

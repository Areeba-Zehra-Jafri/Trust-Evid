"use client";

/**
 * Auth scaffolding — Phase 1 stub.
 * Sign-up shell with no real Supabase call. Phase 2 wires this properly.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";


export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const form = e.target as HTMLFormElement;
      const email = (form.email as HTMLInputElement).value;
      const password = (form.password as HTMLInputElement).value;
      const confirm = (form.confirm as HTMLInputElement).value;
      if (password !== confirm) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // After signup, user must check email for confirmation
      router.push('/auth/login');
    } catch (err) {
      setError('Unexpected error during sign-up');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-6">
      <div className="text-center">
        <span className="text-5xl">🔍</span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">TRUST-EVID AI</h1>
        <p className="mt-1 text-sm text-slate-500">Create an investigator account</p>
      </div>

      <StubBanner message="Sign-up is a stub — any input proceeds to the dashboard. Supabase Auth + TOTP 2FA land in Phase 2." />

      <div className="card p-6">
        {error && <p className="text-red-600 mb-2">Error: {error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email"
              placeholder="investigator@example.gov" className="input" disabled={loading} />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password"
              placeholder="••••••••" className="input" disabled={loading} />
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirm password</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password"
              placeholder="••••••••" className="input" disabled={loading} />
          </div>

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          TOTP two-factor authentication setup will follow registration.
        </p>
      </div>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-brand-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

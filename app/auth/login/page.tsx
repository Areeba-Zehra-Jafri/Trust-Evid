"use client";

/**
 * Auth scaffolding — Phase 1 stub.
 *
 * This page renders the login shell but does NOT call Supabase Auth yet.
 * Clicking "Sign in" simply redirects to the dashboard (no session is created).
 *
 * Phase 2 will:
 *  - Wire this to Supabase Auth email+password sign-in.
 *  - Add the TOTP 2FA verification step.
 *  - Protect all dashboard routes behind a real session check.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session?.user?.factors && data.session.user.factors.length > 0) {
        // User has MFA factors enrolled, go to MFA verify
        router.push('/auth/mfa/verify');
      } else {
        // No MFA factors, go to dashboard directly
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Unexpected error during sign-in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-6">
      <div className="text-center">
        <span className="text-5xl">🔍</span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">TRUST-EVID AI</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your investigator account</p>
      </div>

      <StubBanner message="Authentication is a stub — any input proceeds to the dashboard. Supabase Auth + TOTP 2FA land in Phase 2." />

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="investigator@example.gov"
              className="input"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Two-factor authentication (TOTP) is required after password verification.
        </p>
      </div>

      <p className="text-center text-xs text-slate-400">
        TRUST-EVID AI is a demonstration prototype. Do not submit real case evidence.
      </p>
    </div>
  );
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Two-factor authentication (TOTP) will be required after password verification — coming in Phase 2.
        </p>
      </div>

      <p className="text-center text-xs text-slate-400">
        TRUST-EVID AI is a demonstration prototype. Do not submit real case evidence.
      </p>
    </div>
  );
}

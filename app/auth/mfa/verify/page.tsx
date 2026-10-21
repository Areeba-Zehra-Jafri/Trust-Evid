"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function MfaVerifyPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFactors() {
      const { data, error } = await supabaseBrowser.auth.mfa.listFactors();
      if (error) {
        setError(error.message);
        return;
      }
      if (data?.totp && data.totp.length > 0) {
        setFactorId(data.totp[0].id);
      }
    }
    fetchFactors();
  }, []);

  async function handleVerify() {
    setLoading(true);
    setError('');
    try {
      if (!factorId) {
        setError('No MFA factor found for verification');
        setLoading(false);
        return;
      }
      const challenge = await supabaseBrowser.auth.mfa.challenge({ factorId });
      if (!challenge.data) {
        setError('Failed to initiate MFA challenge');
        setLoading(false);
        return;
      }
      const { error } = await supabaseBrowser.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: token });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.refresh();
      router.push('/dashboard');
    } catch {
      setError('Unexpected error during MFA verification');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Verify MFA (TOTP)</h1>
      {error && <p className="text-red-600 mb-2">Error: {error}</p>}
      <input
        type="text"
        placeholder="Enter TOTP code"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="border p-2 w-full mb-4"
      />
      <button
        onClick={handleVerify}
        disabled={loading || token.length === 0}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Verify
      </button>
    </div>
  );
}

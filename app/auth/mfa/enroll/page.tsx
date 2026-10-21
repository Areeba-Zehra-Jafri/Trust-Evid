"use client";

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';

export default function MfaEnrollPage() {
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function enroll() {
      setLoading(true);
      setError('');
      try {
        const { data, error } = await supabaseBrowser.auth.mfa.enroll({ factorType: 'totp' });
        if (error || !data) {
          setError(error?.message || 'Failed to start MFA enrollment');
          setLoading(false);
          return;
        }
        setFactorId(data.id);
        setQrCodeUrl(data.totp.qr_code);
        setSecret(data.totp.secret);
      } catch (err) {
        setError('Unexpected error during enrollment');
      } finally {
        setLoading(false);
      }
    }
    enroll();
  }, []);

  async function handleVerify() {
    setLoading(true);
    setError('');
    try {
      if (!factorId) {
        setError('Missing factor ID for verification');
        setLoading(false);
        return;
      }

      const challenge = await supabaseBrowser.auth.mfa.challenge({ factorId });
      if (!challenge.data) {
        setError('Failed to initiate MFA challenge');
        setLoading(false);
        return;
      }

      const { error } = await supabaseBrowser.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: totpCode });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      router.push('/dashboard');
    } catch (err) {
      setError('Unexpected error during verification');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Enroll in MFA (TOTP)</h1>
      {error && <p className="text-red-600 mb-2">Error: {error}</p>}
      {success ? (
        <p className="text-green-600">MFA enrollment successful!</p>
      ) : (
        <>
          {qrCodeUrl && <img src={qrCodeUrl} alt="TOTP QR Code" className="mb-4" />}
          <p className="mb-2">Secret: {secret}</p>
          <input
            type="text"
            placeholder="Enter TOTP code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            className="border p-2 w-full mb-4"
          />
          <button
            onClick={handleVerify}
            disabled={loading || totpCode.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Verify
          </button>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabase/browser';

export default function MfaVerifyPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleVerify() {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabaseBrowser.auth.mfa.challenge({ token });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
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

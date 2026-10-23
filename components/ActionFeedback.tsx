'use client';

import { useEffect } from 'react';

export function ActionFeedback({ message, kind, onDismiss }: { message: string; kind: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => {
    if (!message || kind !== 'success') return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [message, kind, onDismiss]);
  if (!message) return null;
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`mt-3 flex items-start justify-between gap-3 rounded-lg p-3 text-sm ${kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
    <span className="break-words">{message}</span>
    <button type="button" onClick={onDismiss} className="shrink-0 font-semibold underline" aria-label="Dismiss message">Dismiss</button>
  </div>;
}

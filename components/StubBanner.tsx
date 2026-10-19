/**
 * Prominently labels any stub / in-memory section so reviewers know what's wired
 * to the real DB and what isn't. Remove (or swap for a real session context)
 * as each phase lands.
 */
export function StubBanner({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span className="mt-px text-base leading-none">⚠️</span>
      <span>
        <strong>Phase 1 stub — </strong>
        {message ??
          "Data is stored in memory only and resets on page refresh. Supabase integration lands in Phase 2."}
      </span>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <span className="text-6xl">🔎</span>
      <h1 className="text-3xl font-bold text-slate-800">Page not found</h1>
      <p className="text-slate-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/dashboard" className="btn-primary mt-2">
        Go to dashboard
      </Link>
    </div>
  );
}

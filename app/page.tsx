import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-md pt-8">
      <Card>
        <h1 className="text-2xl font-semibold">Authentication</h1>
        <p className="mt-1 text-sm soft-text">Select login or signup to continue.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-black transition-all duration-75 hover:bg-white hover:text-black"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-sm border border-white/20 bg-black/70 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text)] transition-all duration-75 hover:bg-white hover:text-black"
          >
            Sign Up
          </Link>
        </div>
      </Card>
    </div>
  );
}

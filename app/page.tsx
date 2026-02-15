import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center pt-8">
      <div className="w-full max-w-md">
        <Card className="tech-card">
          <div className="rounded-sm border border-white/10 bg-black/45 p-8">
            <div className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-sm border border-white/10 bg-black/55 px-3 py-2">
              <Image src="/sauron-logo.svg" alt="Sauron logo" width={28} height={28} className="object-contain" priority />
              <span className="hud-label text-[var(--text)]">SAURON</span>
            </div>
            <p className="hud-label">Authentication</p>
            <h1 className="mt-2 hud-title">Access Node</h1>
            <p className="mt-2 soft-text">Select login or signup to continue.</p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black transition-all duration-75 hover:bg-white hover:text-black"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-sm border border-white/15 bg-black/55 px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-[var(--text)] transition-all duration-75 hover:bg-white hover:text-black"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

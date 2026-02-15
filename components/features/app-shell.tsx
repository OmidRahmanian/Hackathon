'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import {
  Bell,
  Brain,
  Camera,
  LayoutDashboard,
  LogIn,
  User,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/components/features/auth-provider';

const items = [
  { href: '/login', label: 'Login', icon: LogIn },
  { href: '/signup', label: 'Sign Up', icon: UserPlus },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/monitor', label: 'Monitor', icon: Camera },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/ai', label: 'AI Coach', icon: Brain },
  { href: '/profile', label: 'Profile', icon: User }
];

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname === '/' || pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (!ready) return;

    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, isAuthRoute, router]);

  const navItems = items.filter((item) => {
    if (isAuthenticated) return item.href !== '/login' && item.href !== '/signup';
    return item.href === '/login' || item.href === '/signup';
  });

  const hideContentDuringRedirect = ready && !isAuthenticated && !isAuthRoute;

  if (!ready || hideContentDuringRedirect) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#666]">Booting interface...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-sm border border-white/10 bg-black/55 shadow-[0_0_16px_rgba(255,255,255,0.15)]">
              <Image
                src="/sauron-logo.svg"
                alt="Sauron logo"
                fill
                sizes="40px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <p className="hud-label">SAURON</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text)]">Tactical Interface</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-sm border border-white/10 bg-black/45 p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition-all duration-75',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                      : 'border-transparent bg-transparent text-[#888] hover:border-white/15 hover:bg-white hover:text-black'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', active ? 'text-black' : 'text-[#888] group-hover:text-black')} />
                  <span className="hidden sm:inline-block">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="page-fade mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

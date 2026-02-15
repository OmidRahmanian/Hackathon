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
  const isMonitorRoute = pathname === '/monitor';

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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/75 backdrop-blur-md">
        <div className="flex h-20 w-full items-center gap-4 px-3 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-sm border border-white/10 bg-black/55 shadow-[0_0_16px_rgba(255,255,255,0.15)]">
              <Image
                src="/sauron-logo.svg"
                alt="Sauron logo"
                fill
                sizes="48px"
                className="object-contain p-1"
                priority
              />
            </div>
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text)] sm:text-base">
              SAURON
            </p>
          </div>

          <nav className="ml-2 flex flex-1 items-stretch gap-1 rounded-sm border border-white/10 bg-black/45 p-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group inline-flex flex-1 items-center justify-center gap-2 rounded-sm border px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-75 sm:text-sm',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                      : 'border-transparent bg-transparent text-[#888] hover:border-white/15 hover:bg-white hover:text-black'
                  )}
                >
                  <Icon className={cn('h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]', active ? 'text-black' : 'text-[#888] group-hover:text-black')} />
                  <span className="hidden md:inline-block">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main
        className={cn(
          'page-fade mx-auto w-full',
          isMonitorRoute
            ? 'h-[calc(100dvh-5rem)] max-w-none overflow-hidden px-0 py-0'
            : 'max-w-7xl px-6 py-8'
        )}
      >
        {children}
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import {
  Activity,
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

  const hideContentDuringRedirect =
    ready && !isAuthenticated && !isAuthRoute;

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
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-[0.16em]">
            <div className="rounded-sm border border-white/20 bg-black/75 p-1.5">
              <Activity className="h-4 w-4 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(0,255,65,0.45)]" />
            </div>
            <span className="font-mono uppercase text-[#eee]">PostureOS</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1 rounded-sm border border-white/10 bg-black/55 p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] transition-all duration-75',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                      : 'border-white/10 bg-black/45 text-[#666] hover:bg-white hover:text-black'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="page-fade mx-auto w-full max-w-7xl px-5 py-6">{children}</main>
    </div>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/features/app-shell';
import { AuthProvider } from '@/components/features/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'SAURON',
  description: 'AI ergonomic copilot'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#080808] text-gray-200 antialiased selection:bg-[var(--accent)] selection:text-black">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div
            className="fixed inset-0 z-[-1] pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")"
            }}
          />
          <div className="fixed inset-0 z-[-2] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_50%)]" />
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

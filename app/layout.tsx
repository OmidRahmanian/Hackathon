import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/features/app-shell';
import { AuthProvider } from '@/components/features/auth-provider';

export const metadata: Metadata = {
  title: 'PostureOS',
  description: 'AI ergonomic copilot'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}

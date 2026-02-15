'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chrome, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/features/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setStatus('Enter both email and password.');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Login failed (${response.status})`);
      }

      const ok = login(email, password);
      if (!ok) {
        setStatus('Login state update failed.');
        return;
      }

      router.replace('/dashboard');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    login('google@example.com', 'oauth');
    router.replace('/dashboard');
  };

  return (
    <div className="mx-auto max-w-md pt-8">
      <Card className="tech-card">
        <div className="mb-3 flex items-center gap-3 rounded-sm border border-white/10 bg-black/55 px-3 py-2">
          <Image src="/sauron-logo.svg" alt="Sauron logo" width={26} height={26} className="object-contain" priority />
          <p className="hud-label text-[var(--text)]">SAURON</p>
        </div>
        <div className="flex items-center gap-2">
          <LogIn className="h-5 w-5 text-[var(--accent)]" />
          <h1 className="hud-title text-xl">Sign In</h1>
        </div>
        <p className="mt-1 soft-text">Enter email and password, or continue with Google.</p>

        <form onSubmit={handleLogin} className="mt-5 space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter email"
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="my-4 h-px bg-white/10" />

        <Button variant="secondary" className="w-full" onClick={handleGoogleSignIn}>
          <Chrome className="mr-2 h-4 w-4" /> Sign in with Google
        </Button>

        <p className="mt-4 text-center text-xs soft-text">
          New here?{' '}
          <Link href="/signup" className="text-[var(--text)] underline underline-offset-2">
            Create account
          </Link>
        </p>

        {status ? <p className="mt-3 text-sm soft-text">{status}</p> : null}
      </Card>
    </div>
  );
}

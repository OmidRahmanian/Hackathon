'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chrome } from 'lucide-react';
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
      <Card>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm soft-text">Enter email and password, or continue with Google.</p>

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
          <Link href="/signup" className="text-[#eee] underline">
            Create account
          </Link>
        </p>

        {status ? <p className="mt-3 text-sm soft-text">{status}</p> : null}
      </Card>
    </div>
  );
}

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

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();

    const ok = login(email, password);
    if (!ok) {
      setStatus('Enter both email and password.');
      return;
    }

    setStatus('');
    router.replace('/dashboard');
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
          <Button type="submit" className="w-full">
            Sign in
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

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault();

    if (!email || !password || !confirmPassword) {
      setStatus('Fill all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Sign up failed (${response.status})`);
      }

      setStatus('Account created. Redirecting to login...');
      setTimeout(() => router.replace('/login'), 700);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-8">
      <Card className="tech-card">
        <div className="mb-3 flex items-center gap-3 rounded-sm border border-white/10 bg-black/55 px-3 py-2">
          <Image src="/sauron-logo.svg" alt="Sauron logo" width={26} height={26} className="object-contain" priority />
          <p className="hud-label text-[var(--text)]">SAURON</p>
        </div>
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[var(--accent)]" />
          <h1 className="hud-title text-xl">Sign Up</h1>
        </div>
        <p className="mt-1 soft-text">Create your account with email and password.</p>

        <form onSubmit={handleSignUp} className="mt-5 space-y-3">
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
            placeholder="Create password"
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs soft-text">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--text)] underline underline-offset-2">
            Sign in
          </Link>
        </p>

        {status ? <p className="mt-3 text-sm soft-text">{status}</p> : null}
      </Card>
    </div>
  );
}

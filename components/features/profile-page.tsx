'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/features/auth-provider';
import { Modal } from '@/components/ui/modal';

export function ProfilePage() {
  const router = useRouter();
  const { logout, email } = useAuth();
  const [name, setName] = useState('Your Name');
  const [bio, setBio] = useState('Building healthier desk habits one day at a time.');
  const [avatarSrc, setAvatarSrc] = useState('/avatar-1.svg');
  const [friendEmail, setFriendEmail] = useState('');
  const [status, setStatus] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetState, setResetState] = useState<'confirm' | 'done'>('confirm');
  const [resetError, setResetError] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setAvatarSrc(imageUrl);
  };

  const addFriend = (event: FormEvent) => {
    event.preventDefault();
    if (!friendEmail.includes('@')) {
      setStatus('Enter a valid email address.');
      return;
    }

    setStatus(`Friend request sent to ${friendEmail}.`);
    setFriendEmail('');
  };

  const onSignOut = () => {
    logout();
    router.replace('/login');
  };

  const openResetModal = () => {
    setResetError('');
    setResetState('confirm');
    setResetOpen(true);
  };

  const closeResetModal = () => {
    if (resetLoading) return;
    setResetOpen(false);
  };

  const proceedReset = async () => {
    const password = newPassword.trim();
    if (!password) {
      setResetError('Enter a new password first.');
      return;
    }

    if (!email) {
      setResetError('No account email found. Please sign out and sign in again.');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Reset failed (${response.status})`);
      }

      setResetState('done');
      setResetStatus('Password has been changed.');
      setNewPassword('');
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Unable to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Card>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Profile</h1>
          <Button variant="secondary" onClick={onSignOut}>
            Sign Out
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Image src={avatarSrc} alt="Profile avatar" width={80} height={80} className="rounded-sm border border-white/15 object-cover" />
          <div className="flex-1 space-y-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
            <Input value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Bio" />
            <Input type="file" accept="image/*" onChange={onImageChange} />
          </div>
        </div>

        <div className="my-5 h-px bg-white/10" />

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">🔒 Password Reset</h2>
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Enter new password"
          />
          <Button type="button" onClick={openResetModal} disabled={!newPassword.trim()}>
            Password Reset
          </Button>
          {resetStatus ? <p className="text-sm soft-text">{resetStatus}</p> : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(0,255,65,0.35)]" />
          <h2 className="text-xl font-semibold">Add Friend</h2>
        </div>

        <form onSubmit={addFriend} className="mt-4 space-y-3">
          <Input
            type="email"
            value={friendEmail}
            onChange={(event) => setFriendEmail(event.target.value)}
            placeholder="Enter friend email address"
          />
          <Button type="submit">Send Friend Request</Button>
        </form>

        {status ? <p className="mt-3 text-sm soft-text">{status}</p> : null}
      </Card>

      <Modal open={resetOpen} onClose={closeResetModal}>
        <h4 className="text-lg font-semibold">Reset password</h4>

        {resetState === 'confirm' ? (
          <>
            <p className="mt-1 text-sm soft-text">u sure you wanna reset the password</p>
            {resetError ? <p className="mt-3 text-sm text-[var(--accent-2)]">{resetError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={closeResetModal} disabled={resetLoading}>
                Cancel
              </Button>
              <Button type="button" onClick={proceedReset} disabled={resetLoading}>
                {resetLoading ? 'Proceeding...' : 'Proceed'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm soft-text">Password has been changed.</p>
            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={closeResetModal}>
                Close
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

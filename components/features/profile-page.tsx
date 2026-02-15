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
  const [avatarSrc, setAvatarSrc] = useState('/avatar-neutral.svg');
  const [friendEmail, setFriendEmail] = useState('');
  const [status, setStatus] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'verify-current' | 'set-new' | 'done'>(
    'verify-current'
  );
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
    setResetStatus('');
    setResetStep('verify-current');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResetOpen(true);
  };

  const closeResetModal = () => {
    if (resetLoading) return;
    setResetOpen(false);
  };

  const verifyCurrentPassword = async () => {
    if (!currentPassword) {
      setResetError('Enter your current password first.');
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
        body: JSON.stringify({
          action: 'verify-current',
          email,
          currentPassword
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Verification failed (${response.status})`);
      }

      setResetStep('set-new');
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Unable to verify password.');
    } finally {
      setResetLoading(false);
    }
  };

  const changePassword = async () => {
    const nextPassword = newPassword.trim();
    const nextPasswordConfirm = confirmPassword.trim();

    if (!nextPassword || !nextPasswordConfirm) {
      setResetError('Enter and confirm your new password.');
      return;
    }

    if (nextPassword !== nextPasswordConfirm) {
      setResetError('New passwords do not match.');
      return;
    }

    if (!currentPassword) {
      setResetStep('verify-current');
      setResetError('Current password verification expired. Please verify again.');
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
        body: JSON.stringify({
          action: 'change-password',
          email,
          currentPassword,
          newPassword: nextPassword
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Password change failed (${response.status})`);
      }

      setResetStep('done');
      setResetStatus('Password has been changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Unable to change password.');
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
          <Image src={avatarSrc} alt="Profile avatar" width={80} height={80} className="rounded-full object-cover" />
          <div className="flex-1 space-y-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
            <Input value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Bio" />
            <Input type="file" accept="image/*" onChange={onImageChange} />
          </div>
        </div>

        <div className="my-5 h-px bg-white/10" />

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Change Password</h2>
          <Button type="button" onClick={openResetModal}>
            Change Password
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
        <h4 className="text-lg font-semibold">Change password</h4>

        {resetStep === 'verify-current' ? (
          <>
            <p className="mt-1 text-sm soft-text">Enter your current password to continue.</p>
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
            />
            {resetError ? <p className="mt-3 text-sm text-[var(--accent-2)]">{resetError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={closeResetModal} disabled={resetLoading}>
                Cancel
              </Button>
              <Button type="button" onClick={verifyCurrentPassword} disabled={resetLoading}>
                {resetLoading ? 'Verifying...' : 'Continue'}
              </Button>
            </div>
          </>
        ) : resetStep === 'set-new' ? (
          <>
            <p className="mt-1 text-sm soft-text">Enter and confirm your new password.</p>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
            />
            {resetError ? <p className="mt-3 text-sm text-[var(--accent-2)]">{resetError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  if (resetLoading) return;
                  setResetError('');
                  setResetStep('verify-current');
                }}
                disabled={resetLoading}
              >
                Back
              </Button>
              <Button type="button" onClick={changePassword} disabled={resetLoading}>
                {resetLoading ? 'Saving...' : 'Change Password'}
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

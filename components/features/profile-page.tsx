'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/features/auth-provider';

export function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [name, setName] = useState('Your Name');
  const [bio, setBio] = useState('Building healthier desk habits one day at a time.');
  const [avatarSrc, setAvatarSrc] = useState('/avatar-1.svg');
  const [friendEmail, setFriendEmail] = useState('');
  const [status, setStatus] = useState('');

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
    </div>
  );
}

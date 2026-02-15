'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/features/auth-provider';

export function ProfilePage() {
  const router = useRouter();
  const { logout, userEmail } = useAuth();
  const [name, setName] = useState('Your Name');
  const [bio, setBio] = useState('Building healthier desk habits one day at a time.');
  const [avatarSrc, setAvatarSrc] = useState('/avatar-1.svg');
  const [friendInput, setFriendInput] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [friendStatus, setFriendStatus] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isFriendSaving, setIsFriendSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [friends, setFriends] = useState<
    {
      id: number;
      displayName: string;
      username: string;
      email: string;
    }[]
  >([]);

  const activeEmail = useMemo(() => {
    if (userEmail && userEmail.includes('@')) return userEmail;
    return 'demo@example.com';
  }, [userEmail]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const params = new URLSearchParams({ email: activeEmail });
        const response = await fetch(`/api/profile?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store'
        });

        if (cancelled) return;

        if (response.status === 404) {
          return;
        }

        if (!response.ok) {
          throw new Error(`Profile load failed (${response.status})`);
        }

        const data = (await response.json()) as {
          profile?: {
            name?: string;
            bio?: string;
          } | null;
        };

        if (!data.profile) return;
        setName(data.profile.name?.trim() ? data.profile.name : 'Your Name');
        setBio(
          data.profile.bio?.trim()
            ? data.profile.bio
            : 'Building healthier desk habits one day at a time.'
        );
      } catch (error) {
        console.error('Profile load failed:', error);
        if (!cancelled) {
          setProfileStatus('Unable to load profile data from database.');
        }
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [activeEmail]);

  useEffect(() => {
    let cancelled = false;

    const loadFriends = async () => {
      try {
        const params = new URLSearchParams({ userEmail: activeEmail });
        const response = await fetch(`/api/friends?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store'
        });

        if (cancelled) return;
        if (!response.ok) {
          throw new Error(`Friends load failed (${response.status})`);
        }

        const data = (await response.json()) as {
          friends?: {
            id?: number;
            displayName?: string;
            username?: string;
            email?: string;
          }[];
        };

        const rows = Array.isArray(data.friends)
          ? data.friends.map((friend) => ({
              id: Number(friend.id ?? 0),
              displayName: friend.displayName?.trim() || friend.username?.trim() || 'Unknown',
              username: friend.username?.trim() || '',
              email: friend.email?.trim() || ''
            }))
          : [];

        setFriends(rows);
      } catch (error) {
        console.error('Friends load failed:', error);
      }
    };

    void loadFriends();
    return () => {
      cancelled = true;
    };
  }, [activeEmail]);

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setAvatarSrc(imageUrl);
  };

  const saveProfile = async () => {
    setIsProfileSaving(true);
    setProfileStatus('');

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeEmail,
          name,
          bio
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Save failed (${response.status})`);
      }

      setProfileStatus('Profile saved to database.');
    } catch (error) {
      console.error('Profile save failed:', error);
      setProfileStatus(error instanceof Error ? error.message : 'Unable to save profile.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordStatus('Enter your current and new password.');
      return;
    }

    setIsPasswordSaving(true);
    setPasswordStatus('');

    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeEmail,
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Password change failed (${response.status})`);
      }

      setCurrentPassword('');
      setNewPassword('');
      setPasswordStatus('Password updated successfully.');
    } catch (error) {
      console.error('Password change failed:', error);
      setPasswordStatus(
        error instanceof Error ? error.message : 'Unable to change password.'
      );
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const addFriend = async (event: FormEvent) => {
    event.preventDefault();
    const nextFriendIdentifier = friendInput.trim().toLowerCase();

    if (!nextFriendIdentifier) {
      setFriendStatus('Enter a valid username or email.');
      return;
    }

    setIsFriendSaving(true);
    setFriendStatus('');

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: activeEmail,
          friendIdentifier: nextFriendIdentifier
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Add friend failed (${response.status})`);
      }

      const data = (await response.json()) as {
        alreadyExists?: boolean;
        friend?: {
          id?: number;
          displayName?: string;
          username?: string;
          email?: string;
        };
      };

      const savedFriend = data.friend
        ? {
            id: Number(data.friend.id ?? 0),
            displayName:
              data.friend.displayName?.trim() || data.friend.username?.trim() || 'Unknown',
            username: data.friend.username?.trim() || '',
            email: data.friend.email?.trim() || ''
          }
        : null;

      if (data.alreadyExists) {
        const label = nextFriendIdentifier.includes('@')
          ? nextFriendIdentifier
          : `@${nextFriendIdentifier}`;
        setFriendStatus(`${label} is already in your friends list.`);
      } else {
        const label = nextFriendIdentifier.includes('@')
          ? nextFriendIdentifier
          : `@${nextFriendIdentifier}`;
        setFriendStatus(`${label} saved to your friends list.`);
      }

      if (savedFriend) {
        setFriends((prev) => {
          const exists = prev.some((item) => item.id === savedFriend.id);
          if (exists) return prev;
          return [savedFriend, ...prev];
        });
      }
      setFriendInput('');
    } catch (error) {
      console.error('Add friend failed:', error);
      setFriendStatus(error instanceof Error ? error.message : 'Unable to save friend.');
    } finally {
      setIsFriendSaving(false);
    }
  };

  const onSignOut = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Card className="tech-card">
        <div className="flex items-center justify-between gap-2">
          <h1 className="hud-title text-xl">Profile</h1>
          <Button variant="secondary" onClick={onSignOut} disabled={isProfileSaving}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
        <p className="mt-1 text-xs soft-text">Connected account: {activeEmail}</p>
        <div className="mt-4 flex items-center gap-4">
          <Image src={avatarSrc} alt="Profile avatar" width={80} height={80} className="rounded-sm border border-white/15 object-cover" />
          <div className="flex-1 space-y-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
            <Input value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Bio" />
            <Input type="file" accept="image/*" onChange={onImageChange} />
            <Button onClick={saveProfile} disabled={isProfileSaving}>
              {isProfileSaving ? 'Saving...' : 'Save Profile'}
            </Button>
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
            />
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
            />
            <Button onClick={changePassword} disabled={isPasswordSaving}>
              {isPasswordSaving ? 'Updating...' : 'Change Password'}
            </Button>
          </div>
        </div>
        {profileStatus ? <p className="mt-3 text-sm soft-text">{profileStatus}</p> : null}
        {passwordStatus ? <p className="mt-2 text-sm soft-text">{passwordStatus}</p> : null}
      </Card>

      <Card className="tech-card">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="hud-title text-lg">Add Friend</h2>
        </div>

        <form onSubmit={addFriend} className="mt-4 space-y-3">
          <Input
            type="text"
            value={friendInput}
            onChange={(event) => setFriendInput(event.target.value)}
            placeholder="Enter friend username or email"
          />
          <Button type="submit" disabled={isFriendSaving}>
            {isFriendSaving ? 'Saving...' : 'Send Friend Request'}
          </Button>
        </form>

        {friendStatus ? <p className="mt-3 text-sm soft-text">{friendStatus}</p> : null}

        <div className="mt-4 space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.16em] text-[var(--text-soft)]">
            Your friends
          </p>
          {friends.length > 0 ? (
            friends.map((friend) => (
              <div
                key={`${friend.id}-${friend.username}`}
                className="rounded-sm border border-white/10 bg-black/45 px-3 py-2"
              >
                <p className="font-mono text-sm uppercase tracking-[0.08em] text-[var(--text)]">
                  {friend.displayName}
                </p>
                <p className="text-xs soft-text">
                  @{friend.username}
                  {friend.email ? ` • ${friend.email}` : ''}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm soft-text">No friends added yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

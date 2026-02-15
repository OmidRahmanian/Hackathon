import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type FriendRow = {
  id: number;
  friend_id: number;
  name: string | null;
  lastname: string | null;
  email: string | null;
  username: string | null;
};

type FriendBody = {
  userEmail?: string;
  friendUsername?: string;
  friendIdentifier?: string;
  email?: string;
  friendEmail?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function deriveUsername(email: string) {
  const local = email.split('@')[0]?.trim().toLowerCase() ?? '';
  return local || `friend_${Date.now()}`;
}

function toFriendId(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000000000;
  }
  return Math.abs(hash) || 1;
}

function toFriendPayload(row: FriendRow) {
  const displayName =
    row.lastname?.trim() || row.username?.trim() || row.email?.trim() || 'Unknown';

  return {
    id: row.id,
    friendId: row.friend_id,
    ownerEmail: row.name ?? '',
    displayName,
    email: row.email ?? '',
    username: row.username ?? '',
    // Legacy fields preserved for compatibility.
    name: row.name ?? '',
    lastname: row.lastname ?? ''
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawOwnerEmail = searchParams.get('userEmail');
  const ownerEmail =
    typeof rawOwnerEmail === 'string' ? normalizeEmail(rawOwnerEmail) : '';

  let result;
  if (ownerEmail) {
    result = await query<FriendRow>(
      `
        SELECT id, friend_id, name, lastname, email, username
        FROM friends
        WHERE name = $1
        ORDER BY id DESC
        LIMIT 200;
      `,
      [ownerEmail]
    );
  } else {
    result = await query<FriendRow>(
      `
        SELECT id, friend_id, name, lastname, email, username
        FROM friends
        ORDER BY id DESC
        LIMIT 200;
      `
    );
  }

  return Response.json({
    friends: result.rows.map(toFriendPayload)
  });
}

export async function POST(req: NextRequest) {
  const body: FriendBody = (await req.json().catch(() => ({}))) ?? {};
  const ownerEmail = normalizeEmail(
    typeof body.userEmail === 'string' ? body.userEmail : ''
  );
  const friendIdentifier = normalizeText(
    typeof body.friendIdentifier === 'string'
      ? body.friendIdentifier
      : typeof body.friendUsername === 'string'
        ? body.friendUsername
        : typeof body.friendEmail === 'string'
          ? body.friendEmail
          : typeof body.email === 'string'
            ? body.email
            : ''
  ).toLowerCase();

  if (!ownerEmail || !ownerEmail.includes('@')) {
    return new Response("Missing or invalid 'userEmail'.", { status: 400 });
  }

  let friendEmail = '';
  let friendUsername = '';
  let friendDisplayName = '';

  if (!friendIdentifier) {
    return new Response("Missing friend identifier.", { status: 400 });
  }

  if (friendIdentifier.includes('@')) {
    const userResult = await query<{
      email: string | null;
      username: string | null;
      name: string | null;
    }>(
      `
        SELECT email, username, name
        FROM users
        WHERE LOWER(email) = $1
        ORDER BY id DESC
        LIMIT 1;
      `,
      [friendIdentifier]
    );

    const matchedUser = userResult.rows[0];
    if (!matchedUser) {
      return new Response('User with this email was not found.', { status: 404 });
    }

    friendUsername = matchedUser.username?.trim().toLowerCase() || deriveUsername(friendIdentifier);
    friendEmail = normalizeEmail(matchedUser.email ?? friendIdentifier);
    friendDisplayName = matchedUser.name?.trim() || friendUsername;
  } else {
    const userResult = await query<{
      email: string | null;
      username: string | null;
      name: string | null;
    }>(
      `
        SELECT email, username, name
        FROM users
        WHERE LOWER(username) = $1
        ORDER BY id DESC
        LIMIT 1;
      `,
      [friendIdentifier]
    );

    const matchedUser = userResult.rows[0];
    if (!matchedUser) {
      return new Response('User with this username was not found.', { status: 404 });
    }

    friendUsername = matchedUser.username?.trim().toLowerCase() || friendIdentifier;
    friendEmail = normalizeEmail(matchedUser.email ?? '');
    friendDisplayName = matchedUser.name?.trim() || friendUsername;
  }

  if (!friendEmail || !friendEmail.includes('@')) {
    return new Response("Missing or invalid friend identity.", { status: 400 });
  }
  if (friendEmail === ownerEmail) {
    return new Response('You cannot add yourself as a friend.', { status: 400 });
  }

  const friendId = toFriendId(`${ownerEmail}:${friendUsername}`);
  const existing = await query<FriendRow>(
    `
      SELECT id, friend_id, name, lastname, email, username
      FROM friends
      WHERE friend_id = $1
      LIMIT 1;
    `,
    [friendId]
  );

  if (existing.rows[0]) {
    return Response.json({
      ok: true,
      alreadyExists: true,
      friend: toFriendPayload(existing.rows[0])
    });
  }

  const inserted = await query<FriendRow>(
    `
      INSERT INTO friends (friend_id, name, lastname, email, username)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, friend_id, name, lastname, email, username;
    `,
    [friendId, ownerEmail, friendDisplayName, friendEmail, friendUsername]
  );

  const saved = inserted.rows[0];
  if (!saved) {
    return new Response('Failed to save friend.', { status: 500 });
  }

  return Response.json({
    ok: true,
    alreadyExists: false,
    friend: toFriendPayload(saved)
  });
}

import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type FriendRow = {
  username: string | null;
  lastname: string | null;
  email: string | null;
};

type UserScoreRow = {
  email: string | null;
  username: string | null;
  score: number | null;
};

type FriendLeaderboardEntry = {
  name: string;
  username: string;
  score: number;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUserEmail = searchParams.get('userEmail') ?? '';
  const userEmail = normalizeEmail(rawUserEmail);

  if (!userEmail) {
    return new Response("Missing 'userEmail' query parameter.", { status: 400 });
  }

  const friendsResult = await query<FriendRow>(
    `
      SELECT username, lastname, email
      FROM friends
      WHERE name = $1
      ORDER BY id DESC
      LIMIT 200;
    `,
    [userEmail]
  );

  const friends = friendsResult.rows.filter((row) => row.username?.trim());
  if (friends.length === 0) {
    return Response.json({
      updatedAt: Math.floor(Date.now() / 1000),
      entries: []
    });
  }

  const usernames = friends
    .map((row) => row.username?.trim().toLowerCase() ?? '')
    .filter(Boolean);
  const friendEmails = friends
    .map((row) => row.email?.trim().toLowerCase() ?? '')
    .filter(Boolean);

  const userScoreResult = await query<UserScoreRow>(
    `
      SELECT email, username, score
      FROM users
      WHERE LOWER(email) = ANY($1::text[])
         OR LOWER(username) = ANY($2::text[]);
    `,
    [friendEmails, usernames]
  );

  const scoreByEmail = new Map(
    userScoreResult.rows.map((row) => [
      row.email?.trim().toLowerCase() ?? '',
      Number(row.score ?? 0)
    ])
  );
  const scoreByUsername = new Map(
    userScoreResult.rows.map((row) => [
      row.username?.trim().toLowerCase() ?? '',
      Number(row.score ?? 0)
    ])
  );

  const entries: FriendLeaderboardEntry[] = friends.map((friend) => {
    const usernameKey = friend.username?.trim().toLowerCase() ?? '';
    const emailKey = friend.email?.trim().toLowerCase() ?? '';
    const score = scoreByEmail.get(emailKey) ?? scoreByUsername.get(usernameKey) ?? 0;

    return {
      name:
        friend.lastname?.trim() || friend.username?.trim() || friend.email?.trim() || 'Unknown',
      username: usernameKey,
      score
    };
  });

  entries.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  return Response.json({
    updatedAt: Math.floor(Date.now() / 1000),
    entries
  });
}

import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type FriendRow = {
  username: string | null;
  lastname: string | null;
  email: string | null;
};

type LeaderboardRow = {
  username: string | null;
  streak: number | null;
  rank: number | null;
};

type FriendLeaderboardEntry = {
  name: string;
  username: string;
  streakDays: number;
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

  const leaderboardResult = await query<LeaderboardRow>(
    `
      SELECT username, streak, rank
      FROM leaderboard
      WHERE LOWER(username) = ANY($1::text[]);
    `,
    [usernames]
  );

  const leaderboardByUsername = new Map(
    leaderboardResult.rows.map((row) => [
      row.username?.trim().toLowerCase() ?? '',
      {
        streak: Number(row.streak ?? 0),
        rank: Number(row.rank ?? 0)
      }
    ])
  );

  const entries: FriendLeaderboardEntry[] = friends.map((friend) => {
    const username = friend.username?.trim().toLowerCase() ?? '';
    const lb = leaderboardByUsername.get(username);

    return {
      name: friend.lastname?.trim() || friend.username?.trim() || friend.email?.trim() || 'Unknown',
      username,
      streakDays: lb?.streak ?? 0,
      score: lb?.rank ?? 0
    };
  });

  entries.sort((a, b) => {
    const aHasRank = a.score > 0;
    const bHasRank = b.score > 0;
    if (aHasRank !== bHasRank) return aHasRank ? -1 : 1;
    if (aHasRank && bHasRank && a.score !== b.score) return a.score - b.score;
    if (a.streakDays !== b.streakDays) return b.streakDays - a.streakDays;
    return a.name.localeCompare(b.name);
  });

  return Response.json({
    updatedAt: Math.floor(Date.now() / 1000),
    entries
  });
}

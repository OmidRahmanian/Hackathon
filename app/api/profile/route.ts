import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type ProfileRow = {
  id: number;
  email: string | null;
  name: string | null;
  lastname: string | null;
  username: string | null;
};

type ProfileBody = {
  email?: string;
  name?: string;
  bio?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function deriveUsername(email: string) {
  const local = email.split('@')[0]?.trim().toLowerCase() ?? '';
  return local || `user_${Date.now()}`;
}

function toProfilePayload(row: ProfileRow) {
  return {
    email: row.email ?? '',
    name: row.name ?? '',
    bio: row.lastname ?? '',
    username: row.username ?? ''
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawEmail = searchParams.get('email') ?? '';
  const email = normalizeEmail(rawEmail);

  if (!email) {
    return new Response("Missing 'email' query parameter.", { status: 400 });
  }

  const result = await query<ProfileRow>(
    `
      SELECT id, email, name, lastname, username
      FROM users
      WHERE email = $1
      ORDER BY id DESC
      LIMIT 1;
    `,
    [email]
  );

  const row = result.rows[0];
  if (!row) {
    return Response.json({ profile: null }, { status: 404 });
  }

  return Response.json({ profile: toProfilePayload(row) });
}

export async function POST(req: NextRequest) {
  const body: ProfileBody = (await req.json().catch(() => ({}))) ?? {};
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const name = normalizeText(body.name, 100);
  const bio = normalizeText(body.bio, 100);

  if (!email) {
    return new Response("Missing 'email' in request body.", { status: 400 });
  }

  const existing = await query<{ id: number }>(
    'SELECT id FROM users WHERE email = $1 ORDER BY id DESC LIMIT 1;',
    [email]
  );

  let saved: ProfileRow | undefined;
  if (existing.rows[0]) {
    const updated = await query<ProfileRow>(
      `
        UPDATE users
        SET name = $2, lastname = $3
        WHERE id = $1
        RETURNING id, email, name, lastname, username;
      `,
      [existing.rows[0].id, name || null, bio || null]
    );
    saved = updated.rows[0];
  } else {
    const inserted = await query<ProfileRow>(
      `
        INSERT INTO users (it, name, lastname, email, date, username, password)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)
        RETURNING id, email, name, lastname, username;
      `,
      [null, name || null, bio || null, email, deriveUsername(email), 'local']
    );
    saved = inserted.rows[0];
  }

  if (!saved) {
    return new Response('Failed to save profile.', { status: 500 });
  }

  return Response.json({ ok: true, profile: toProfilePayload(saved) });
}

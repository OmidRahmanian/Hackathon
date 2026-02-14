import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type SignUpBody = {
  email?: string;
  password?: string;
};

type UserRow = {
  id: number;
  email: string | null;
  username: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function deriveUsername(email: string) {
  const local = email.split('@')[0]?.trim().toLowerCase() ?? '';
  return local || `user_${Date.now()}`;
}

function hashPassword(password: string) {
  return `sha256:${createHash('sha256').update(password).digest('hex')}`;
}

export async function POST(req: NextRequest) {
  const body: SignUpBody = (await req.json().catch(() => ({}))) ?? {};
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (!email || !password) {
    return new Response("Missing 'email' or 'password'.", { status: 400 });
  }

  const existing = await query<{ id: number }>('SELECT id FROM users WHERE email = $1 LIMIT 1;', [email]);
  if (existing.rows.length > 0) {
    return new Response('Email already exists.', { status: 409 });
  }

  const username = deriveUsername(email);
  const passwordHash = hashPassword(password);

  const inserted = await query<UserRow>(
    `
      INSERT INTO users (it, name, lastname, email, date, username, password)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)
      RETURNING id, email, username;
    `,
    [null, null, null, email, username, passwordHash]
  );

  if (inserted.rows.length === 0) {
    return new Response('Failed to create account.', { status: 500 });
  }

  return Response.json({ ok: true, user: inserted.rows[0] });
}

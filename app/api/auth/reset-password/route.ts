import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type ResetPasswordBody = {
  email?: string;
  password?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hashPassword(password: string) {
  return `sha256:${createHash('sha256').update(password).digest('hex')}`;
}

export async function POST(req: NextRequest) {
  const body: ResetPasswordBody = (await req.json().catch(() => ({}))) ?? {};
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (!email || !password) {
    return new Response("Missing 'email' or 'password'.", { status: 400 });
  }

  const existing = await query<{ id: number }>(
    'SELECT id FROM users WHERE email = $1 LIMIT 1;',
    [email]
  );
  if (existing.rows.length === 0) {
    return new Response('Account not found.', { status: 404 });
  }

  const passwordHash = hashPassword(password);
  const updated = await query<{ id: number; email: string | null }>(
    'UPDATE users SET password = $2 WHERE email = $1 RETURNING id, email;',
    [email, passwordHash]
  );

  if (updated.rows.length === 0) {
    return new Response('Failed to reset password.', { status: 500 });
  }

  return Response.json({ ok: true, user: updated.rows[0] });
}


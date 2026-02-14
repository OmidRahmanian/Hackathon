import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type LoginBody = {
  email?: string;
  password?: string;
};

type UserRow = {
  id: number;
  email: string | null;
  username: string | null;
  password: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hashPassword(password: string) {
  return `sha256:${createHash('sha256').update(password).digest('hex')}`;
}

function passwordMatches(input: string, stored: string | null) {
  if (!stored) return false;
  if (stored.startsWith('sha256:')) {
    return stored === hashPassword(input);
  }
  return stored === input;
}

export async function POST(req: NextRequest) {
  const body: LoginBody = (await req.json().catch(() => ({}))) ?? {};
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return new Response("Missing 'email' or 'password'.", { status: 400 });
  }

  const result = await query<UserRow>(
    'SELECT id, email, username, password FROM users WHERE email = $1 LIMIT 1;',
    [email]
  );

  const user = result.rows[0];
  if (!user || !passwordMatches(password, user.password)) {
    return new Response('Invalid email or password.', { status: 401 });
  }

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username
    }
  });
}

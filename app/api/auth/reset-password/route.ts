import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type ResetPasswordBody = {
  action?: 'verify-current' | 'change-password';
  email?: string;
  currentPassword?: string;
  newPassword?: string;
};

type UserPasswordRow = {
  id: number;
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
  const body: ResetPasswordBody = (await req.json().catch(() => ({}))) ?? {};
  const action = body.action;
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!email) {
    return new Response("Missing 'email'.", { status: 400 });
  }

  const existing = await query<UserPasswordRow>(
    'SELECT id, password FROM users WHERE email = $1 LIMIT 1;',
    [email]
  );
  const user = existing.rows[0];
  if (!user) {
    return new Response('Account not found.', { status: 404 });
  }

  if (action === 'verify-current') {
    if (!currentPassword) {
      return new Response("Missing 'currentPassword'.", { status: 400 });
    }

    if (!passwordMatches(currentPassword, user.password)) {
      return new Response('Current password is incorrect.', { status: 401 });
    }

    return Response.json({ ok: true });
  }

  if (action === 'change-password') {
    if (!currentPassword || !newPassword) {
      return new Response("Missing 'currentPassword' or 'newPassword'.", { status: 400 });
    }

    if (!passwordMatches(currentPassword, user.password)) {
      return new Response('Current password is incorrect.', { status: 401 });
    }

    const updated = await query<{ id: number; email: string | null }>(
      'UPDATE users SET password = $2 WHERE email = $1 RETURNING id, email;',
      [email, hashPassword(newPassword)]
    );

    if (updated.rows.length === 0) {
      return new Response('Failed to change password.', { status: 500 });
    }

    return Response.json({ ok: true, user: updated.rows[0] });
  }

  return new Response("Invalid action. Use 'verify-current' or 'change-password'.", {
    status: 400
  });
}

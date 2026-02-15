import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type PasswordBody = {
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
  const body: PasswordBody = (await req.json().catch(() => ({}))) ?? {};
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!email || !currentPassword || !newPassword) {
    return new Response("Missing 'email', 'currentPassword', or 'newPassword'.", {
      status: 400
    });
  }

  if (newPassword.length < 6) {
    return new Response('New password must be at least 6 characters.', {
      status: 400
    });
  }

  if (newPassword === currentPassword) {
    return new Response('New password must be different from current password.', {
      status: 400
    });
  }

  const existing = await query<UserPasswordRow>(
    `
      SELECT id, password
      FROM users
      WHERE LOWER(email) = $1
      ORDER BY id DESC
      LIMIT 1;
    `,
    [email]
  );

  const user = existing.rows[0];
  if (!user) {
    return new Response('Account not found.', { status: 404 });
  }

  if (!passwordMatches(currentPassword, user.password)) {
    return new Response('Current password is incorrect.', { status: 401 });
  }

  const nextPasswordHash = hashPassword(newPassword);
  const updated = await query<{ id: number }>(
    `
      UPDATE users
      SET password = $2
      WHERE id = $1
      RETURNING id;
    `,
    [user.id, nextPasswordHash]
  );

  if (!updated.rows[0]) {
    return new Response('Failed to update password.', { status: 500 });
  }

  return Response.json({ ok: true });
}

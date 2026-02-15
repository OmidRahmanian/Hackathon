// Database helper aligned with provided PostgreSQL schema.
// Uses safe fallbacks on errors to avoid crashing routes.

import { Pool, type QueryResultRow } from "pg";

export type EventType =
  | "SESSION_START"
  | "SESSION_STOP"
  | "BAD_POSTURE"
  | "TOO_CLOSE"
  | "ACTIVITY_SET";

export type HistoryRow = {
  session_id: number;
  user_id: number;
  start_date: Date | string | null;
  end_date: Date | string | null;
  topic: string | null;
  bad_pos: number | null;
  too_close_count: number | null;
  session_time_minutes: number | null;
};

export type StreakRow = {
  id: number;
  streak_id: number;
  strict_count: number | null;
  score: number | null;
};

export type AdviceRow = {
  id: number;
  advice_id: number;
  explain: string | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
};

export type LeaderboardRow = {
  username: string | null;
  score: number | null;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  try {
    const result = await pool.query<T>(text, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } catch (err) {
    console.error("DB error:", err);
    return { rows: [], rowCount: 0 };
  }
}

function toUserIdFallback(userId: string) {
  // Stable numeric hash that fits INT.
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 1000000000;
  }
  return Math.abs(hash) || 1;
}

async function resolveHistoryUserId(userId: string) {
  const normalized = userId.trim().toLowerCase();
  if (normalized.includes("@")) {
    const user = await query<{ id: number | null }>(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = $1
        ORDER BY id DESC
        LIMIT 1;
      `,
      [normalized]
    );
    const dbUserId = Number(user.rows[0]?.id ?? 0);
    if (dbUserId > 0) return dbUserId;
  }

  return toUserIdFallback(normalized || userId);
}

async function recomputeAndPersistUserScore(userId: string, historyUserId: number) {
  const email = userId.trim().toLowerCase();
  if (!email || !email.includes("@")) return;

  const totals = await query<{
    total_minutes: number | null;
    bad_total: number | null;
    too_close_total: number | null;
  }>(
    `
      SELECT
        COALESCE(SUM(session_time_minutes), 0)::INT AS total_minutes,
        COALESCE(SUM(bad_pos), 0)::INT AS bad_total,
        COALESCE(SUM(too_close_count), 0)::INT AS too_close_total
      FROM history
      WHERE user_id = $1;
    `,
    [historyUserId]
  );

  const row = totals.rows[0];
  const totalMinutes = Number(row?.total_minutes ?? 0);
  const badTotal = Number(row?.bad_total ?? 0);
  const tooCloseTotal = Number(row?.too_close_total ?? 0);
  const nextScore = Math.max(0, 2 * totalMinutes - 5 * (badTotal + tooCloseTotal));

  await query(
    `
      UPDATE users
      SET score = $2
      WHERE LOWER(email) = $1;
    `,
    [email, nextScore]
  );
}

export async function insertHistoryEvent(params: {
  userId: string;
  type: EventType;
  ts: number;
  activity?: string;
}): Promise<HistoryRow | null> {
  const historyUserId = await resolveHistoryUserId(params.userId);
  const ts = params.ts;
  const topic = params.activity ?? null;

  let badPosInc = 0;
  let tooCloseInc = 0;

  if (params.type === "BAD_POSTURE") {
    badPosInc = 1;
  } else if (params.type === "TOO_CLOSE") {
    tooCloseInc = 1;
  }

  const findActiveSession = async () =>
    query<HistoryRow>(
      `
      SELECT *
      FROM history
      WHERE user_id = $1 AND end_date IS NULL
      ORDER BY start_date DESC NULLS LAST, session_id DESC
      LIMIT 1;
      `,
      [historyUserId]
    );

  const createSession = async () =>
    query<HistoryRow>(
      `
      INSERT INTO history (
        user_id,
        start_date,
        end_date,
        topic,
        bad_pos,
        too_close_count
      )
      VALUES ($1, to_timestamp($2), NULL, $3, 0, 0)
      RETURNING *;
      `,
      [historyUserId, ts, topic]
    );

  if (params.type === "SESSION_START") {
    // Close orphan open sessions first, then create a fresh session row.
    await query(
      `
      UPDATE history
      SET end_date = to_timestamp($2)
      WHERE user_id = $1 AND end_date IS NULL;
      `,
      [historyUserId, ts]
    );

    const created = await createSession();
    const saved = created.rows[0] ?? null;
    if (saved) {
      await recomputeAndPersistUserScore(params.userId, historyUserId);
    }
    return saved;
  }

  let target = await findActiveSession();

  if (!target.rows[0] && params.type === "SESSION_STOP") {
    const latest = await query<HistoryRow>(
      `
      SELECT *
      FROM history
      WHERE user_id = $1
      ORDER BY start_date DESC NULLS LAST, session_id DESC
      LIMIT 1;
      `,
      [historyUserId]
    );

    if (!latest.rows[0]) return null;

    const closed = await query<HistoryRow>(
      `
      UPDATE history
      SET end_date = COALESCE(end_date, to_timestamp($2)),
          topic = COALESCE($3, topic)
      WHERE session_id = $1
      RETURNING *;
      `,
      [latest.rows[0].session_id, ts, topic]
    );

    const saved = closed.rows[0] ?? latest.rows[0];
    await recomputeAndPersistUserScore(params.userId, historyUserId);
    return saved;
  }

  if (!target.rows[0]) {
    // If event arrives without explicit SESSION_START, bootstrap a session row.
    target = await createSession();
  }

  const targetRow = target.rows[0];
  if (!targetRow) return null;

  const res = await query<HistoryRow>(
    `
    UPDATE history
    SET
      end_date = CASE
        WHEN $2::boolean THEN to_timestamp($3)
        ELSE end_date
      END,
      topic = COALESCE($4, topic),
      bad_pos = COALESCE(bad_pos, 0) + $5,
      too_close_count = COALESCE(too_close_count, 0) + $6
    WHERE session_id = $1
    RETURNING *;
  `,
    [
      targetRow.session_id,
      params.type === "SESSION_STOP",
      ts,
      topic,
      badPosInc,
      tooCloseInc
    ]
  );

  const saved = res.rows[0] ?? targetRow;
  await recomputeAndPersistUserScore(params.userId, historyUserId);
  return saved;
}

export async function getUserHistory(
  userId: string,
  fromTs?: number,
  toTs?: number
): Promise<HistoryRow[]> {
  const historyUserId = await resolveHistoryUserId(userId);
  const where: string[] = ["user_id = $1"];
  const params: unknown[] = [historyUserId];
  if (fromTs !== undefined) {
    params.push(fromTs);
    where.push(`start_date >= to_timestamp($${params.length})`);
  }
  if (toTs !== undefined) {
    params.push(toTs);
    where.push(`start_date <= to_timestamp($${params.length})`);
  }

  const res = await query<HistoryRow>(
    `SELECT * FROM history WHERE ${where.join(" AND ")} ORDER BY start_date ASC;`,
    params
  );
  return res.rows;
}

export async function getUserScore(userId: string): Promise<number> {
  const email = userId.trim().toLowerCase();
  if (!email || !email.includes("@")) return 0;

  const res = await query<{ score: number | null }>(
    `
      SELECT score
      FROM users
      WHERE LOWER(email) = $1
      ORDER BY id DESC
      LIMIT 1;
    `,
    [email]
  );

  return Number(res.rows[0]?.score ?? 0);
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const res = await query<LeaderboardRow>(
    `
      SELECT username, score
      FROM users
      WHERE username IS NOT NULL
      ORDER BY score DESC, id ASC
      LIMIT 200;
    `
  );
  return res.rows;
}

export async function getUserStreak(userId: string): Promise<StreakRow | null> {
  // Schema lacks user linkage; return latest streak as best-effort.
  const res = await query<StreakRow>(
    "SELECT * FROM streak ORDER BY streak_id DESC LIMIT 1;"
  );
  return res.rows[0] ?? null;
}

export async function getAdvice(): Promise<AdviceRow[]> {
  const res = await query<AdviceRow>("SELECT * FROM advice ORDER BY advice_id DESC;");
  return res.rows;
}

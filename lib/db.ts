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

export type CoachChatHistoryRow = {
  id: number;
  user_id: number | null;
  user_identifier: string;
  question: string;
  answer: string;
  model: string | null;
  used_fallback: boolean;
  created_at: Date | string | null;
};

export type UserProfileRow = {
  id: number;
  name: string | null;
  lastname: string | null;
  email: string | null;
  username: string | null;
  score: number | null;
};

export type CoachWeeklyRecommendationRow = {
  id: number;
  user_id: number | null;
  user_identifier: string;
  recommendation: string;
  model: string | null;
  source_latest_data_at: Date | string | null;
  generated_at: Date | string | null;
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
  const qualityFailures = badTotal + 2 * tooCloseTotal;
  const rawScore =
    20 + 80 * (1 - Math.exp(-totalMinutes / 220)) - 0.7 * qualityFailures;
  const nextScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  await query(
    `
      UPDATE users
      SET score = $2
      WHERE LOWER(email) = $1;
    `,
    [email, nextScore]
  );
}

let coachChatTableInit: Promise<void> | null = null;

async function ensureCoachChatHistoryTable() {
  if (!coachChatTableInit) {
    coachChatTableInit = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS coach_chat_history (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE SET NULL,
          user_identifier VARCHAR(255) NOT NULL,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          model VARCHAR(100),
          used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_coach_chat_history_user_identifier_created_at
        ON coach_chat_history (user_identifier, created_at DESC);
      `);
    })();
  }

  await coachChatTableInit;
}

function normalizeCoachUserIdentifier(value?: string) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized || "demo";
}

async function resolveCoachUserRowId(userIdentifier: string): Promise<number | null> {
  if (!userIdentifier.includes("@")) return null;

  const user = await query<{ id: number | null }>(
    `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1
      ORDER BY id DESC
      LIMIT 1;
    `,
    [userIdentifier]
  );

  const id = Number(user.rows[0]?.id ?? 0);
  return id > 0 ? id : null;
}

export async function saveCoachChatMessage(params: {
  userId?: string;
  question: string;
  answer: string;
  model?: string;
  usedFallback?: boolean;
}): Promise<CoachChatHistoryRow | null> {
  try {
    await ensureCoachChatHistoryTable();

    const userIdentifier = normalizeCoachUserIdentifier(params.userId);
    const userRowId = await resolveCoachUserRowId(userIdentifier);

    const inserted = await query<CoachChatHistoryRow>(
      `
        INSERT INTO coach_chat_history (
          user_id,
          user_identifier,
          question,
          answer,
          model,
          used_fallback
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `,
      [
        userRowId,
        userIdentifier,
        params.question,
        params.answer,
        params.model ?? null,
        Boolean(params.usedFallback),
      ]
    );

    return inserted.rows[0] ?? null;
  } catch (error) {
    console.error("DB coach history save failed:", error);
    return null;
  }
}

let coachWeeklyTableInit: Promise<void> | null = null;

async function ensureCoachWeeklyRecommendationTable() {
  if (!coachWeeklyTableInit) {
    coachWeeklyTableInit = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS coach_weekly_recommendations (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE SET NULL,
          user_identifier VARCHAR(255) NOT NULL UNIQUE,
          recommendation TEXT NOT NULL,
          model VARCHAR(100),
          source_latest_data_at TIMESTAMP,
          generated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_coach_weekly_recommendations_user_identifier
        ON coach_weekly_recommendations (user_identifier);
      `);
    })();
  }

  await coachWeeklyTableInit;
}

export async function getUserProfileForCoach(userId?: string): Promise<UserProfileRow | null> {
  const identifier = normalizeCoachUserIdentifier(userId);
  const params: unknown[] = [identifier];

  const where = identifier.includes("@")
    ? "LOWER(email) = $1"
    : "LOWER(username) = $1";

  const user = await query<UserProfileRow>(
    `
      SELECT id, name, lastname, email, username, score
      FROM users
      WHERE ${where}
      ORDER BY id DESC
      LIMIT 1;
    `,
    params
  );

  return user.rows[0] ?? null;
}

export async function getLatestCoachWeeklyRecommendation(
  userId?: string
): Promise<CoachWeeklyRecommendationRow | null> {
  await ensureCoachWeeklyRecommendationTable();
  const identifier = normalizeCoachUserIdentifier(userId);

  const rec = await query<CoachWeeklyRecommendationRow>(
    `
      SELECT *
      FROM coach_weekly_recommendations
      WHERE user_identifier = $1
      LIMIT 1;
    `,
    [identifier]
  );

  return rec.rows[0] ?? null;
}

export async function upsertCoachWeeklyRecommendation(params: {
  userId?: string;
  recommendation: string;
  model?: string;
  sourceLatestDataAt?: Date | string | null;
}): Promise<CoachWeeklyRecommendationRow | null> {
  try {
    await ensureCoachWeeklyRecommendationTable();

    const identifier = normalizeCoachUserIdentifier(params.userId);
    const userRowId = await resolveCoachUserRowId(identifier);
    const sourceLatestDataAt = params.sourceLatestDataAt ?? null;

    const saved = await query<CoachWeeklyRecommendationRow>(
      `
        INSERT INTO coach_weekly_recommendations (
          user_id,
          user_identifier,
          recommendation,
          model,
          source_latest_data_at,
          generated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_identifier)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          recommendation = EXCLUDED.recommendation,
          model = EXCLUDED.model,
          source_latest_data_at = EXCLUDED.source_latest_data_at,
          generated_at = NOW()
        RETURNING *;
      `,
      [
        userRowId,
        identifier,
        params.recommendation,
        params.model ?? null,
        sourceLatestDataAt,
      ]
    );

    return saved.rows[0] ?? null;
  } catch (error) {
    console.error("DB weekly recommendation save failed:", error);
    return null;
  }
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

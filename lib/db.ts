// Database helper aligned with provided PostgreSQL schema.
// Uses safe fallbacks on errors to avoid crashing routes.

import { Pool } from "pg";

export type EventType =
  | "SESSION_START"
  | "SESSION_STOP"
  | "BAD_POSTURE"
  | "TOO_CLOSE"
  | "ACTIVITY_SET";

export type HistoryRow = {
  id: number;
  history_id: number;
  start_date: Date | string | null;
  end_date: Date | string | null;
  topic: string | null;
  bad_pos: number | null;
  streak_count: boolean | null;
  score: number | null;
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
  username: string;
  date_register: Date | string | null;
  streak: number | null;
  rank: number | null;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T = any>(text: string, params?: any[]) {
  try {
    return await pool.query<T>(text, params);
  } catch (err) {
    console.error("DB error:", err);
    return { rows: [] as T[], rowCount: 0 };
  }
}

function toHistoryId(userId: string) {
  // Stable numeric hash that fits INT.
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 1000000000;
  }
  return Math.abs(hash) || 1;
}

export async function insertHistoryEvent(params: {
  userId: string;
  type: EventType;
  ts: number;
  activity?: string;
}): Promise<HistoryRow | null> {
  const historyId = toHistoryId(params.userId);
  const ts = params.ts;
  const topic = params.activity ?? null;

  let badPosInc = 0;
  let scoreInc = 0;
  let streakCount: boolean | null = null;

  if (params.type === "BAD_POSTURE") {
    badPosInc = 1;
    scoreInc = 1; // TODO: confirm scoring rule for bad posture.
  } else if (params.type === "TOO_CLOSE") {
    scoreInc = 1;
    streakCount = true; // TODO: verify desired streak flag behavior.
  }

  const res = await query<HistoryRow>(
    `
    INSERT INTO history (history_id, start_date, end_date, topic, bad_pos, streak_count, score)
    VALUES ($1, to_timestamp($2), to_timestamp($2), $3, $4, $5, $6)
    ON CONFLICT (history_id) DO UPDATE SET
      end_date = GREATEST(history.end_date, EXCLUDED.end_date),
      topic = COALESCE(EXCLUDED.topic, history.topic),
      bad_pos = COALESCE(history.bad_pos, 0) + COALESCE(EXCLUDED.bad_pos, 0),
      streak_count = COALESCE(EXCLUDED.streak_count, history.streak_count),
      score = COALESCE(history.score, 0) + COALESCE(EXCLUDED.score, 0)
    RETURNING *;
  `,
    [historyId, ts, topic, badPosInc, streakCount, scoreInc]
  );

  if (res.rows.length === 0) return null;

  // SESSION_START updates earliest start; SESSION_STOP extends end date.
  if (params.type === "SESSION_START" || params.type === "SESSION_STOP") {
    const startUpdater =
      params.type === "SESSION_START"
        ? "start_date = LEAST(start_date, to_timestamp($2))"
        : "end_date = GREATEST(end_date, to_timestamp($2))";

    const adjust = await query<HistoryRow>(
      `UPDATE history SET ${startUpdater} WHERE history_id = $1 RETURNING *;`,
      [historyId, ts]
    );
    if (adjust.rows.length > 0) {
      return adjust.rows[0];
    }
  }

  return res.rows[0];
}

export async function getUserHistory(
  userId: string,
  fromTs?: number,
  toTs?: number
): Promise<HistoryRow[]> {
  const historyId = toHistoryId(userId);
  const where: string[] = ["history_id = $1"];
  const params: any[] = [historyId];
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

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const res = await query<LeaderboardRow>(
    "SELECT username, date_register, streak, rank FROM leaderboard ORDER BY rank ASC;"
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

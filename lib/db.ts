// Placeholder DB layer aligned with provided schema.
// TODO: replace in-memory mocks with real database client calls.

export type EventType =
  | "SESSION_START"
  | "SESSION_STOP"
  | "BAD_POSTURE"
  | "TOO_CLOSE"
  | "ACTIVITY_SET";

export type HistoryRow = {
  id: string;
  history_id: string;
  userId: string;
  start_dt: number;
  end_dt?: number;
  topic?: string;
  bad_pos: number;
  score: number;
};

export type StreakRow = {
  id: string;
  streak_id: string;
  userId: string;
  start_date: string;
  end_date?: string;
  streak_fl: boolean;
  score: number;
};

export type AdviceRow = {
  id: string;
  advice_id: string;
  userId?: string;
  explain: string;
  topic?: string;
};

export type LeaderboardRow = {
  username: string;
  date_register: string;
  streak: number;
  rank: number;
};

const historyStore: HistoryRow[] = [];
const streakStore: StreakRow[] = [];
const adviceStore: AdviceRow[] = [];
const leaderboardStore: LeaderboardRow[] = [
  { username: "Gigi", date_register: new Date().toISOString(), streak: 3, rank: 1 },
  { username: "Sahand", date_register: new Date().toISOString(), streak: 2, rank: 2 },
  { username: "Omid", date_register: new Date().toISOString(), streak: 1, rank: 3 },
];

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getUserHistory(
  userId: string,
  fromTs?: number,
  toTs?: number
): Promise<HistoryRow[]> {
  try {
    return historyStore.filter((row) => {
      const withinFrom = fromTs === undefined || row.start_dt >= fromTs;
      const withinTo = toTs === undefined || row.start_dt <= toTs;
      return row.userId === userId && withinFrom && withinTo;
    });
  } catch (error) {
    console.error("getUserHistory failed", error);
    return [];
  }
}

export async function insertHistoryEvent(params: {
  userId: string;
  type: EventType;
  ts: number;
  activity?: string;
}): Promise<HistoryRow | null> {
  try {
    const { userId, type, ts, activity } = params;

    // Simplistic upsert: use latest record for the user.
    let record =
      historyStore
        .filter((row) => row.userId === userId)
        .sort((a, b) => b.start_dt - a.start_dt)[0] ?? null;

    if (!record) {
      record = {
        id: generateId("hist"),
        history_id: generateId("hid"),
        userId,
        start_dt: ts,
        end_dt: ts,
        topic: activity,
        bad_pos: 0,
        score: 0,
      };
      historyStore.push(record);
    } else {
      record.end_dt = ts;
    }

    if (type === "BAD_POSTURE") {
      record.bad_pos += 1;
    } else if (type === "TOO_CLOSE") {
      record.score += 1; // Treat score as too-close counter for now.
    } else if (type === "ACTIVITY_SET") {
      record.topic = activity ?? record.topic;
    } else if (type === "SESSION_START") {
      record.start_dt = Math.min(record.start_dt, ts);
    } else if (type === "SESSION_STOP") {
      record.end_dt = ts;
    }

    return record;
  } catch (error) {
    console.error("insertHistoryEvent failed", error);
    return null;
  }
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  try {
    return leaderboardStore.sort((a, b) => a.rank - b.rank);
  } catch (error) {
    console.error("getLeaderboard failed", error);
    return [];
  }
}

export async function getUserStreak(userId: string): Promise<StreakRow | null> {
  try {
    return (
      streakStore
        .filter((row) => row.userId === userId)
        .sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
    );
  } catch (error) {
    console.error("getUserStreak failed", error);
    return null;
  }
}

export async function getAdvice(userId: string): Promise<AdviceRow[]> {
  try {
    return adviceStore.filter((row) => !row.userId || row.userId === userId);
  } catch (error) {
    console.error("getAdvice failed", error);
    return [];
  }
}

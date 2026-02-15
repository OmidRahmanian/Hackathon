import type { NextRequest } from "next/server";
import { getUserHistory, getUserScore } from "@/lib/db";

export const runtime = "nodejs";

const DAY_SECONDS = 24 * 60 * 60;
const WEEK_SECONDS = 7 * DAY_SECONDS;

type RangeType = "day" | "week";

function toEpochSeconds(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

function getSessionMinutes(
  row: {
    session_time_minutes: number | null;
    start_date: Date | string | null;
    end_date: Date | string | null;
  },
  nowTs: number
) {
  if (typeof row.session_time_minutes === "number" && Number.isFinite(row.session_time_minutes)) {
    return Math.max(0, row.session_time_minutes);
  }

  const startTs = toEpochSeconds(row.start_date);
  if (startTs === null) return 0;

  const endTs = toEpochSeconds(row.end_date) ?? nowTs;
  return Math.max(0, Math.floor((endTs - startTs) / 60));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "demo";
  const rangeParam = searchParams.get("range");
  const range: RangeType = rangeParam === "week" ? "week" : "day";

  const toTs = Math.floor(Date.now() / 1000);
  const windowSize = range === "day" ? DAY_SECONDS : WEEK_SECONDS;
  const fromTs = toTs - windowSize;

  const history = await getUserHistory(userId, fromTs, toTs);
  const userScore = await getUserScore(userId);

  const badPostureCount = history.reduce((sum, row) => sum + (row.bad_pos ?? 0), 0);
  const tooCloseCount = history.reduce((sum, row) => sum + (row.too_close_count ?? 0), 0);
  const userFailureCount = badPostureCount + tooCloseCount;
  const scoreAverage = history.length > 0 ? tooCloseCount / history.length : 0;

  const activityBreakdownRaw = history.reduce<Record<string, number>>((acc, row) => {
    if (row.topic) {
      const minutes = getSessionMinutes(row, toTs);
      acc[row.topic] = (acc[row.topic] ?? 0) + minutes / 60;
    }
    return acc;
  }, {});
  const activityBreakdown = Object.fromEntries(
    Object.entries(activityBreakdownRaw).map(([topic, hours]) => [topic, Number(hours.toFixed(2))])
  );

  const response = {
    userId,
    timeRange: { from: fromTs, to: toTs },
    range,
    userScore,
    userFailureCount,
    badPostureCount,
    tooCloseCount,
    scoreAverage,
    activityBreakdown,
    // Back-compat keys (legacy clients expect these):
    totals: { badPostureCount, tooCloseCount },
    buckets: [], // TODO: optionally add buckets with SQL date_trunc if needed.
    activity: { activitySwitches: activityBreakdown },
  };

  return Response.json(response);
}

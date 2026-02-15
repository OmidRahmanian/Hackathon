import type { NextRequest } from "next/server";
import { getUserHistory, getUserScore } from "@/lib/db";

export const runtime = "nodejs";

const DAY_SECONDS = 24 * 60 * 60;
const WEEK_SECONDS = 7 * DAY_SECONDS;

type RangeType = "day" | "week";

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
  const scoreAverage = history.length > 0 ? tooCloseCount / history.length : 0;

  const activityBreakdown = history.reduce<Record<string, number>>((acc, row) => {
    if (row.topic) {
      acc[row.topic] = (acc[row.topic] ?? 0) + 1;
    }
    return acc;
  }, {});

  const response = {
    userId,
    timeRange: { from: fromTs, to: toTs },
    range,
    userScore,
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

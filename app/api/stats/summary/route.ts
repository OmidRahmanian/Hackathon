import type { NextRequest } from "next/server";
import { getEvents, type PostureEvent } from "@/lib/store/memoryStore";

export const runtime = "nodejs";

const DAY_SECONDS = 24 * 60 * 60;
const WEEK_SECONDS = 7 * DAY_SECONDS;

type RangeType = "day" | "week";

type DayBucket = { hour: number; badPostureCount: number; tooCloseCount: number };
type WeekBucket = { date: string; badPostureCount: number; tooCloseCount: number };

function formatDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildDayBuckets(): DayBucket[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    badPostureCount: 0,
    tooCloseCount: 0,
  }));
}

function buildWeekBuckets(anchor: Date): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    buckets.push({
      date: formatDateLocal(d),
      badPostureCount: 0,
      tooCloseCount: 0,
    });
  }
  return buckets;
}

function processEvents(
  events: PostureEvent[],
  range: RangeType,
  toTs: number
): {
  totals: { badPostureCount: number; tooCloseCount: number };
  buckets: DayBucket[] | WeekBucket[];
  activitySwitches: Record<string, number>;
} {
  const totals = { badPostureCount: 0, tooCloseCount: 0 };
  const toDate = new Date(toTs * 1000);
  const dayBuckets = buildDayBuckets();
  const weekBuckets = buildWeekBuckets(toDate);
  const activitySwitches: Record<string, number> = {};

  for (const evt of events) {
    const date = new Date(evt.ts * 1000);

    if (evt.type === "BAD_POSTURE") {
      totals.badPostureCount += 1;
      if (range === "day") {
        dayBuckets[date.getHours()].badPostureCount += 1;
      } else {
        const key = formatDateLocal(date);
        const bucket = weekBuckets.find((b) => b.date === key);
        if (bucket) bucket.badPostureCount += 1;
      }
    } else if (evt.type === "TOO_CLOSE") {
      totals.tooCloseCount += 1;
      if (range === "day") {
        dayBuckets[date.getHours()].tooCloseCount += 1;
      } else {
        const key = formatDateLocal(date);
        const bucket = weekBuckets.find((b) => b.date === key);
        if (bucket) bucket.tooCloseCount += 1;
      }
    } else if (evt.type === "ACTIVITY_SET") {
      const name =
        typeof evt.activity === "string" && evt.activity.trim().length > 0
          ? evt.activity
          : "unknown";
      activitySwitches[name] = (activitySwitches[name] ?? 0) + 1;
    }
  }

  return {
    totals,
    buckets: range === "day" ? dayBuckets : weekBuckets,
    activitySwitches,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "demo";
  const rangeParam = searchParams.get("range");
  const range: RangeType = rangeParam === "week" ? "week" : "day";

  const toTs = Math.floor(Date.now() / 1000);
  const windowSize = range === "day" ? DAY_SECONDS : WEEK_SECONDS;
  const fromTs = toTs - windowSize;

  const events = getEvents({ userId, fromTs, toTs });
  const processed = processEvents(events, range, toTs);

  return Response.json({
    userId,
    range,
    fromTs,
    toTs,
    totals: processed.totals,
    buckets: processed.buckets,
    activity: {
      activitySwitches: processed.activitySwitches,
    },
  });
}

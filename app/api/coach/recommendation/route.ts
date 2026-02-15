import type { NextRequest } from "next/server";
import {
  getLatestCoachWeeklyRecommendation,
  getUserHistory,
  getUserProfileForCoach,
  type HistoryRow,
  upsertCoachWeeklyRecommendation,
} from "@/lib/db";

export const runtime = "nodejs";

const DEFAULT_LLM_URL = "http://127.0.0.1:11434";
const DEFAULT_LLM_MODEL = "llama3.2";
const LOCALHOST_URL_ONLY_PATTERN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
}

function getLatestHistoryDate(history: HistoryRow[]) {
  let latest: Date | null = null;

  for (const row of history) {
    const candidate = parseDate(row.end_date) ?? parseDate(row.start_date);
    if (!candidate) continue;
    if (!latest || candidate.getTime() > latest.getTime()) {
      latest = candidate;
    }
  }

  return latest;
}

function isInvalidModelContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (LOCALHOST_URL_ONLY_PATTERN.test(trimmed)) return true;

  const lower = trimmed.toLowerCase();
  return lower.startsWith("<!doctype html") || lower.startsWith("<html");
}

function normalizeUserIdentifier(req: NextRequest) {
  const queryUserId = req.nextUrl.searchParams.get("userId");
  const headerUserId = req.headers.get("x-user-email") || req.headers.get("x-user-id");
  const candidate = (queryUserId ?? headerUserId ?? "demo").trim().toLowerCase();
  return candidate || "demo";
}

function toDisplayName(
  profile: {
    name: string | null;
    lastname: string | null;
    username: string | null;
    email: string | null;
  } | null,
  fallbackUserId: string
) {
  const fullName = [profile?.name, profile?.lastname].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (profile?.username) return profile.username;
  if (profile?.email) return profile.email;
  return fallbackUserId;
}

function buildFallbackRecommendation(
  displayName: string,
  totalBadPos: number,
  totalTooClose: number
) {
  if (totalTooClose > totalBadPos) {
    return `Weekly Recommendation for ${displayName}: Daily 20-minute brisk walk after lunch. Keep your monitor at arm's length and follow the 20-20-20 eye rule to reduce too-close events.`;
  }

  return `Weekly Recommendation for ${displayName}: Do 2 sets of 10 bodyweight squats every day (morning and evening). Pair this with a posture reset every 25 minutes: shoulders back, chin neutral, feet grounded.`;
}

async function callLocalModel(prompt: string) {
  const baseUrl = process.env.LOCAL_LLM_URL || DEFAULT_LLM_URL;
  const model = process.env.LOCAL_LLM_MODEL || DEFAULT_LLM_MODEL;
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a data-aware posture and wellness assistant. Return exactly one practical weekly recommendation focused on either one exercise, one activity, or one diet action.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
        options: {
          num_predict: 160,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Local LLM responded with status ${response.status}`);
    }

    const data = (await response.json()) as {
      message?: { content?: unknown };
    };

    const content = data?.message?.content;
    if (typeof content === "string" && !isInvalidModelContent(content)) {
      return content.trim();
    }

    throw new Error("Invalid model payload");
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const userId = normalizeUserIdentifier(req);

  try {
    const [profile, history, existing] = await Promise.all([
      getUserProfileForCoach(userId),
      getUserHistory(userId),
      getLatestCoachWeeklyRecommendation(userId),
    ]);

    if (!history.length) {
      return Response.json({
        ok: true,
        userId,
        hasData: false,
        updated: false,
        recommendation:
          "No monitoring data yet. Start your first session to receive a weekly recommendation.",
        generatedAt: existing?.generated_at ?? null,
      });
    }

    const latestHistoryDate = getLatestHistoryDate(history);
    const existingSourceDate = parseDate(existing?.source_latest_data_at ?? null);
    const shouldRegenerate =
      !existing ||
      !existingSourceDate ||
      !latestHistoryDate ||
      latestHistoryDate.getTime() - existingSourceDate.getTime() >= WEEK_MS;

    if (!shouldRegenerate && existing) {
      return Response.json({
        ok: true,
        userId,
        hasData: true,
        updated: false,
        recommendation: existing.recommendation,
        generatedAt: existing.generated_at,
      });
    }

    const displayName = toDisplayName(profile, userId);
    const recentHistory = history.slice(-12).map((row) => ({
      start_date: row.start_date,
      end_date: row.end_date,
      topic: row.topic,
      bad_pos: row.bad_pos ?? 0,
      too_close_count: row.too_close_count ?? 0,
      session_time_minutes: row.session_time_minutes ?? null,
    }));

    const totalBadPos = history.reduce((sum, row) => sum + (row.bad_pos ?? 0), 0);
    const totalTooClose = history.reduce(
      (sum, row) => sum + (row.too_close_count ?? 0),
      0
    );

    const prompt = [
      `User profile table row: ${JSON.stringify(profile ?? { userId })}`,
      `History table rows (recent): ${JSON.stringify(recentHistory)}`,
      `This is ${displayName} and is looking for make their posture and fitness better by taking small steps, the bad_pos number is the count of bad posture the user had per session and too_close_count was the number of time they were too close to the monitor.`,
      "Please suggest exercises or activities or diets (one) so they can improve their health.",
      "Return only one concise weekly recommendation in plain text.",
    ].join("\n");

    let recommendation: string;
    try {
      recommendation = await callLocalModel(prompt);
    } catch (error) {
      console.error("Weekly recommendation model call failed:", error);
      recommendation = buildFallbackRecommendation(
        displayName,
        totalBadPos,
        totalTooClose
      );
    }

    const saved = await upsertCoachWeeklyRecommendation({
      userId,
      recommendation,
      model: process.env.LOCAL_LLM_MODEL || DEFAULT_LLM_MODEL,
      sourceLatestDataAt: latestHistoryDate,
    });

    return Response.json({
      ok: true,
      userId,
      hasData: true,
      updated: true,
      recommendation,
      generatedAt: saved?.generated_at ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("Coach weekly recommendation failed:", error);
    return Response.json(
      {
        ok: false,
        userId,
        hasData: false,
        updated: false,
        recommendation:
          "Unable to load weekly recommendation right now. Please try again shortly.",
        generatedAt: null,
      },
      { status: 200 }
    );
  }
}

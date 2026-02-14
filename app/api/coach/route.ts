import type { NextRequest } from "next/server";
import { getAdvice, getUserHistory, getUserStreak } from "@/lib/db";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a supportive posture and ergonomics coach. Keep the tone encouraging and practical. Never give medical diagnoses or claim to treat conditions. Always return three sections in order:
1) What is happening
2) 3 actionable fixes
3) 2-week improvement plan (Week 1, Week 2)`;

type CoachRequestBody = {
  question?: string;
  summary?: unknown;
};

const DEFAULT_LLM_URL = "http://127.0.0.1:11434";
const DEFAULT_LLM_MODEL = "llama3.2";
const WEEK_SECONDS = 7 * 24 * 60 * 60;

function formatSummary(summary: unknown): { text: string; parts: string[] } {
  if (typeof summary === "string") {
    const trimmed = summary.trim();
    return { text: trimmed || "Not provided.", parts: [] };
  }

  if (summary && typeof summary === "object") {
    const parts: string[] = [];
    const record = summary as Record<string, unknown>;

    if (typeof record.bad_posture === "number") {
      parts.push(`Bad posture (7d): ${record.bad_posture}`);
    }
    if (typeof record.score === "number") {
      parts.push(`Average score: ${record.score}`);
    }
    if (typeof record.streak === "object" && record.streak) {
      parts.push("Streak info included");
    }
    if (typeof record.worstPostureType === "string") {
      parts.push(`Most frequent issue: ${record.worstPostureType}`);
    }
    if (typeof record.averageScore === "number") {
      parts.push(`Average posture score: ${record.averageScore}`);
    }
    if (typeof record.tooCloseCount === "number") {
      parts.push(`Times too close to screen: ${record.tooCloseCount}`);
    }

    let text = "Not provided.";
    try {
      text = JSON.stringify(summary, null, 2);
    } catch {
      text = "Summary provided but could not be stringified.";
    }

    return { text, parts };
  }

  return { text: "Not provided.", parts: [] };
}

async function buildHistorySummary(userId: string) {
  const toTs = Math.floor(Date.now() / 1000);
  const fromTs = toTs - WEEK_SECONDS;

  const [history, streak, advice] = await Promise.all([
    getUserHistory(userId, fromTs, toTs),
    getUserStreak(userId),
    getAdvice(),
  ]);

  const bad_posture = history.reduce((sum, row) => sum + (row.bad_pos ?? 0), 0);
  const totalScore = history.reduce((sum, row) => sum + (row.score ?? 0), 0);
  const score = history.length > 0 ? totalScore / history.length : 0;

  const recent_topics = history
    .map((row) => row.topic)
    .filter((t): t is string => !!t)
    .slice(-5)
    .reverse();

  const streakSummary = streak
    ? {
        strict_count: streak.strict_count,
        score: streak.score,
        streak_id: streak.streak_id,
      }
    : null;

  const adviceSnippets = advice.slice(0, 3).map((a) => ({
    explain: a.explain,
    start_date: a.start_date,
    end_date: a.end_date,
  }));

  return {
    bad_posture,
    score,
    streak: streakSummary,
    recent_topics,
    advice: adviceSnippets, // extra context for the LLM
  };
}

function buildFallback(question: string, summary: unknown): string {
  const { text: summaryText, parts } = formatSummary(summary);
  const summaryLine = parts.length
    ? parts.join(" | ")
    : `Summary: ${summaryText}`;

  return [
    "What is happening:",
    `You asked: ${question}`,
    summaryLine,
    "",
    "3 actionable fixes:",
    "1) Sit with back supported; keep ears over shoulders; feet flat or on a footrest.",
    "2) Raise screen so top third is at eye height; keep it at arm's length (or add zoom if too close).",
    "3) Set a 25/5 timer (25 minutes focused, 5 minutes posture check + stretch).",
    "",
    "2-week improvement plan:",
    "Week 1: Daily 3x one-minute shoulder rolls + chin tucks; adjust chair/screen each morning; track posture score once per day.",
    "Week 2: Add mid-day standing break; practice neutral spine during typing; aim for two posture checks per work block and reduce too-close events.",
  ].join("\n");
}

async function callLocalModel(userMessage: string) {
  const baseUrl = process.env.LOCAL_LLM_URL || DEFAULT_LLM_URL;
  const model = process.env.LOCAL_LLM_MODEL || DEFAULT_LLM_MODEL;
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;

  const body = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    stream: false,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Local LLM responded with status ${response.status}`);
  }

  const data = (await response.json()) as {
    message?: { content?: unknown };
  };

  const content = data?.message?.content;
  if (typeof content === "string" && content.trim().length > 0) {
    return content.trim();
  }

  throw new Error("Empty content from local LLM");
}

export async function POST(req: NextRequest) {
  const { question, summary }: CoachRequestBody =
    (await req.json().catch(() => ({}))) ?? {};

  if (!question) {
    return new Response("Missing 'question' in request body.", { status: 400 });
  }

  const summaryValue =
    summary === undefined || summary === null ? await buildHistorySummary("demo") : summary;
  const { text: summaryText } = formatSummary(summaryValue);
  const userMessage = `Question: ${question}\nSummary: ${summaryText}`;

  let aiText: string | undefined;
  try {
    aiText = await callLocalModel(userMessage);
  } catch (error) {
    console.error("Coach local model call failed:", error);
    aiText = undefined;
  }

  const result = aiText ?? buildFallback(question, summaryValue);

  return new Response(result, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET() {
  return Response.json({ message: "Use POST" });
}

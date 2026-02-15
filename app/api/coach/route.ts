import type { NextRequest } from "next/server";
import { saveCoachChatMessage } from "@/lib/db";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a neutral, general-purpose AI assistant.
Answer the user's question directly, clearly, and without topic bias.
If you are uncertain, say so instead of inventing details.`;

type CoachRequestBody = {
  question?: string;
  userId?: string;
};

const DEFAULT_LLM_URL = "http://127.0.0.1:11434";
const DEFAULT_LLM_MODEL = "llama3.2";
const LOCALHOST_URL_ONLY_PATTERN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i;

function isInvalidModelContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (LOCALHOST_URL_ONLY_PATTERN.test(trimmed)) return true;

  const lower = trimmed.toLowerCase();
  return lower.startsWith("<!doctype html") || lower.startsWith("<html");
}

function buildFallback(question: string): string {
  return [
    "I can answer general questions, but the local model is currently unavailable.",
    "",
    `Your question: ${question}`,
    "",
    "Try again in a few seconds. If this keeps happening, verify Ollama is running and reachable.",
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
  if (typeof content === "string" && !isInvalidModelContent(content)) {
    return content.trim();
  }

  throw new Error("Invalid content from local LLM");
}

export async function POST(req: NextRequest) {
  const body: CoachRequestBody = (await req.json().catch(() => ({}))) ?? {};
  const { question, userId: bodyUserId } = body;

  if (typeof question !== "string" || !question.trim()) {
    return new Response("Missing 'question' in request body.", { status: 400 });
  }

  const userMessage = question.trim();
  const userId =
    (typeof bodyUserId === "string" && bodyUserId.trim()) ||
    req.headers.get("x-user-email") ||
    req.headers.get("x-user-id") ||
    "demo";

  let aiText: string | undefined;
  try {
    aiText = await callLocalModel(userMessage);
  } catch (error) {
    console.error("Coach local model call failed:", error);
    aiText = undefined;
  }

  const result = aiText ?? buildFallback(userMessage);
  const usedFallback = !aiText;

  // Save chat history without affecting response delivery if DB is unavailable.
  void saveCoachChatMessage({
    userId,
    question: userMessage,
    answer: result,
    model: process.env.LOCAL_LLM_MODEL || DEFAULT_LLM_MODEL,
    usedFallback,
  });

  return new Response(result, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET() {
  return Response.json({ message: "Use POST" });
}

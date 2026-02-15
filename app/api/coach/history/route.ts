import type { NextRequest } from "next/server";
import { getCoachChatHistory } from "@/lib/db";

export const runtime = "nodejs";

function normalizeUserIdentifier(req: NextRequest) {
  const queryUserId = req.nextUrl.searchParams.get("userId");
  const headerUserId = req.headers.get("x-user-email") || req.headers.get("x-user-id");
  const candidate = (queryUserId ?? headerUserId ?? "demo").trim().toLowerCase();
  return candidate || "demo";
}

function normalizeLimit(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("limit") ?? 30);
  if (!Number.isFinite(raw)) return 30;
  return Math.max(1, Math.min(100, Math.floor(raw)));
}

export async function GET(req: NextRequest) {
  try {
    const userId = normalizeUserIdentifier(req);
    const limit = normalizeLimit(req);
    const history = await getCoachChatHistory({ userId, limit });

    return Response.json({
      ok: true,
      userId,
      count: history.length,
      messages: history.map((row) => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Coach history endpoint failed:", error);
    return Response.json(
      {
        ok: false,
        count: 0,
        messages: [],
      },
      { status: 200 }
    );
  }
}

import type { NextRequest } from "next/server";
import { addEvent, type EventType } from "@/lib/store/memoryStore";

export const runtime = "nodejs";

const ALLOWED_TYPES: EventType[] = [
  "SESSION_START",
  "SESSION_STOP",
  "BAD_POSTURE",
  "TOO_CLOSE",
  "ACTIVITY_SET",
];

function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && ALLOWED_TYPES.includes(value as EventType);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  const userId =
    typeof body.userId === "string" && body.userId.trim().length > 0
      ? body.userId
      : "demo";
  const type = body.type;
  const ts =
    typeof body.ts === "number" && Number.isFinite(body.ts)
      ? body.ts
      : Math.floor(Date.now() / 1000);
  const activity =
    typeof body.activity === "string" && body.activity.trim().length > 0
      ? body.activity
      : undefined;
  const meta =
    body.meta && typeof body.meta === "object" ? (body.meta as Record<string, unknown>) : undefined;

  if (!isEventType(type)) {
    return new Response('Invalid or missing "type".', { status: 400 });
  }

  const stored = addEvent({
    userId,
    type,
    ts,
    activity,
    meta,
  });

  return Response.json({ ok: true, event: stored });
}

export async function GET() {
  return Response.json({ message: "Use POST" });
}

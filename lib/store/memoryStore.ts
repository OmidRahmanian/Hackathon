export type EventType =
  | "SESSION_START"
  | "SESSION_STOP"
  | "BAD_POSTURE"
  | "TOO_CLOSE"
  | "ACTIVITY_SET";

export type PostureEvent = {
  id: string;
  userId: string;
  type: EventType;
  ts: number;
  activity?: string;
  meta?: Record<string, any>;
};

const events: PostureEvent[] = [];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addEvent(
  evt: Omit<PostureEvent, "id"> & { id?: string }
): PostureEvent {
  const stored: PostureEvent = {
    id: evt.id ?? generateId(),
    userId: evt.userId ?? "demo",
    type: evt.type,
    ts: evt.ts,
    activity: evt.activity,
    meta: evt.meta,
  };

  events.push(stored);
  return stored;
}

export function getEvents(params: {
  userId: string;
  fromTs: number;
  toTs: number;
}): PostureEvent[] {
  return events.filter(
    (evt) =>
      evt.userId === params.userId &&
      evt.ts >= params.fromTs &&
      evt.ts <= params.toTs
  );
}

export function clearAllEvents() {
  events.length = 0;
}

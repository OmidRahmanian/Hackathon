'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/components/features/auth-provider';
import { Activity, Clock, Power, Square, Wifi, WifiOff } from 'lucide-react';

const activities = ['Studying', 'Browsing', 'Multimedia'] as const;
const EVENT_DEBOUNCE_MS = 10_000;
const LAST_LOG_TS_STORAGE_KEY = 'postureos-monitor-last-log-ts';
const activityIcons: Record<(typeof activities)[number], ReactNode> = {
  Studying: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Browsing: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Multimedia: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
};

type MonitorEventType =
  | 'SESSION_START'
  | 'SESSION_STOP'
  | 'ACTIVITY_SET'
  | 'BAD_POSTURE'
  | 'TOO_CLOSE';

export function MonitorPage() {
  const { userEmail } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const seenLogLinesRef = useRef<Set<string>>(new Set());
  const lastProcessedLogTsRef = useRef<number>(0);
  const lastBadPostureEventAtRef = useRef(0);
  const lastTooCloseEventAtRef = useRef(0);
  const eventUserId = useMemo(() => {
    const normalized = userEmail?.trim().toLowerCase();
    return normalized && normalized.length > 0 ? normalized : 'demo';
  }, [userEmail]);

  const postEvent = async (type: MonitorEventType, activity?: string | null) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: eventUserId,
          type,
          activity: activity ?? undefined
        })
      });
    } catch (error) {
      console.error('Event post failed:', error);
    }
  };

  const maybePostDebouncedEvent = (type: 'BAD_POSTURE' | 'TOO_CLOSE', activity?: string | null) => {
    const nowMs = Date.now();
    if (type === 'BAD_POSTURE') {
      if (nowMs - lastBadPostureEventAtRef.current < EVENT_DEBOUNCE_MS) return;
      lastBadPostureEventAtRef.current = nowMs;
    } else {
      if (nowMs - lastTooCloseEventAtRef.current < EVENT_DEBOUNCE_MS) return;
      lastTooCloseEventAtRef.current = nowMs;
    }

    void postEvent(type, activity);
  };

  const parseLogLine = (line: string) => {
    const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (!match) return { timestampMs: null, message: line };
    const timestampMs = Date.parse(match[1]);
    return {
      timestampMs: Number.isFinite(timestampMs) ? timestampMs : null,
      message: match[2] ?? line
    };
  };

  const processMonitorLogs = (recentLogs: string[] | undefined, activity?: string | null) => {
    if (!Array.isArray(recentLogs) || recentLogs.length === 0) return;

    let nextLastProcessedTs = lastProcessedLogTsRef.current;
    for (const line of recentLogs) {
      if (!line) continue;
      const parsed = parseLogLine(line);
      if (
        parsed.timestampMs !== null &&
        parsed.timestampMs <= lastProcessedLogTsRef.current
      ) {
        continue;
      }
      if (parsed.timestampMs === null && seenLogLinesRef.current.has(line)) continue;

      if (parsed.timestampMs === null) {
        seenLogLinesRef.current.add(line);
      } else {
        nextLastProcessedTs = Math.max(nextLastProcessedTs, parsed.timestampMs);
      }

      if (parsed.message.includes('Fix your posture!')) {
        maybePostDebouncedEvent('BAD_POSTURE', activity ?? selectedActivity);
      }

      if (parsed.message.includes('Too Close to Screen!')) {
        maybePostDebouncedEvent('TOO_CLOSE', activity ?? selectedActivity);
      }
    }

    if (nextLastProcessedTs > lastProcessedLogTsRef.current) {
      lastProcessedLogTsRef.current = nextLastProcessedTs;
      try {
        window.sessionStorage.setItem(
          LAST_LOG_TS_STORAGE_KEY,
          String(lastProcessedLogTsRef.current)
        );
      } catch {
        // Ignore sessionStorage write failures.
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = window.sessionStorage.getItem(LAST_LOG_TS_STORAGE_KEY);
      const parsed = Number(stored);
      if (Number.isFinite(parsed) && parsed > 0) {
        lastProcessedLogTsRef.current = parsed;
      } else {
        lastProcessedLogTsRef.current = Date.now();
        window.sessionStorage.setItem(
          LAST_LOG_TS_STORAGE_KEY,
          String(lastProcessedLogTsRef.current)
        );
      }
    } catch {
      lastProcessedLogTsRef.current = Date.now();
    }

    const loadStatus = async () => {
      try {
        const response = await fetch('/api/monitor', { method: 'GET', cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as {
          isRunning?: boolean;
          activity?: string | null;
          lastError?: string | null;
          recentLogs?: string[];
        };

        if (cancelled) return;
        const running = Boolean(data.isRunning);
        setIsOn(running);
        if (typeof data.activity === 'string' && data.activity.length > 0) {
          const nextActivity = data.activity;
          setSelectedActivity((current) => {
            if (running) return nextActivity;
            return current ?? nextActivity;
          });
        }
        setStatusMessage(data.lastError ?? null);
        processMonitorLogs(data.recentLogs, data.activity);
      } catch {
        if (!cancelled) {
          setStatusMessage('Unable to load monitor status.');
        }
      }
    };

    void loadStatus();
    const interval = window.setInterval(() => {
      void loadStatus();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const timeLabel = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const dateLabel = now.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleStart = async () => {
    if (!selectedActivity) return;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          activity: selectedActivity
        })
      });

      const data = (await response.json().catch(() => ({}))) as {
        isRunning?: boolean;
        activity?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? `Start failed (${response.status})`);
      }

      setIsOn(Boolean(data.isRunning));
      if (data.activity) {
        setSelectedActivity(data.activity);
      }

      await postEvent('SESSION_START', data.activity ?? selectedActivity);
    } catch (error) {
      setIsOn(false);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to start monitor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      const data = (await response.json().catch(() => ({}))) as {
        isRunning?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? `Stop failed (${response.status})`);
      }

      setIsOn(Boolean(data.isRunning));
      await postEvent('SESSION_STOP', selectedActivity);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to stop monitor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-fade flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[var(--accent)]/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-[var(--accent-3)]/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="tech-card glass rounded-sm border border-white/10 bg-black/60 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 bg-[var(--accent)]/10 text-[var(--accent)]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                  Monitoring Control
                </p>
                <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-[var(--text)]">Live Monitor</h1>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 rounded-sm border border-white/10 bg-black/55 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[var(--text-soft)]" />
                <p className="font-mono text-sm font-medium tabular-nums tracking-wide text-[var(--text)]">
                  {timeLabel}
                </p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">{dateLabel}</p>
            </div>
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Select an activity mode, then start or stop the tracking session.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {activities.map((activity) => {
              const active = selectedActivity === activity;
              return (
                <button
                  key={activity}
                  type="button"
                  onClick={() => {
                    setSelectedActivity((current) => {
                      if (current !== activity) {
                        void postEvent('ACTIVITY_SET', activity);
                      }
                      return activity;
                    });
                  }}
                  className={cn(
                    'group relative flex flex-col items-center gap-2.5 rounded-sm border px-4 py-5 text-sm font-medium uppercase tracking-[0.12em] transition-all duration-150',
                    active
                      ? 'border-[var(--accent)]/60 bg-[var(--accent)]/12 text-[var(--accent)] shadow-[0_0_12px_rgba(0,255,65,0.18)]'
                      : 'border-white/10 bg-black/35 text-[var(--text-soft)] hover:border-white/30 hover:bg-black/70 hover:text-[var(--text)]'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-sm border transition-colors duration-150',
                      active
                        ? 'border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'border-white/10 bg-black/35 text-[var(--text-soft)] group-hover:border-white/25 group-hover:text-[var(--text)]'
                    )}
                  >
                    {activityIcons[activity]}
                  </span>
                  <span className="font-medium tracking-wide">{activity}</span>
                  {active ? (
                    <span className="absolute -top-1 right-2 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-40" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleStart}
              disabled={!selectedActivity || isOn || isLoading}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-black transition-all duration-75',
                'hover:bg-white hover:text-black',
                'disabled:cursor-not-allowed disabled:opacity-40'
              )}
            >
              <Power className="h-4 w-4" />
              {isLoading && !isOn ? 'Starting...' : 'Start'}
            </button>
            <button
              onClick={handleStop}
              disabled={!isOn || isLoading}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-white/20 bg-black/60 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text)] transition-all duration-75',
                'hover:bg-white hover:text-black',
                'disabled:cursor-not-allowed disabled:opacity-40'
              )}
            >
              <Square className="h-3.5 w-3.5" />
              {isLoading && isOn ? 'Stopping...' : 'Stop'}
            </button>
          </div>

          <div className="mt-6 rounded-sm border border-white/10 bg-black/45 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">System Status</p>
              <div className="flex items-center gap-1.5">
                {isOn ? (
                  <Wifi className="h-3.5 w-3.5 text-[var(--accent)]" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-[var(--text-soft)]" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium uppercase tracking-[0.12em]',
                    isOn ? 'text-[var(--accent)]' : 'text-[var(--text-soft)]'
                  )}
                >
                  {isOn ? 'Connected' : 'Idle'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center">
                {isOn ? (
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/25" />
                ) : null}
                <span
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isOn ? 'border-[var(--accent)]/60 bg-[var(--accent)]/20' : 'border-white/25 bg-white/5'
                  )}
                >
                  <span
                    className={cn(
                      'h-3 w-3 rounded-full transition-colors duration-300',
                      isOn ? 'bg-[var(--accent)]' : 'bg-[var(--accent-2)]'
                    )}
                  />
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span
                  className={cn(
                    'font-mono text-xl font-bold tracking-[0.12em] transition-colors duration-300',
                    isOn ? 'text-[var(--accent)]' : 'text-[var(--text-soft)]'
                  )}
                >
                  {isOn ? 'ACTIVE' : 'OFFLINE'}
                </span>
                <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  {selectedActivity ? (
                    <>
                      Mode: <span className="font-medium text-[var(--text)]">{selectedActivity}</span>
                    </>
                  ) : (
                    'No activity mode selected'
                  )}
                </span>
              </div>
            </div>

            {statusMessage ? (
              <div className="mt-4 flex items-center gap-2 rounded-sm border border-[var(--accent-2)]/35 bg-[var(--accent-2)]/10 px-3 py-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" />
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--accent-2)]">{statusMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

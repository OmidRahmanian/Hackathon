'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

const activities = ['Studying', 'Browsing', 'Multimedia'] as const;
const EVENT_USER_ID = 'demo';
const EVENT_DEBOUNCE_MS = 10_000;

type MonitorEventType =
  | 'SESSION_START'
  | 'SESSION_STOP'
  | 'ACTIVITY_SET'
  | 'BAD_POSTURE'
  | 'TOO_CLOSE';

export function MonitorPage() {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const seenLogLinesRef = useRef<Set<string>>(new Set());
  const lastBadPostureEventAtRef = useRef(0);
  const lastTooCloseEventAtRef = useRef(0);

  const postEvent = async (type: MonitorEventType, activity?: string | null) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: EVENT_USER_ID,
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

  const processMonitorLogs = (recentLogs: string[] | undefined, activity?: string | null) => {
    if (!Array.isArray(recentLogs) || recentLogs.length === 0) return;

    for (const line of recentLogs) {
      if (!line || seenLogLinesRef.current.has(line)) continue;
      seenLogLinesRef.current.add(line);

      if (line.includes('Fix your posture!')) {
        maybePostDebouncedEvent('BAD_POSTURE', activity ?? selectedActivity);
      }

      if (line.includes('Too Close to Screen!')) {
        maybePostDebouncedEvent('TOO_CLOSE', activity ?? selectedActivity);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

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
    <Card className="mx-auto max-w-3xl overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-[var(--accent)]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 left-8 h-36 w-36 rounded-full bg-[var(--accent-3)]/15 blur-3xl" />
        <div className="relative sm:pr-44">
          <p className="inline-flex rounded-sm border border-white/20 bg-black/70 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#666]">
            Monitoring Control
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#eee]">Live Monitoring</h1>
          <p className="mt-1 text-sm soft-text">Pick one activity mode, then start or stop tracking.</p>
          <div className="absolute right-0 top-0 rounded-sm border border-white/10 bg-black/55 px-3 py-2 text-right">
            <p className="font-mono text-sm font-semibold tracking-[0.08em] text-[#eee]">{timeLabel}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] soft-text">{dateLabel}</p>
          </div>
        </div>
      </div>

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
                'rounded-sm border px-4 py-3 font-mono text-sm font-semibold uppercase tracking-[0.12em] transition-all duration-75',
                active
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                  : 'border-white/10 bg-black/45 text-[#eee] hover:bg-white hover:text-black'
              )}
            >
              {activity}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={handleStart} disabled={!selectedActivity || isOn || isLoading}>
          {isLoading && !isOn ? 'Starting...' : 'Start'}
        </Button>
        <Button variant="secondary" onClick={handleStop} disabled={!isOn || isLoading}>
          {isLoading && isOn ? 'Stopping...' : 'Stop'}
        </Button>
      </div>

      <div className="mt-6 rounded-sm border border-white/10 bg-black/50 p-4">
        <p className="text-sm soft-text">Status</p>
        <div className="mt-3 flex items-center gap-3">
          <span
            className={cn(
              'h-5 w-5 rounded-full border border-white/50',
              isOn
                ? 'bg-[var(--accent)] shadow-[0_0_14px_rgba(0,255,65,0.6)]'
                : 'bg-[var(--accent-2)] shadow-[0_0_14px_rgba(255,95,0,0.6)]'
            )}
          />
          <span className="font-mono text-lg font-semibold tracking-[0.18em]">{isOn ? 'ON' : 'OFF'}</span>
          <span className="font-mono text-xs uppercase tracking-[0.2em] soft-text">{selectedActivity ?? 'No mode selected'}</span>
        </div>
        {statusMessage ? (
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-[var(--accent-2)]">{statusMessage}</p>
        ) : null}
      </div>
    </Card>
  );
}

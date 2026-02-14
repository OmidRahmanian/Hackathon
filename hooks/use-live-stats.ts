'use client';

import { useEffect, useMemo, useState } from 'react';

type StatsSummaryResponse = {
  userId: string;
  timeRange: { from: number; to: number };
  range: 'day' | 'week';
  badPostureCount: number;
  tooCloseCount: number;
  scoreAverage: number;
  activityBreakdown: Record<string, number>;
  totals: { badPostureCount: number; tooCloseCount: number };
  buckets: unknown[];
  activity: { activitySwitches: Record<string, number> };
};

const ZERO_STATS: StatsSummaryResponse = {
  userId: 'demo',
  timeRange: { from: 0, to: 0 },
  range: 'day',
  badPostureCount: 0,
  tooCloseCount: 0,
  scoreAverage: 0,
  activityBreakdown: {},
  totals: { badPostureCount: 0, tooCloseCount: 0 },
  buckets: [],
  activity: { activitySwitches: {} }
};

export function useLiveStats() {
  const [stats, setStats] = useState<StatsSummaryResponse>(ZERO_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/stats/summary?userId=demo&range=day', {
          method: 'GET',
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Stats API failed (${response.status})`);
        }

        const data = (await response.json()) as StatsSummaryResponse;
        if (cancelled) return;
        setStats(data);
      } catch (err) {
        if (cancelled) return;
        console.error('Stats fetch failed:', err);
        setError('Unable to load stats.');
        setStats(ZERO_STATS);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const summary = useMemo(() => {
    const entries = Object.values(stats.activityBreakdown);
    const totalHours = entries.reduce((acc, value) => acc + value, 0);
    const mainIssue = stats.badPostureCount > 0 ? 'Slouching' : 'No major issue';

    return { totalHours, mainIssue };
  }, [stats]);

  return { stats, summary, loading, error };
}

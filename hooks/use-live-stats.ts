'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/features/auth-provider';

type StatsSummaryResponse = {
  userId: string;
  timeRange: { from: number; to: number };
  range: 'day' | 'week';
  userScore: number;
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
  userScore: 0,
  badPostureCount: 0,
  tooCloseCount: 0,
  scoreAverage: 0,
  activityBreakdown: {},
  totals: { badPostureCount: 0, tooCloseCount: 0 },
  buckets: [],
  activity: { activitySwitches: {} }
};

export function useLiveStats() {
  const { userEmail } = useAuth();
  const [stats, setStats] = useState<StatsSummaryResponse>(ZERO_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeUserId = useMemo(() => {
    const normalized = userEmail?.trim().toLowerCase();
    return normalized && normalized.length > 0 ? normalized : 'demo';
  }, [userEmail]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          userId: activeUserId,
          range: 'day'
        });
        const response = await fetch(`/api/stats/summary?${params.toString()}`, {
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
  }, [activeUserId]);

  const summary = useMemo(() => {
    const entries = Object.values(stats.activityBreakdown);
    const totalHours = entries.reduce((acc, value) => acc + value, 0);
    const mainIssue = stats.badPostureCount > 0 ? 'Slouching' : 'No major issue';

    return { totalHours, mainIssue };
  }, [stats]);

  return { stats, summary, loading, error };
}

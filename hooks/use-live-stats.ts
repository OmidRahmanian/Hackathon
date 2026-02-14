'use client';

import { initialStats } from '@/lib/data/mock-data';
import { useMemo } from 'react';

export function useLiveStats() {
  const stats = initialStats;

  const summary = useMemo(() => {
    const totalHours = stats.activities.reduce((acc, item) => acc + item.hours, 0);
    const mainIssue = 'Slouching';

    return {
      totalHours,
      mainIssue
    };
  }, [stats]);

  return { stats, summary };
}

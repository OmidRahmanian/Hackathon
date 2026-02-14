'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

const activities = ['Studying', 'Browsing', 'Multimedia'] as const;

export function MonitorPage() {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [isOn, setIsOn] = useState(false);

  const handleStart = () => {
    if (!selectedActivity) return;
    setIsOn(true);
  };

  const handleStop = () => {
    setIsOn(false);
  };

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-[var(--accent)]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 left-8 h-36 w-36 rounded-full bg-[var(--accent-3)]/15 blur-3xl" />
        <div className="relative">
          <p className="inline-flex rounded-sm border border-white/20 bg-black/70 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#666]">
            Monitoring Control
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#eee]">Live Monitoring</h1>
          <p className="mt-1 text-sm soft-text">Pick one activity mode, then start or stop tracking.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {activities.map((activity) => {
          const active = selectedActivity === activity;
          return (
            <button
              key={activity}
              type="button"
              onClick={() => setSelectedActivity(activity)}
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
        <Button onClick={handleStart} disabled={!selectedActivity || isOn}>
          Start
        </Button>
        <Button variant="secondary" onClick={handleStop} disabled={!isOn}>
          Stop
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
      </div>
    </Card>
  );
}

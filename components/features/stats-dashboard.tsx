'use client';

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Flame, Share2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveStats } from '@/hooks/use-live-stats';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/components/features/auth-provider';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function formatHourLabel(date: Date) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    hour12: true
  });
}

function formatMinuteLabel(date: Date) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getCurrentHourRangeLabel(now: Date) {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return `${formatHourLabel(start)} - ${formatHourLabel(end)}`;
}

function getCurrentHourTrendLabels(now: Date) {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  const labels: string[] = [];
  for (let minute = 0; minute <= 60; minute += 10) {
    const point = new Date(start);
    point.setMinutes(minute);
    labels.push(formatMinuteLabel(point));
  }

  return labels;
}

function formatHours(hours: number) {
  if (!Number.isFinite(hours)) return '0';
  if (Number.isInteger(hours)) return String(hours);
  return hours.toFixed(2).replace(/\.?0+$/, '');
}

export function StatsDashboard() {
  const { stats, loading: statsLoading, error: statsError } = useLiveStats();
  const { userEmail } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [timeRangeLabel, setTimeRangeLabel] = useState(getCurrentHourRangeLabel(new Date()));
  const [trendLabels, setTrendLabels] = useState(getCurrentHourTrendLabels(new Date()));
  const [leaderboardUsers, setLeaderboardUsers] = useState<{ name: string; score: number }[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  useEffect(() => {
    const updateLabel = () => {
      const now = new Date();
      setTimeRangeLabel(getCurrentHourRangeLabel(now));
      setTrendLabels(getCurrentHourTrendLabels(now));
    };

    updateLabel();
    const interval = window.setInterval(updateLabel, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      if (!userEmail) {
        setLeaderboardUsers([]);
        setLeaderboardError('Sign in to view your friends leaderboard.');
        return;
      }

      try {
        setLeaderboardError(null);
        const params = new URLSearchParams({ userEmail });
        const response = await fetch(`/api/friends/leaderboard?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error(`Leaderboard API failed (${response.status})`);
        }

        const data = (await response.json()) as {
          entries?: { name?: string; score?: number }[];
        };

        if (cancelled) return;

        const entries = Array.isArray(data.entries)
          ? data.entries.map((entry) => ({
              name: entry.name ?? 'Unknown',
              score: Number(entry.score ?? 0)
            }))
          : [];

        setLeaderboardUsers(entries);
      } catch (error) {
        if (cancelled) return;
        console.error('Leaderboard fetch failed:', error);
        setLeaderboardError('Unable to load leaderboard.');
        setLeaderboardUsers([]);
      }
    };

    void loadLeaderboard();
    const interval = window.setInterval(() => {
      void loadLeaderboard();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userEmail]);

  const badPostureTimeline = useMemo(() => {
    const points = trendLabels.length;
    if (points === 0) return [];
    return Array.from({ length: points }, (_, index) => {
      const ratio = (index + 1) / points;
      return Math.round(stats.badPostureCount * ratio);
    });
  }, [stats.badPostureCount, trendLabels]);

  const activityRows = useMemo(
    () =>
      Object.entries(stats.activityBreakdown).map(([name, count], index) => ({
        id: `${name}-${index}`,
        name,
        hours: count
      })),
    [stats.activityBreakdown]
  );

  const chartData = useMemo(
    () => ({
      labels: trendLabels,
      datasets: [
        {
          label: 'Bad posture count',
          data: badPostureTimeline,
          borderColor: '#ffb000',
          backgroundColor: 'rgba(255, 176, 0, 0.15)',
          tension: 0.2
        }
      ]
    }),
    [badPostureTimeline, trendLabels]
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#eee'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#666' },
        grid: { color: 'rgba(255,255,255,0.08)' }
      },
      y: {
        ticks: { color: '#666' },
        grid: { color: 'rgba(255,255,255,0.08)' }
      }
    }
  };

  const currentScore = stats.userScore;

  return (
    <div className="relative dashboard-glow-slow">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute -right-16 bottom-4 h-64 w-64 rounded-full bg-[var(--accent-3)]/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="grid gap-3 md:grid-cols-2 lg:gap-4"
        >
          <Card className="tech-card relative overflow-hidden px-4 pb-4 pt-6 md:px-5 md:pb-5 md:pt-6">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.09),transparent_45%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
            </div>
            <div className="relative">
              <p className="hud-label">Time Range</p>
              <h2 className="mt-1.5 font-mono text-xl font-bold tracking-[0.07em] text-[var(--text)]">{timeRangeLabel}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-sm border border-white/10 bg-black/45 p-3.5">
                  <p className="hud-label">User Failures</p>
                  <motion.p
                    key={stats.userFailureCount}
                    initial={{ scale: 1.08 }}
                    animate={{ scale: 1 }}
                    className="mt-1.5 font-mono text-2xl font-bold text-[var(--accent-3)]"
                  >
                    {stats.userFailureCount}
                  </motion.p>
                  {statsLoading ? <p className="mt-1 text-xs soft-text">Loading...</p> : null}
                  {statsError ? <p className="mt-1 text-xs text-[var(--accent-2)]">{statsError}</p> : null}
                </div>
              </div>
            </div>
          </Card>

          <Card className="tech-card relative overflow-hidden px-4 pb-4 pt-6 md:px-5 md:pb-5 md:pt-6">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.09),transparent_45%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between gap-2">
                <h3 className="hud-title text-base">Current Score</h3>
                <Button variant="secondary" className="h-9 px-3" onClick={() => setShareOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>
              <div className="mt-5 flex items-center justify-center gap-2.5 rounded-sm border border-white/10 bg-black/45 py-5">
                <span className="font-mono text-4xl font-extrabold text-[var(--text)]">{currentScore}</span>
                <Flame className="h-8 w-8 text-[var(--accent-2)]" />
              </div>
              <p className="mt-3 soft-text">Your score updates after each session.</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: 0.05 }}
        >
          <Card className="tech-card relative overflow-hidden px-4 pb-4 pt-6 md:px-5 md:pb-5 md:pt-6">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.09),transparent_45%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
            </div>
            <div className="relative">
              <h3 className="hud-title text-base">Real-Time Trend</h3>
              <p className="mt-1 soft-text">Posture event trend for the selected time window</p>
              <div className="mt-3 h-56 rounded-sm border border-white/10 bg-black/35 p-2.5 lg:h-64">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: 0.09 }}
          className="grid gap-3 lg:grid-cols-2 lg:gap-4"
        >
          <Card className="tech-card relative overflow-hidden px-4 pb-4 pt-6 md:px-5 md:pb-5 md:pt-6">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.09),transparent_45%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
            </div>
            <div className="relative">
              <h3 className="hud-title text-base">Activity Hours</h3>
              <div className="mt-2.5 space-y-2.5">
                {activityRows.length > 0 ? (
                  activityRows.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between rounded-sm border border-white/10 bg-black/45 px-3.5 py-2.5">
                      <span className="font-mono text-sm uppercase tracking-[0.1em] text-[var(--text)]">{activity.name}</span>
                      <span className="font-mono text-sm font-semibold text-[var(--text)]">{formatHours(activity.hours)} hr</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-sm border border-white/10 bg-black/45 px-4 py-3 text-sm soft-text">
                    No activity data yet.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="tech-card relative overflow-hidden px-4 pb-4 pt-6 md:px-5 md:pb-5 md:pt-6">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.09),transparent_45%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
            </div>
            <div className="relative">
              <h3 className="hud-title text-base">Friends Leaderboard</h3>
              <div className="mt-2.5 space-y-2.5">
                {leaderboardUsers.map((user, index) => (
                  <div key={`${user.name}-${index}`} className="flex items-center justify-between rounded-sm border border-white/10 bg-black/45 px-3.5 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-4 font-mono text-sm text-[var(--text-soft)]">{index + 1}</span>
                      <Image src={`/avatar-${(index % 4) + 1}.svg`} alt={user.name} width={32} height={32} className="rounded-sm border border-white/10" />
                      <span className="font-mono text-sm uppercase tracking-[0.08em] text-[var(--text)]">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-semibold">
                      <span>{user.score}</span>
                      <Flame className="h-4 w-4 text-[var(--accent-2)]" />
                    </div>
                  </div>
                ))}
                {leaderboardUsers.length === 0 ? (
                  <div className="rounded-sm border border-white/10 bg-black/45 px-4 py-3 text-sm soft-text">
                    {leaderboardError ?? 'No leaderboard data yet.'}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        </motion.div>

        <SharePopup open={shareOpen} onClose={() => setShareOpen(false)} currentScore={currentScore} />
      </div>
    </div>
  );
}

function SharePopup({
  open,
  onClose,
  currentScore
}: {
  open: boolean;
  onClose: () => void;
  currentScore: number;
}) {
  const onSave = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext('2d');

    if (!context) return;

    context.fillStyle = '#020204';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(0,255,65,0.15)');
    gradient.addColorStop(1, 'rgba(255,176,0,0.08)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = 'rgba(255,255,255,0.12)';
    context.lineWidth = 2;
    context.strokeRect(80, 80, 920, 920);

    context.fillStyle = '#00ff41';
    context.font = '700 54px Inter';
    context.fillText('SAURON', 130, 180);

    context.fillStyle = '#eee';
    context.font = '600 42px Inter';
    context.fillText('CURRENT SCORE', 130, 320);

    context.fillStyle = '#ffb000';
    context.font = '800 196px Inter';
    context.fillText(String(currentScore), 130, 560);

    // Draw the same Lucide flame icon style used in the dashboard card.
    const flamePath = new Path2D(
      'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'
    );
    context.save();
    context.translate(535, 390);
    context.scale(7.2, 7.2);
    context.strokeStyle = '#ffb000';
    context.lineWidth = 1.9;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowColor = 'rgba(255,176,0,0.35)';
    context.shadowBlur = 18;
    context.stroke(flamePath);
    context.restore();

    context.fillStyle = '#eee';
    context.font = '500 32px Inter';
    context.fillText('Posture score snapshot', 130, 670);

    const link = document.createElement('a');
    link.download = 'sauron-current-score.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h4 className="hud-title text-lg">Share Current Score</h4>
      <p className="mt-1 soft-text">Generate a score card image with your current score.</p>

      <div className="mt-4 rounded-sm border border-white/10 bg-black/45 px-4 py-5">
        <p className="hud-label">Current Score</p>
        <div className="mt-3 flex items-center gap-2 font-mono text-4xl font-extrabold text-[var(--text)]">
          <span>{currentScore}</span>
          <Flame className="h-7 w-7 text-[var(--accent-2)]" />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onSave}>Save as Photo</Button>
      </div>
    </Modal>
  );
}

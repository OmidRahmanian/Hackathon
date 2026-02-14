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
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveStats } from '@/hooks/use-live-stats';
import { achievements, leaderboardUsers } from '@/lib/data/mock-data';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function StatsDashboard() {
  const { stats } = useLiveStats();
  const [shareOpen, setShareOpen] = useState(false);

  const chartData = useMemo(
    () => ({
      labels: stats.timelineLabels,
      datasets: [
        {
          label: 'Bad posture count',
          data: stats.badPostureTimeline,
          borderColor: '#ffb000',
          backgroundColor: 'rgba(255, 176, 0, 0.15)',
          tension: 0.2
        }
      ]
    }),
    [stats]
  );

  const chartOptions = {
    responsive: true,
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

  const currentStreak = 2;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <p className="text-sm soft-text">Time Range</p>
          <h2 className="mt-1 font-mono text-xl font-semibold">{stats.timeframeLabel}</h2>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-sm border border-white/10 bg-black/45 p-4">
              <p className="text-sm soft-text">Bad posture events</p>
              <motion.p key={stats.badPostureCount} initial={{ scale: 1.08 }} animate={{ scale: 1 }} className="mt-1 font-mono text-3xl font-bold text-[var(--accent-3)]">
                {stats.badPostureCount}
              </motion.p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Streak</h3>
            <Button variant="secondary" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-3 rounded-sm border border-white/10 bg-black/45 py-8">
            <span className="font-mono text-5xl font-extrabold">#{currentStreak}</span>
            <Flame className="h-10 w-10 text-[var(--accent-2)]" />
          </div>
          <p className="mt-4 text-sm soft-text">Keep this up today to protect your streak.</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold">Real-Time Trend</h3>
        <p className="mt-1 text-sm soft-text">Posture event trend for the selected time window</p>
        <div className="mt-4">
          <Line data={chartData} options={chartOptions} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Activity Hours</h3>
          <div className="mt-3 space-y-3">
            {stats.activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between rounded-sm border border-white/10 bg-black/45 px-4 py-3">
                <span className="font-mono uppercase tracking-[0.12em]">{activity.name}</span>
                <span className="font-mono font-semibold">{activity.hours} hr</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">Friends Leaderboard</h3>
          <div className="mt-3 space-y-3">
            {leaderboardUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between rounded-sm border border-white/10 bg-black/45 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-4 font-mono text-sm soft-text">{index + 1}</span>
                  <Image src={user.avatar} alt={user.name} width={36} height={36} className="rounded-full" />
                  <span className="font-mono uppercase tracking-[0.08em]">{user.name}</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-semibold">
                  <span>{user.streak}</span>
                  <Flame className="h-4 w-4 text-[var(--accent-2)]" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SharePopup open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

function SharePopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const onSave = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext('2d');

    if (!context) return;

    context.fillStyle = '#020204';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#00ff41';
    context.font = 'bold 68px Inter';
    context.fillText('PostureOS Achievements', 100, 150);

    context.fillStyle = '#eee';
    context.font = '40px Inter';
    achievements.forEach((achievement, index) => {
      context.fillText(`• ${achievement}`, 120, 280 + index * 100);
    });

    const link = document.createElement('a');
    link.download = 'posture-achievements.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h4 className="text-lg font-semibold">Share achievements</h4>
      <p className="mt-1 text-sm soft-text">Save your current achievements as a share card image.</p>
      <div className="mt-4 space-y-2">
        {achievements.map((achievement) => (
          <div key={achievement} className="rounded-sm border border-white/10 bg-black/45 px-3 py-2 font-mono text-sm">
            {achievement}
          </div>
        ))}
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

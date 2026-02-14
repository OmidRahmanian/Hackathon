import { LeaderboardUser, ReminderItem, StatsSnapshot } from '@/types/app';

export const initialStats: StatsSnapshot = {
  timeframeLabel: '10:00 AM - 11:00 AM',
  badPostureCount: 9,
  timelineLabels: ['10:00', '10:10', '10:20', '10:30', '10:40', '10:50', '11:00'],
  badPostureTimeline: [1, 2, 3, 5, 6, 8, 9],
  activities: [
    { id: 'a1', name: 'Watched movie', hours: 6 },
    { id: 'a2', name: 'Studied', hours: 3 },
    { id: 'a3', name: 'Coding', hours: 2 }
  ]
};

export const leaderboardUsers: LeaderboardUser[] = [
  { id: 'u1', name: 'Ava Johnson', avatar: '/avatar-1.svg', streak: 14 },
  { id: 'u2', name: 'Noah Smith', avatar: '/avatar-2.svg', streak: 11 },
  { id: 'u3', name: 'Mia Chen', avatar: '/avatar-3.svg', streak: 9 },
  { id: 'u4', name: 'Ethan Lee', avatar: '/avatar-4.svg', streak: 6 }
];

export const defaultReminders: ReminderItem[] = [
  { id: 'r1', label: 'Eye rest break', enabled: true, intervalSeconds: 30 * 60 },
  { id: 'r2', label: 'Stretch break', enabled: true, intervalSeconds: 45 * 60 },
  { id: 'r3', label: 'Hydration reminder', enabled: false, intervalSeconds: 30 * 60 },
  { id: 'r4', label: 'Walk reminder', enabled: false, intervalSeconds: 60 * 60 }
];

export const aiDefaultPrompts = [
  'Based on your latest stats, frequent slouching may increase neck and lower-back strain.',
  'Fix path: raise your screen to eye level, keep shoulders neutral, and take a 2-minute stretch break every hour.'
];

export const achievements = [
  '7-day streak achieved',
  'Improved posture score by 18%',
  'Completed 20 reminder check-ins'
];

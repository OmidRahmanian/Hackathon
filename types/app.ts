export type ActivityItem = {
  id: string;
  name: string;
  hours: number;
};

export type LeaderboardUser = {
  id: string;
  name: string;
  avatar: string;
  streak: number;
};

export type ReminderItem = {
  id: string;
  label: string;
  enabled: boolean;
  intervalSeconds: number;
  custom?: boolean;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export type StatsSnapshot = {
  timeframeLabel: string;
  badPostureCount: number;
  timelineLabels: string[];
  badPostureTimeline: number[];
  activities: ActivityItem[];
};

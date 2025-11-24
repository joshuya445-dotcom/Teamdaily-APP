// Declaration for sandbox environment variables
declare global {
  const __firebase_config: string;
  const __app_id: string;
  const __initial_auth_token: string | undefined;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  groupId?: string | null;
  createdAt?: any;
}

export interface WorkItem {
  id: number;
  text: string;
  progress: number;
}

export interface DailyReport {
  id: string;
  userId: string;
  userName: string;
  groupId: string | null;
  groupName: string;
  date: string; // YYYY-MM-DD
  todayWork: string; // Legacy string format
  workItems?: WorkItem[]; // Structured format
  problems: string;
  tomorrowPlan: string;
  mood: 'energetic' | 'happy' | 'neutral' | 'tired' | 'stressed';
  likes: string[];
  createdAtMillis: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'mention' | 'approval' | 'system';
  content: string;
  read: boolean;
  createdAt: any;
  linkId?: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface AppSettings {
  teamName: string;
  workDays: number[];
  thresholds: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface TeamSummary {
  id: string;
  content: string;
  createdAt: any;
}
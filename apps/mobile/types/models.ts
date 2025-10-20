/**
 * Data models matching the Convex schema
 */

export interface User {
  _id: string;
  email?: string;
  name?: string;
}

export interface Organization {
  _id: string;
  name: string;
  slug?: string;
  createdBy: string;
  createdAt: number;
}

export interface Client {
  _id: string;
  name: string;
  color?: string;
}

export interface Project {
  _id: string;
  _creationTime?: number;
  organizationId?: string;
  clientId?: string;
  name: string;
  color?: string;
  hourlyRate: number;
  budgetType: "hours" | "amount";
  budgetHours?: number;
  budgetAmount?: number;
  archived: boolean;
  workspaceType?: "personal" | "work";
  client?: Client;
  budgetRemaining?: number;
  budgetRemainingFormatted?: string;
  totalSeconds?: number;
  totalHours?: number;
  totalHoursFormatted?: string;
  lastActivityAt?: number;
}

export interface Category {
  _id: string;
  organizationId?: string;
  userId?: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TimeEntry {
  _id: string;
  organizationId?: string;
  userId?: string;
  projectId: string;
  startedAt: number;
  stoppedAt?: number;
  seconds?: number;
  source: "manual" | "timer" | "autoStop" | "overrun" | "pomodoroBreak";
  note?: string;
  category?: string;
  isOverrun: boolean;
  project?: Project;
  client?: Client;
}

export interface RunningTimer {
  _id: string;
  organizationId?: string;
  userId?: string;
  projectId: string;
  startedAt: number;
  lastHeartbeatAt: number;
  awaitingInterruptAck: boolean;
  nextInterruptAt?: number;
  pomodoroEnabled?: boolean;
  pomodoroPhase?: "work" | "break";
  pomodoroTransitionAt?: number;
  pomodoroWorkMinutes?: number;
  pomodoroBreakMinutes?: number;
  pomodoroCurrentCycle?: number;
  pomodoroCompletedCycles?: number;
  category?: string;
  project?: Project;
  client?: Client;
}

export interface UserSettings {
  interruptInterval?: number;
  interruptEnabled?: boolean;
  pomodoroWorkMinutes?: number;
  pomodoroBreakMinutes?: number;
  notificationSound?: string;
  currency?: string;
}

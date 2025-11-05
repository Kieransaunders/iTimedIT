import type { Id } from "@/convex/_generated/dataModel";

/**
 * User model (from Convex Auth)
 */
export interface User {
  _id: Id<"users">;
  _creationTime: number;
  name?: string;
  email?: string;
  emailVerified?: boolean;
  image?: string;
  isAnonymous?: boolean;
}

/**
 * Category model
 * Represents a time entry category for organizing work
 */
export interface Category {
  _id: Id<"categories">;
  _creationTime: number;
  name: string;
  color?: string;
  isDefault: boolean;
  organizationId: Id<"organizations">;
  userId?: Id<"users">; // Personal category if set
}

/**
 * Project model with optional client information
 */
export interface Project {
  _id: Id<"projects">;
  _creationTime: number;
  name: string;
  color?: string; // Optional - not stored in DB, may be computed
  hourlyRate: number;
  budgetHours?: number;
  budgetAmount?: number;
  budgetType: "hours" | "amount";
  organizationId?: Id<"organizations">;
  clientId?: Id<"clients">;
  client?: Client | null;
  archived: boolean;
  workspaceType?: "personal" | "work";
  createdBy?: Id<"users">;
  ownerId?: Id<"users">;
  // Computed fields from Convex queries
  budgetRemaining?: number;
  budgetRemainingFormatted?: string;
  totalSeconds?: number;
  totalHours?: number;
  totalHoursFormatted?: string;
  lastActivityAt?: number;
}

/**
 * Client model
 */
export interface Client {
  _id: Id<"clients">;
  _creationTime: number;
  name: string;
  color?: string;
  organizationId: Id<"organizations">;
  archived: boolean;
  workspaceType?: "personal" | "work";
}

/**
 * Time entry model
 */
export interface TimeEntry {
  _id: Id<"timeEntries">;
  _creationTime: number;
  userId: Id<"users">;
  organizationId: Id<"organizations">;
  projectId: Id<"projects">;
  categoryId?: Id<"categories">;
  startedAt: number;
  stoppedAt?: number;
  seconds: number;
  note?: string;
  project?: Project;
  category?: Category;
}

/**
 * Running timer model
 */
export interface RunningTimer {
  _id: Id<"runningTimers">;
  _creationTime: number;
  userId?: Id<"users">;
  organizationId?: Id<"organizations">;
  ownerId?: Id<"users">;
  projectId: Id<"projects">;
  categoryId?: Id<"categories">;
  category?: string;
  startedAt: number;
  lastHeartbeatAt: number;
  startedFrom?: "web" | "mobile";
  awaitingInterruptAck: boolean;
  interruptShownAt?: number;
  nextInterruptAt?: number;
  budgetWarningSentAt?: number;
  budgetWarningType?: "time" | "amount";
  overrunAlertSentAt?: number;
  lastNudgeSentAt?: number;
  pomodoroEnabled?: boolean;
  pomodoroPhase?: "work" | "break";
  pomodoroTransitionAt?: number;
  pomodoroWorkMinutes?: number;
  pomodoroBreakMinutes?: number;
  isBreakTimer?: boolean;
  breakStartedAt?: number;
  breakEndsAt?: number;
  pomodoroCurrentCycle?: number;
  pomodoroCompletedCycles?: number;
  pomodoroSessionStartedAt?: number;
  endedAt?: number;
  // Computed fields
  project?: Project;
}

/**
 * User settings model
 */
export interface UserSettings {
  _id: Id<"userSettings">;
  _creationTime: number;
  userId: Id<"users">;
  organizationId?: Id<"organizations">;
  interruptInterval: number; // Minutes: 1-480 (1 min - 8 hours)
  interruptEnabled: boolean;
  gracePeriod?: number; // Seconds: 5-300 (5 sec - 5 min)
  budgetWarningEnabled?: boolean;
  budgetWarningThresholdHours?: number;
  budgetWarningThresholdAmount?: number;
  pomodoroEnabled?: boolean;
  pomodoroWorkMinutes?: number;
  pomodoroBreakMinutes?: number;
  notificationSound?: string;
  currency?: "USD" | "EUR" | "GBP";
}

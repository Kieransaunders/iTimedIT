/**
 * Timer helper functions with defensive programming
 *
 * This module provides safe helper functions for timer operations
 * with comprehensive error handling and validation.
 */

import { Doc, Id } from "./_generated/dataModel";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
  throwAppError,
  validateNumber,
} from "./errorHandling";

/**
 * Safely check if a project belongs to a personal workspace
 */
export function isPersonalProject(project: Doc<"projects"> | null | undefined): boolean {
  if (!project) {
    return false;
  }
  return project.workspaceType === "personal" || project.organizationId === undefined;
}

/**
 * Safely check if a project is archived
 */
export function isProjectArchived(project: Doc<"projects"> | null | undefined): boolean {
  return project?.archived === true;
}

/**
 * Validate project exists and is accessible
 */
export function validateProject(
  project: Doc<"projects"> | null | undefined,
  projectId?: Id<"projects">
): asserts project is Doc<"projects"> {
  if (!project) {
    throwAppError(NotFoundError.project(projectId));
  }
}

/**
 * Validate project is not archived
 */
export function validateProjectNotArchived(project: Doc<"projects">): void {
  if (isProjectArchived(project)) {
    throwAppError(
      ConflictError.archivedResource("project")
    );
  }
}

/**
 * Validate project ownership for personal workspace
 */
export function validatePersonalProjectOwnership(
  project: Doc<"projects">,
  userId: Id<"users">
): void {
  if (project.ownerId !== userId) {
    throwAppError(
      AuthorizationError.forbidden("personal project")
    );
  }
}

/**
 * Validate project belongs to organization
 */
export function validateProjectOrganization(
  project: Doc<"projects">,
  organizationId: Id<"organizations">
): void {
  if (project.organizationId !== organizationId) {
    throwAppError(
      AuthorizationError.organizationMismatch()
    );
  }
}

/**
 * Validate timer settings
 */
export interface TimerSettings {
  interruptInterval: number;
  interruptEnabled: boolean;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  gracePeriod?: number;
}

export function validateTimerSettings(settings: Partial<TimerSettings>): void {
  if (settings.interruptInterval !== undefined) {
    validateNumber(settings.interruptInterval, "interrupt interval", {
      min: 1,
      max: 480, // 8 hours max
      required: true,
    });
  }

  if (settings.pomodoroWorkMinutes !== undefined) {
    validateNumber(settings.pomodoroWorkMinutes, "Pomodoro work duration", {
      min: 1,
      max: 120, // 2 hours max
      required: true,
    });
  }

  if (settings.pomodoroBreakMinutes !== undefined) {
    validateNumber(settings.pomodoroBreakMinutes, "Pomodoro break duration", {
      min: 1,
      max: 60, // 1 hour max
      required: true,
    });
  }

  if (settings.gracePeriod !== undefined) {
    validateNumber(settings.gracePeriod, "grace period", {
      min: 5,
      max: 300, // 5 minutes max
      required: true,
    });
  }
}

/**
 * Calculate next interrupt time
 */
export function calculateNextInterruptTime(
  interruptInterval: number,
  enabled: boolean
): number | undefined {
  if (!enabled) {
    return undefined;
  }

  const now = Date.now();
  const intervalMs = interruptInterval * 60 * 1000;

  // Add 1 second buffer to avoid immediate trigger
  return now + intervalMs + 1000;
}

/**
 * Calculate next Pomodoro transition time
 */
export function calculatePomodoroTransitionTime(
  workMinutes: number,
  enabled: boolean
): number | undefined {
  if (!enabled) {
    return undefined;
  }

  const now = Date.now();
  const workMs = workMinutes * 60 * 1000;

  // Add 1 second buffer
  return now + workMs + 1000;
}

/**
 * Safely calculate elapsed seconds
 */
export function calculateElapsedSeconds(
  startedAt: number,
  stoppedAt?: number
): number {
  const endTime = stoppedAt ?? Date.now();

  // Ensure positive duration
  const durationMs = Math.max(0, endTime - startedAt);

  // Convert to seconds and floor
  return Math.floor(durationMs / 1000);
}

/**
 * Validate timer exists
 */
export function validateTimerExists(
  timer: Doc<"runningTimers"> | null | undefined
): asserts timer is Doc<"runningTimers"> {
  if (!timer) {
    throwAppError(NotFoundError.timer());
  }
}

/**
 * Check if timer is awaiting interrupt acknowledgement
 */
export function isAwaitingInterruptAck(timer: Doc<"runningTimers"> | null | undefined): boolean {
  return timer?.awaitingInterruptAck === true;
}

/**
 * Check if timer has timed out for interrupt acknowledgement
 */
export function hasInterruptAckTimedOut(
  timer: Doc<"runningTimers">,
  gracePeriodSeconds: number = 60
): boolean {
  if (!timer.awaitingInterruptAck || !timer.interruptShownAt) {
    return false;
  }

  const now = Date.now();
  const elapsedMs = now - timer.interruptShownAt;
  const gracePeriodMs = gracePeriodSeconds * 1000;

  return elapsedMs > gracePeriodMs;
}

/**
 * Get timer source type for logging
 */
export function getTimerSource(timer: Doc<"runningTimers"> | null | undefined): string {
  return timer?.startedFrom ?? "unknown";
}

/**
 * Validate budget configuration
 */
export function validateBudget(
  budgetType: "hours" | "amount",
  budgetHours?: number,
  budgetAmount?: number
): void {
  if (budgetType === "hours") {
    if (budgetHours === undefined || budgetHours === null) {
      throwAppError(
        ValidationError.required("budget hours")
      );
    }
    validateNumber(budgetHours, "budget hours", {
      min: 0.1,
      max: 10000, // Reasonable max
      required: true,
    });
  } else if (budgetType === "amount") {
    if (budgetAmount === undefined || budgetAmount === null) {
      throwAppError(
        ValidationError.required("budget amount")
      );
    }
    validateNumber(budgetAmount, "budget amount", {
      min: 0.01,
      max: 10000000, // Reasonable max
      required: true,
    });
  }
}

/**
 * Calculate budget remaining
 */
export interface BudgetInfo {
  remaining: number;
  remainingFormatted: string;
  isOverBudget: boolean;
  percentUsed: number;
}

export function calculateBudgetRemaining(
  project: Doc<"projects">,
  totalSeconds: number,
  hourlyRate: number
): BudgetInfo | null {
  if (!project.budgetType) {
    return null;
  }

  const totalHours = totalSeconds / 3600;
  const totalAmount = totalHours * hourlyRate;

  if (project.budgetType === "hours" && project.budgetHours) {
    const budgetSeconds = project.budgetHours * 3600;
    const remainingSeconds = budgetSeconds - totalSeconds;
    const remaining = Math.max(0, remainingSeconds / 3600);
    const percentUsed = Math.min(100, (totalSeconds / budgetSeconds) * 100);

    return {
      remaining,
      remainingFormatted: `${remaining.toFixed(1)}h`,
      isOverBudget: remainingSeconds < 0,
      percentUsed,
    };
  } else if (project.budgetType === "amount" && project.budgetAmount) {
    const remaining = Math.max(0, project.budgetAmount - totalAmount);
    const percentUsed = Math.min(100, (totalAmount / project.budgetAmount) * 100);

    return {
      remaining,
      remainingFormatted: `$${remaining.toFixed(2)}`,
      isOverBudget: remaining === 0,
      percentUsed,
    };
  }

  return null;
}

/**
 * Safe error logging with context
 */
export function logTimerError(
  context: string,
  error: any,
  metadata?: Record<string, any>
): void {
  console.error(`[Timer Error - ${context}]`, {
    error: error?.message || String(error),
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Safe timer cleanup - ensures all related data is properly cleaned up
 */
export interface TimerCleanupResult {
  timerDeleted: boolean;
  entryUpdated: boolean;
  errors: string[];
}

export function createCleanupResult(): TimerCleanupResult {
  return {
    timerDeleted: false,
    entryUpdated: false,
    errors: [],
  };
}

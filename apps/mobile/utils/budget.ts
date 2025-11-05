import { Project } from "@/types/models";

/**
 * Budget status levels
 * - safe: Usage < 80% of budget
 * - warning: Usage >= 80% and < 100% of budget
 * - critical: Usage >= 100% of budget (over budget)
 */
export type BudgetStatus = "safe" | "warning" | "critical" | "none";

export interface BudgetInfo {
  status: BudgetStatus;
  usagePercent: number;
  isOverBudget: boolean;
  isNearBudget: boolean;
  budgetRemaining: number;
  totalUsed: number;
  totalBudget: number;
  warningColor: string;
}

/**
 * Calculate budget status for a project
 *
 * @param project - Project with budget and usage data
 * @returns BudgetInfo with status, percentages, and warning colors
 */
export function calculateBudgetStatus(project: Project | null | undefined): BudgetInfo {
  // Default safe state if no project or no budget
  const defaultInfo: BudgetInfo = {
    status: "none",
    usagePercent: 0,
    isOverBudget: false,
    isNearBudget: false,
    budgetRemaining: 0,
    totalUsed: 0,
    totalBudget: 0,
    warningColor: "#22c55e", // Green
  };

  if (!project) {
    return defaultInfo;
  }

  const totalSeconds = project.totalSeconds ?? 0;
  const totalHours = totalSeconds / 3600;
  const totalAmount = totalHours * project.hourlyRate;

  let totalBudget = 0;
  let totalUsed = 0;
  let budgetRemaining = project.budgetRemaining ?? 0;

  // Calculate based on budget type
  if (project.budgetType === "hours" && project.budgetHours) {
    totalBudget = project.budgetHours;
    totalUsed = totalHours;
  } else if (project.budgetType === "amount" && project.budgetAmount) {
    totalBudget = project.budgetAmount;
    totalUsed = totalAmount;
  } else {
    // No budget set
    return defaultInfo;
  }

  // Calculate usage percentage
  const usagePercent = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;

  // Determine status
  let status: BudgetStatus = "safe";
  let warningColor = "#22c55e"; // Green
  let isOverBudget = false;
  let isNearBudget = false;

  if (usagePercent >= 100) {
    status = "critical";
    warningColor = "#ef4444"; // Red
    isOverBudget = true;
  } else if (usagePercent >= 80) {
    status = "warning";
    warningColor = "#f59e0b"; // Amber
    isNearBudget = true;
  } else {
    status = "safe";
    warningColor = "#22c55e"; // Green
  }

  return {
    status,
    usagePercent,
    isOverBudget,
    isNearBudget,
    budgetRemaining,
    totalUsed,
    totalBudget,
    warningColor,
  };
}

/**
 * Format budget remaining for display
 *
 * @param project - Project with budget data
 * @param currentTimerSeconds - Current running timer seconds (optional, for real-time display)
 * @returns Formatted string like "2.5h left" or "$150 left"
 */
export function formatBudgetRemaining(
  project: Project | null | undefined,
  currentTimerSeconds: number = 0
): string {
  if (!project) {
    return "";
  }

  // Calculate budget info with current timer included
  const totalSeconds = (project.totalSeconds ?? 0) + currentTimerSeconds;
  const totalHours = totalSeconds / 3600;
  const totalAmount = totalHours * project.hourlyRate;

  let budgetRemaining = 0;
  let hasBudget = false;

  if (project.budgetType === "hours" && project.budgetHours) {
    hasBudget = true;
    const budgetSeconds = project.budgetHours * 3600;
    budgetRemaining = budgetSeconds - totalSeconds;
  } else if (project.budgetType === "amount" && project.budgetAmount) {
    hasBudget = true;
    budgetRemaining = project.budgetAmount - totalAmount;
  }

  if (!hasBudget) {
    return "";
  }

  // Format based on whether over budget or not
  const isOverBudget = budgetRemaining < 0;

  if (isOverBudget) {
    if (project.budgetType === "hours") {
      const overHours = Math.abs(budgetRemaining / 3600);
      return `${overHours.toFixed(1)}h over`;
    } else {
      return `$${Math.abs(budgetRemaining).toFixed(0)} over`;
    }
  }

  if (project.budgetType === "hours") {
    const hoursRemaining = budgetRemaining / 3600;
    const minutes = Math.floor((hoursRemaining % 1) * 60);
    const hours = Math.floor(hoursRemaining);
    return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  } else {
    return `$${budgetRemaining.toFixed(0)} left`;
  }
}

/**
 * Get budget progress percentage for progress bars
 * Capped at 100% for visual consistency
 *
 * @param project - Project with budget data
 * @returns Percentage from 0-100
 */
export function getBudgetProgressPercent(project: Project | null | undefined): number {
  const budgetInfo = calculateBudgetStatus(project);
  return Math.min(budgetInfo.usagePercent, 100);
}

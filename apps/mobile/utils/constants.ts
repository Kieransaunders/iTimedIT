/**
 * App-wide constants
 */

// Timer constants
export const HEARTBEAT_INTERVAL = 30000; // 30 seconds in milliseconds
export const DEFAULT_INTERRUPT_INTERVAL = 60; // 60 minutes
export const DEFAULT_POMODORO_WORK_MINUTES = 25;
export const DEFAULT_POMODORO_BREAK_MINUTES = 5;

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_SETTINGS: "user_settings",
  CACHED_PROJECTS: "cached_projects",
  CACHED_CATEGORIES: "cached_categories",
  CACHED_ENTRIES: "cached_entries",
  TIMER_START_TIME: "timer_start_time",
  SELECTED_PROJECT: "selected_project",
  SELECTED_CATEGORY: "selected_category",
} as const;

// Notification categories
export const NOTIFICATION_CATEGORIES = {
  TIMER_INTERRUPT: "timer-interrupt",
  BUDGET_WARNING: "budget-warning",
  BUDGET_OVERRUN: "budget-overrun",
  POMODORO_BREAK: "pomodoro-break",
  POMODORO_WORK: "pomodoro-work",
} as const;

// Notification actions
export const NOTIFICATION_ACTIONS = {
  CONTINUE: "continue",
  STOP: "stop",
  SNOOZE: "snooze",
} as const;

// App configuration
export const APP_CONFIG = {
  MIN_TOUCH_TARGET_SIZE: 44,
  MAX_RECENT_PROJECTS: 3,
  MAX_RECENT_ENTRIES: 10,
  ENTRIES_PER_PAGE: 20,
} as const;

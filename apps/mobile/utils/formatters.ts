/**
 * Utility functions for formatting data
 */

/**
 * Format elapsed time in seconds to MM:SS format
 * @param seconds Total seconds
 * @returns Formatted time string (e.g., "12:34")
 */
export function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format duration in seconds to hours and minutes
 * @param seconds Total seconds
 * @returns Formatted duration string (e.g., "2h 30m")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Format duration in seconds to decimal hours
 * @param seconds Total seconds
 * @returns Formatted hours (e.g., "2.5")
 */
export function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours.toFixed(2);
}

/**
 * Format currency amount
 * @param amount Amount in dollars
 * @param currency Currency code (default: USD)
 * @returns Formatted currency string (e.g., "$123.45")
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Format date to readable string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

/**
 * Format date and time to readable string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date and time string (e.g., "Jan 15, 2024 at 3:45 PM")
 */
export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/**
 * Format time to readable string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted time string (e.g., "3:45 PM")
 */
export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param timestamp Unix timestamp in milliseconds
 * @returns Relative time string
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

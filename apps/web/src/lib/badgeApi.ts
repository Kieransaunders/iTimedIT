/**
 * Badge API utilities for showing notification counts on the app icon
 * Supports both the Badging API and fallback for unsupported browsers
 */

interface Navigator {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

/**
 * Check if the Badge API is supported
 */
export function isBadgeSupported(): boolean {
  return 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
}

/**
 * Set the app badge count
 * @param count - Number to display on the badge (0 or undefined to clear)
 */
export async function setAppBadge(count?: number): Promise<void> {
  if (!isBadgeSupported()) {
    console.log('Badge API not supported');
    return;
  }

  try {
    const nav = navigator as Navigator;
    if (count === undefined || count === 0) {
      await nav.clearAppBadge?.();
      console.log('App badge cleared');
    } else {
      await nav.setAppBadge?.(count);
      console.log('App badge set to:', count);
    }
  } catch (error) {
    console.error('Error setting app badge:', error);
  }
}

/**
 * Clear the app badge
 */
export async function clearAppBadge(): Promise<void> {
  if (!isBadgeSupported()) {
    return;
  }

  try {
    const nav = navigator as Navigator;
    await nav.clearAppBadge?.();
    console.log('App badge cleared');
  } catch (error) {
    console.error('Error clearing app badge:', error);
  }
}

/**
 * Increment the current badge count
 * Note: This requires tracking the count in your application state
 * as the Badge API doesn't provide a way to read the current value
 */
export async function incrementBadge(currentCount: number): Promise<void> {
  await setAppBadge(currentCount + 1);
}

/**
 * Update badge based on timer state and notifications
 * @param hasRunningTimer - Whether a timer is currently running
 * @param notificationCount - Number of unread notifications
 */
export async function updateBadgeForTimer(
  hasRunningTimer: boolean,
  notificationCount: number = 0
): Promise<void> {
  if (!isBadgeSupported()) {
    return;
  }

  // Show count if there are notifications, or 1 if timer is running
  const badgeCount = notificationCount > 0 ? notificationCount : hasRunningTimer ? 1 : 0;
  await setAppBadge(badgeCount);
}

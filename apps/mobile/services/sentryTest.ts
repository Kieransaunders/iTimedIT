/**
 * Sentry Test Utilities
 *
 * This file provides utilities to test Sentry integration.
 * ONLY use these in development mode for testing purposes.
 */

import * as Sentry from "@sentry/react-native";

/**
 * Send a test error to Sentry
 * Use this to verify Sentry is properly configured
 */
export function sendTestError() {
  if (__DEV__) {
    console.log("Sending test error to Sentry...");
    Sentry.captureException(new Error("Test error from iTimedIT mobile app"), {
      level: "info",
      tags: {
        type: "test",
        platform: "mobile",
      },
      extra: {
        message: "This is a test error to verify Sentry integration",
        timestamp: new Date().toISOString(),
      },
    });
    console.log("Test error sent to Sentry");
  } else {
    console.warn("Test errors can only be sent in development mode");
  }
}

/**
 * Send a test message to Sentry
 */
export function sendTestMessage(message: string) {
  if (__DEV__) {
    console.log("Sending test message to Sentry:", message);
    Sentry.captureMessage(message, {
      level: "info",
      tags: {
        type: "test",
        platform: "mobile",
      },
    });
    console.log("Test message sent to Sentry");
  } else {
    console.warn("Test messages can only be sent in development mode");
  }
}

/**
 * Add breadcrumb to Sentry
 * Breadcrumbs help track the sequence of events leading to an error
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: "info",
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context in Sentry
 * This helps identify which user experienced an error
 */
export function setUserContext(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Set custom context/tags for better error tracking
 */
export function setCustomContext(key: string, value: Record<string, any>) {
  Sentry.setContext(key, value);
}

/**
 * Set custom tag for filtering errors in Sentry dashboard
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

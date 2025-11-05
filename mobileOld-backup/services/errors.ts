/**
 * Error handling utilities for Google OAuth authentication
 * 
 * This module provides:
 * - Error type categorization
 * - User-friendly error messages
 * - Error logging utilities
 * - Error recovery suggestions
 */

/**
 * Categories of errors that can occur during OAuth flow
 */
export enum ErrorCategory {
  USER_CANCELLATION = 'USER_CANCELLATION',
  NETWORK = 'NETWORK',
  OAUTH = 'OAUTH',
  CONVEX = 'CONVEX',
  CONFIGURATION = 'CONFIGURATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured error information
 */
export interface AuthError {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  originalError?: Error | any;
  recoverable: boolean;
  retryable: boolean;
  timestamp: number;
}

/**
 * Creates a structured auth error
 */
export function createAuthError(
  category: ErrorCategory,
  message: string,
  userMessage: string,
  originalError?: Error | any,
  recoverable: boolean = true,
  retryable: boolean = true
): AuthError {
  return {
    category,
    message,
    userMessage,
    originalError,
    recoverable,
    retryable,
    timestamp: Date.now(),
  };
}

/**
 * Categorizes an error based on its properties
 */
export function categorizeError(error: any): ErrorCategory {
  if (!error) {
    return ErrorCategory.UNKNOWN;
  }

  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  // Configuration errors (check first as they may contain other keywords)
  if (
    errorMessage.includes('not configured') ||
    errorMessage.includes('missing') ||
    errorMessage.includes('environment variable') ||
    (errorMessage.includes('client_id') && errorMessage.includes('undefined'))
  ) {
    return ErrorCategory.CONFIGURATION;
  }

  // User cancellation
  if (
    errorMessage.includes('cancel') ||
    errorMessage.includes('dismiss') ||
    errorCode.includes('cancel') ||
    errorCode === 'user_cancelled'
  ) {
    return ErrorCategory.USER_CANCELLATION;
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('offline') ||
    errorCode.includes('network') ||
    errorCode === 'etimedout' ||
    errorCode === 'econnrefused'
  ) {
    return ErrorCategory.NETWORK;
  }

  // OAuth errors
  if (
    errorMessage.includes('oauth') ||
    errorMessage.includes('authorization') ||
    errorMessage.includes('invalid_grant') ||
    errorMessage.includes('access_denied') ||
    errorMessage.includes('redirect_uri') ||
    errorMessage.includes('client_id') ||
    errorMessage.includes('state parameter') ||
    errorCode.includes('oauth')
  ) {
    return ErrorCategory.OAUTH;
  }

  // Convex errors
  if (
    errorMessage.includes('convex') ||
    errorMessage.includes('token exchange') ||
    errorMessage.includes('session') ||
    errorCode.includes('convex')
  ) {
    return ErrorCategory.CONVEX;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Gets a user-friendly error message based on error category
 */
export function getUserFriendlyMessage(category: ErrorCategory, originalMessage?: string): string {
  switch (category) {
    case ErrorCategory.USER_CANCELLATION:
      return 'Sign in was cancelled';

    case ErrorCategory.NETWORK:
      return 'Unable to connect. Please check your internet connection and try again.';

    case ErrorCategory.OAUTH:
      return 'Authentication failed. Please try signing in again.';

    case ErrorCategory.CONVEX:
      return 'Failed to complete sign in. Please try again.';

    case ErrorCategory.CONFIGURATION:
      return 'Sign in with Google is temporarily unavailable. Please try again later.';

    case ErrorCategory.UNKNOWN:
    default:
      return originalMessage || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Determines if an error is recoverable (user can try again)
 */
export function isRecoverable(category: ErrorCategory): boolean {
  switch (category) {
    case ErrorCategory.USER_CANCELLATION:
      return true; // User can try again
    case ErrorCategory.NETWORK:
      return true; // Network might come back
    case ErrorCategory.OAUTH:
      return true; // OAuth might work on retry
    case ErrorCategory.CONVEX:
      return true; // Server might recover
    case ErrorCategory.CONFIGURATION:
      return false; // Needs developer intervention
    case ErrorCategory.UNKNOWN:
      return true; // Assume recoverable
    default:
      return true;
  }
}

/**
 * Determines if an error should trigger an automatic retry
 */
export function isRetryable(category: ErrorCategory): boolean {
  switch (category) {
    case ErrorCategory.USER_CANCELLATION:
      return false; // Don't auto-retry user cancellation
    case ErrorCategory.NETWORK:
      return true; // Can retry network errors
    case ErrorCategory.OAUTH:
      return false; // OAuth errors usually need user action
    case ErrorCategory.CONVEX:
      return true; // Can retry server errors
    case ErrorCategory.CONFIGURATION:
      return false; // Configuration errors need fixing
    case ErrorCategory.UNKNOWN:
      return false; // Don't auto-retry unknown errors
    default:
      return false;
  }
}

/**
 * Logs an error with appropriate detail level
 */
export function logAuthError(error: AuthError, context?: string): void {
  const prefix = context ? `[${context}]` : '[Auth Error]';
  
  console.error(`${prefix} ${error.category}:`, {
    message: error.message,
    userMessage: error.userMessage,
    recoverable: error.recoverable,
    retryable: error.retryable,
    timestamp: new Date(error.timestamp).toISOString(),
    originalError: error.originalError,
  });

  // In production, you might want to send this to a logging service
  // Example: Sentry.captureException(error.originalError, { extra: { category: error.category } });
}

/**
 * Handles an error and returns a structured AuthError
 */
export function handleAuthError(error: any, context?: string): AuthError {
  const category = categorizeError(error);
  const userMessage = getUserFriendlyMessage(category, error?.message);
  const recoverable = isRecoverable(category);
  const retryable = isRetryable(category);

  const authError = createAuthError(
    category,
    error?.message || 'Unknown error',
    userMessage,
    error,
    recoverable,
    retryable
  );

  logAuthError(authError, context);

  return authError;
}

/**
 * Checks if an error should be shown to the user
 * Some errors (like user cancellation) don't need to be displayed
 */
export function shouldShowError(category: ErrorCategory): boolean {
  return category !== ErrorCategory.USER_CANCELLATION;
}

/**
 * Gets a recovery suggestion for the user based on error category
 */
export function getRecoverySuggestion(category: ErrorCategory): string | null {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Check your internet connection and try again';
    case ErrorCategory.OAUTH:
      return 'Make sure you have a Google account and try again';
    case ErrorCategory.CONVEX:
      return 'Please wait a moment and try again';
    case ErrorCategory.CONFIGURATION:
      return 'Please contact support if this issue persists';
    default:
      return null;
  }
}

/**
 * Centralized error handling for React Native mobile app
 *
 * This module provides consistent error handling across the mobile app
 * with user-friendly error messages and proper logging.
 */

import { Alert } from "react-native";

/**
 * Error categories matching backend
 */
export enum ErrorCategory {
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  NETWORK = "NETWORK",
  DATABASE = "DATABASE",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  INTERNAL = "INTERNAL",
  UNKNOWN = "UNKNOWN",
}

/**
 * Structured app error
 */
export interface AppError {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  details?: Record<string, any>;
  retryable: boolean;
  timestamp: number;
}

/**
 * Check if error is a Convex error with structured data
 */
export function isConvexError(error: any): boolean {
  return (
    error &&
    typeof error === "object" &&
    ("data" in error || "code" in error)
  );
}

/**
 * Extract error data from Convex error
 */
export function extractConvexErrorData(error: any): Partial<AppError> | null {
  if (!isConvexError(error)) {
    return null;
  }

  const data = error.data || {};

  return {
    category: data.category || ErrorCategory.INTERNAL,
    message: data.message || error.message,
    userMessage: data.userMessage || error.message,
    details: data.details,
    retryable: data.retryable ?? false,
    timestamp: data.timestamp || Date.now(),
  };
}

/**
 * Create a standardized error
 */
export function createAppError(
  category: ErrorCategory,
  message: string,
  userMessage: string,
  details?: Record<string, any>,
  retryable: boolean = false
): AppError {
  return {
    category,
    message,
    userMessage,
    details,
    retryable,
    timestamp: Date.now(),
  };
}

/**
 * Handle error and show appropriate alert
 */
export function handleError(
  error: any,
  context?: string,
  onRetry?: () => void
): void {
  console.error(`Error${context ? ` in ${context}` : ""}:`, error);

  // Extract error data
  const convexData = extractConvexErrorData(error);
  const errorData = convexData || {
    category: ErrorCategory.INTERNAL,
    message: error?.message || String(error),
    userMessage:
      "An unexpected error occurred. Please try again or contact support.",
    retryable: true,
  };

  // Prepare alert buttons
  const buttons: any[] = [
    {
      text: "OK",
      style: "default",
    },
  ];

  // Add retry button if applicable
  if (errorData.retryable && onRetry) {
    buttons.unshift({
      text: "Retry",
      onPress: onRetry,
    });
  }

  // Show alert with user-friendly message
  Alert.alert(
    getErrorTitle(errorData.category || ErrorCategory.UNKNOWN),
    errorData.userMessage,
    buttons
  );
}

/**
 * Handle error silently (log only, no UI)
 */
export function handleErrorSilently(error: any, context?: string): void {
  console.error(`[Silent Error${context ? ` - ${context}` : ""}]:`, {
    message: error?.message || String(error),
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get appropriate title for error category
 */
function getErrorTitle(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return "Authentication Required";
    case ErrorCategory.AUTHORIZATION:
      return "Access Denied";
    case ErrorCategory.VALIDATION:
      return "Invalid Input";
    case ErrorCategory.NOT_FOUND:
      return "Not Found";
    case ErrorCategory.CONFLICT:
      return "Action Not Allowed";
    case ErrorCategory.NETWORK:
      return "Network Error";
    case ErrorCategory.DATABASE:
      return "Database Error";
    case ErrorCategory.EXTERNAL_SERVICE:
      return "Service Unavailable";
    default:
      return "Error";
  }
}

/**
 * Wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
  onError?: (error: any) => void,
  showAlert: boolean = true
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error${context ? ` in ${context}` : ""}:`, error);

    // Call custom error handler if provided
    if (onError) {
      onError(error);
    }

    // Show alert if requested
    if (showAlert) {
      handleError(error, context);
    }

    return null;
  }
}

/**
 * Network error helpers
 */
export class NetworkError {
  static offline(): AppError {
    return createAppError(
      ErrorCategory.NETWORK,
      "Network offline",
      "No internet connection. Please check your network settings.",
      undefined,
      true
    );
  }

  static timeout(): AppError {
    return createAppError(
      ErrorCategory.NETWORK,
      "Request timeout",
      "The request took too long. Please try again.",
      undefined,
      true
    );
  }

  static serverError(): AppError {
    return createAppError(
      ErrorCategory.NETWORK,
      "Server error",
      "The server is experiencing issues. Please try again later.",
      undefined,
      true
    );
  }
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const message = String(error.message || error).toLowerCase();

  return (
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("offline") ||
    message.includes("fetch failed") ||
    message.includes("econnrefused")
  );
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Check if explicitly marked as retryable
  const convexData = extractConvexErrorData(error);
  if (convexData?.retryable) {
    return true;
  }

  // Network errors are generally retryable
  if (isNetworkError(error)) {
    return true;
  }

  // Check error category
  if (convexData?.category) {
    const category = convexData.category;
    return (
      category === ErrorCategory.NETWORK ||
      category === ErrorCategory.DATABASE ||
      category === ErrorCategory.EXTERNAL_SERVICE
    );
  }

  return false;
}

/**
 * Format error for display
 */
export function formatErrorMessage(error: any, includeDetails: boolean = false): string {
  const convexData = extractConvexErrorData(error);

  if (convexData) {
    let message = convexData.userMessage || convexData.message || "An error occurred";

    if (includeDetails && convexData.details) {
      const detailsStr = Object.entries(convexData.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      message += `\n\nDetails: ${detailsStr}`;
    }

    return message;
  }

  return error?.message || String(error) || "An unexpected error occurred";
}

/**
 * Log error with context
 */
export function logError(
  error: any,
  context: string,
  metadata?: Record<string, any>
): void {
  const errorInfo = {
    context,
    message: error?.message || String(error),
    stack: error?.stack,
    convexData: extractConvexErrorData(error),
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  console.error("[Error]", JSON.stringify(errorInfo, null, 2));

  // TODO: Send to error tracking service (Sentry, etc.)
}

/**
 * Create a retry handler with exponential backoff
 */
export function createRetryHandler<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  }
): () => Promise<T> {
  const opts = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    ...options,
  };

  return async () => {
    let lastError: any;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry if error is not retryable
        if (!isRetryableError(error)) {
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt === opts.maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          opts.baseDelay * Math.pow(2, attempt),
          opts.maxDelay
        );

        console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`);

        // Call retry callback if provided
        if (opts.onRetry) {
          opts.onRetry(attempt + 1, error);
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };
}

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers(): void {
  // Note: React Native handles uncaught errors differently
  // This is more for logging purposes

  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    logError(error, "Global Error Handler", { isFatal });

    // Call original handler
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

import { Alert } from "react-native";

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export interface NetworkErrorState {
  isOffline: boolean;
  hasNetworkError: boolean;
  retryCount: number;
  lastError: Error | null;
}

export class NetworkErrorHandler {
  private static defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  /**
   * Retry a function with exponential backoff
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt
        if (attempt === opts.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          opts.baseDelay * Math.pow(opts.backoffFactor, attempt),
          opts.maxDelay
        );

        console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Network-related errors that should be retried
    const retryableErrors = [
      'network request failed',
      'timeout',
      'connection refused',
      'connection reset',
      'connection aborted',
      'socket hang up',
      'enotfound',
      'econnreset',
      'econnrefused',
      'etimedout',
    ];

    return retryableErrors.some(retryableError => 
      message.includes(retryableError)
    );
  }

  /**
   * Check if error indicates offline status
   */
  static isOfflineError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('network request failed') || 
           message.includes('no internet connection') ||
           message.includes('offline');
  }

  /**
   * Show user-friendly error message with retry option
   */
  static showNetworkError(
    error: Error,
    onRetry?: () => void,
    customMessage?: string
  ): void {
    const isOffline = this.isOfflineError(error);
    const title = isOffline ? "No Internet Connection" : "Network Error";
    const message = customMessage || (isOffline 
      ? "Please check your internet connection and try again."
      : "There was a problem connecting to the server. Please try again."
    );

    const buttons = onRetry 
      ? [
          { text: "Cancel", style: "cancel" as const },
          { text: "Retry", onPress: onRetry }
        ]
      : [{ text: "OK" }];

    Alert.alert(title, message, buttons);
  }

  /**
   * Create a network error state object
   */
  static createErrorState(error: Error | null, retryCount: number = 0): NetworkErrorState {
    return {
      isOffline: error ? this.isOfflineError(error) : false,
      hasNetworkError: !!error,
      retryCount,
      lastError: error,
    };
  }

  /**
   * Delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Hook-like utility for managing network error state
 */
export function createNetworkErrorManager() {
  let errorState: NetworkErrorState = {
    isOffline: false,
    hasNetworkError: false,
    retryCount: 0,
    lastError: null,
  };

  const setError = (error: Error | null, retryCount: number = 0) => {
    errorState = NetworkErrorHandler.createErrorState(error, retryCount);
  };

  const clearError = () => {
    errorState = NetworkErrorHandler.createErrorState(null);
  };

  const getState = () => ({ ...errorState });

  return {
    setError,
    clearError,
    getState,
  };
}
/**
 * Unit tests for error handling utilities
 */

import {
  ErrorCategory,
  createAuthError,
  categorizeError,
  getUserFriendlyMessage,
  isRecoverable,
  isRetryable,
  handleAuthError,
  shouldShowError,
  getRecoverySuggestion,
} from '@/services/errors';

describe('Error Handling Utilities', () => {
  describe('createAuthError', () => {
    it('should create a structured auth error', () => {
      const error = createAuthError(
        ErrorCategory.NETWORK,
        'Network timeout',
        'Please check your connection',
        new Error('ETIMEDOUT'),
        true,
        true
      );

      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.message).toBe('Network timeout');
      expect(error.userMessage).toBe('Please check your connection');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeDefined();
      expect(error.originalError).toBeDefined();
    });

    it('should use default values for optional parameters', () => {
      const error = createAuthError(
        ErrorCategory.OAUTH,
        'OAuth failed',
        'Please try again'
      );

      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.originalError).toBeUndefined();
    });
  });

  describe('categorizeError', () => {
    it('should categorize user cancellation errors', () => {
      expect(categorizeError({ message: 'User cancelled' })).toBe(ErrorCategory.USER_CANCELLATION);
      expect(categorizeError({ message: 'Authentication was dismissed' })).toBe(ErrorCategory.USER_CANCELLATION);
      expect(categorizeError({ code: 'USER_CANCELLED' })).toBe(ErrorCategory.USER_CANCELLATION);
    });

    it('should categorize network errors', () => {
      expect(categorizeError({ message: 'Network request failed' })).toBe(ErrorCategory.NETWORK);
      expect(categorizeError({ message: 'Connection timeout' })).toBe(ErrorCategory.NETWORK);
      expect(categorizeError({ code: 'ETIMEDOUT' })).toBe(ErrorCategory.NETWORK);
      expect(categorizeError({ code: 'ECONNREFUSED' })).toBe(ErrorCategory.NETWORK);
      expect(categorizeError({ message: 'Device is offline' })).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize OAuth errors', () => {
      expect(categorizeError({ message: 'Invalid authorization code' })).toBe(ErrorCategory.OAUTH);
      expect(categorizeError({ message: 'OAuth failed' })).toBe(ErrorCategory.OAUTH);
      expect(categorizeError({ message: 'access_denied' })).toBe(ErrorCategory.OAUTH);
      expect(categorizeError({ message: 'invalid_grant' })).toBe(ErrorCategory.OAUTH);
      expect(categorizeError({ message: 'redirect_uri mismatch' })).toBe(ErrorCategory.OAUTH);
      expect(categorizeError({ message: 'State parameter mismatch' })).toBe(ErrorCategory.OAUTH);
    });

    it('should categorize Convex errors', () => {
      expect(categorizeError({ message: 'Convex authentication failed' })).toBe(ErrorCategory.CONVEX);
      expect(categorizeError({ message: 'Token exchange failed' })).toBe(ErrorCategory.CONVEX);
      expect(categorizeError({ message: 'Session creation failed' })).toBe(ErrorCategory.CONVEX);
    });

    it('should categorize configuration errors', () => {
      expect(categorizeError({ message: 'Google OAuth is not configured' })).toBe(ErrorCategory.CONFIGURATION);
      expect(categorizeError({ message: 'Missing environment variable' })).toBe(ErrorCategory.CONFIGURATION);
      expect(categorizeError({ message: 'client_id is undefined' })).toBe(ErrorCategory.CONFIGURATION);
    });

    it('should return UNKNOWN for unrecognized errors', () => {
      expect(categorizeError({ message: 'Something went wrong' })).toBe(ErrorCategory.UNKNOWN);
      expect(categorizeError({})).toBe(ErrorCategory.UNKNOWN);
      expect(categorizeError(null)).toBe(ErrorCategory.UNKNOWN);
      expect(categorizeError(undefined)).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return appropriate message for user cancellation', () => {
      const message = getUserFriendlyMessage(ErrorCategory.USER_CANCELLATION);
      expect(message).toBe('Sign in was cancelled');
    });

    it('should return appropriate message for network errors', () => {
      const message = getUserFriendlyMessage(ErrorCategory.NETWORK);
      expect(message).toContain('internet connection');
    });

    it('should return appropriate message for OAuth errors', () => {
      const message = getUserFriendlyMessage(ErrorCategory.OAUTH);
      expect(message).toContain('Authentication failed');
    });

    it('should return appropriate message for Convex errors', () => {
      const message = getUserFriendlyMessage(ErrorCategory.CONVEX);
      expect(message).toContain('Failed to complete sign in');
    });

    it('should return appropriate message for configuration errors', () => {
      const message = getUserFriendlyMessage(ErrorCategory.CONFIGURATION);
      expect(message).toContain('temporarily unavailable');
    });

    it('should return original message for unknown errors', () => {
      const message = getUserFriendlyMessage(ErrorCategory.UNKNOWN, 'Custom error');
      expect(message).toBe('Custom error');
    });

    it('should return default message for unknown errors without original message', () => {
      const message = getUserFriendlyMessage(ErrorCategory.UNKNOWN);
      expect(message).toContain('unexpected error');
    });
  });

  describe('isRecoverable', () => {
    it('should return true for recoverable errors', () => {
      expect(isRecoverable(ErrorCategory.USER_CANCELLATION)).toBe(true);
      expect(isRecoverable(ErrorCategory.NETWORK)).toBe(true);
      expect(isRecoverable(ErrorCategory.OAUTH)).toBe(true);
      expect(isRecoverable(ErrorCategory.CONVEX)).toBe(true);
      expect(isRecoverable(ErrorCategory.UNKNOWN)).toBe(true);
    });

    it('should return false for non-recoverable errors', () => {
      expect(isRecoverable(ErrorCategory.CONFIGURATION)).toBe(false);
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      expect(isRetryable(ErrorCategory.NETWORK)).toBe(true);
      expect(isRetryable(ErrorCategory.CONVEX)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryable(ErrorCategory.USER_CANCELLATION)).toBe(false);
      expect(isRetryable(ErrorCategory.OAUTH)).toBe(false);
      expect(isRetryable(ErrorCategory.CONFIGURATION)).toBe(false);
      expect(isRetryable(ErrorCategory.UNKNOWN)).toBe(false);
    });
  });

  describe('handleAuthError', () => {
    it('should handle and categorize errors', () => {
      const originalError = new Error('Network timeout');
      const authError = handleAuthError(originalError, 'test-context');

      expect(authError.category).toBe(ErrorCategory.NETWORK);
      expect(authError.message).toBe('Network timeout');
      expect(authError.userMessage).toContain('internet connection');
      expect(authError.originalError).toBe(originalError);
      expect(authError.recoverable).toBe(true);
      expect(authError.retryable).toBe(true);
    });

    it('should handle errors without message', () => {
      const authError = handleAuthError({}, 'test-context');

      expect(authError.category).toBe(ErrorCategory.UNKNOWN);
      expect(authError.message).toBe('Unknown error');
    });

    it('should handle null/undefined errors', () => {
      const authError = handleAuthError(null, 'test-context');

      expect(authError.category).toBe(ErrorCategory.UNKNOWN);
      expect(authError.message).toBe('Unknown error');
    });
  });

  describe('shouldShowError', () => {
    it('should return false for user cancellation', () => {
      expect(shouldShowError(ErrorCategory.USER_CANCELLATION)).toBe(false);
    });

    it('should return true for all other error categories', () => {
      expect(shouldShowError(ErrorCategory.NETWORK)).toBe(true);
      expect(shouldShowError(ErrorCategory.OAUTH)).toBe(true);
      expect(shouldShowError(ErrorCategory.CONVEX)).toBe(true);
      expect(shouldShowError(ErrorCategory.CONFIGURATION)).toBe(true);
      expect(shouldShowError(ErrorCategory.UNKNOWN)).toBe(true);
    });
  });

  describe('getRecoverySuggestion', () => {
    it('should return appropriate suggestions for each category', () => {
      expect(getRecoverySuggestion(ErrorCategory.NETWORK)).toContain('internet connection');
      expect(getRecoverySuggestion(ErrorCategory.OAUTH)).toContain('Google account');
      expect(getRecoverySuggestion(ErrorCategory.CONVEX)).toContain('wait');
      expect(getRecoverySuggestion(ErrorCategory.CONFIGURATION)).toContain('contact support');
    });

    it('should return null for categories without suggestions', () => {
      expect(getRecoverySuggestion(ErrorCategory.USER_CANCELLATION)).toBeNull();
      expect(getRecoverySuggestion(ErrorCategory.UNKNOWN)).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle errors with both message and code', () => {
      const error = {
        message: 'Something went wrong',
        code: 'NETWORK_ERROR',
      };
      expect(categorizeError(error)).toBe(ErrorCategory.NETWORK);
    });

    it('should prioritize message over code for categorization', () => {
      const error = {
        message: 'User cancelled the operation',
        code: 'NETWORK_ERROR',
      };
      // Should categorize as USER_CANCELLATION based on message
      expect(categorizeError(error)).toBe(ErrorCategory.USER_CANCELLATION);
    });

    it('should handle case-insensitive error messages', () => {
      expect(categorizeError({ message: 'NETWORK TIMEOUT' })).toBe(ErrorCategory.NETWORK);
      expect(categorizeError({ message: 'Network Timeout' })).toBe(ErrorCategory.NETWORK);
      expect(categorizeError({ message: 'network timeout' })).toBe(ErrorCategory.NETWORK);
    });

    it('should handle errors with additional properties', () => {
      const error = {
        message: 'OAuth failed',
        code: 'OAUTH_ERROR',
        statusCode: 401,
        details: { reason: 'invalid_grant' },
      };
      const authError = handleAuthError(error);
      expect(authError.category).toBe(ErrorCategory.OAUTH);
      expect(authError.originalError).toEqual(error);
    });
  });

  describe('App backgrounding edge case', () => {
    it('should categorize app backgrounding as user cancellation', () => {
      const error = { message: 'Authentication was dismissed due to app backgrounding' };
      expect(categorizeError(error)).toBe(ErrorCategory.USER_CANCELLATION);
    });
  });

  describe('Network timeout edge case', () => {
    it('should categorize various timeout errors as network errors', () => {
      expect(categorizeError({ message: 'Request timeout' })).toBe(ErrorCategory.NETWORK);
      expect(categorizeError({ message: 'Connection timed out' })).toBe(ErrorCategory.NETWORK);
      expect(categorizeError({ code: 'ETIMEDOUT' })).toBe(ErrorCategory.NETWORK);
    });
  });
});

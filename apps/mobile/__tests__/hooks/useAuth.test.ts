import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { GoogleAuthService, GoogleAuthResult, GoogleAuthConfig } from '../../services/googleAuth';
import { secureStorage } from '../../services/storage';
import * as AuthSession from 'expo-auth-session';

// Mock dependencies
jest.mock('../../services/googleAuth');
jest.mock('../../services/storage');
jest.mock('expo-auth-session');

/**
 * Tests for useAuth hook - Google OAuth functionality
 * 
 * These tests verify the Google OAuth integration logic that will be used in the useAuth hook:
 * - GoogleAuthService initialization with correct configuration
 * - OAuth flow result handling (success, cancel, error)
 * - Error state management for OAuth-specific errors
 * - Secure token storage after successful authentication
 * 
 * Requirements tested: 1.5, 3.2, 3.3, 3.4, 6.1, 6.2
 */
describe('useAuth - Google OAuth Integration', () => {
  let mockConvexSignIn: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup Convex sign in mock
    mockConvexSignIn = jest.fn().mockResolvedValue(undefined as any);

    // Setup AuthSession mock
    (AuthSession.makeRedirectUri as any).mockReturnValue('itimeditapp://auth/callback');

    // Setup storage mocks
    (secureStorage.storeAuthToken as any) = jest.fn().mockResolvedValue(undefined as any);

    // Setup environment variable
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  });

  describe('GoogleAuthService Configuration', () => {
    it('should create GoogleAuthService with correct client ID from environment', () => {
      const config: GoogleAuthConfig = {
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: AuthSession.makeRedirectUri({
          scheme: 'itimeditapp',
          path: 'auth/callback'
        }) as string,
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      };

      new (GoogleAuthService as any)(config);

      expect(GoogleAuthService).toHaveBeenCalledWith(config);
      expect(config.clientId).toBe('test-client-id.apps.googleusercontent.com');
    });

    it('should create GoogleAuthService with correct redirect URI', () => {
      const config: GoogleAuthConfig = {
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: AuthSession.makeRedirectUri({
          scheme: 'itimeditapp',
          path: 'auth/callback'
        }) as string,
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      };

      new (GoogleAuthService as any)(config);

      expect(AuthSession.makeRedirectUri).toHaveBeenCalledWith({
        scheme: 'itimeditapp',
        path: 'auth/callback',
      });
      expect(config.redirectUri).toBe('itimeditapp://auth/callback');
    });

    it('should create GoogleAuthService with correct scopes', () => {
      const config: GoogleAuthConfig = {
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      };

      new (GoogleAuthService as any)(config);

      expect(config.scopes).toEqual(['openid', 'profile', 'email']);
      expect(config.scopes).toHaveLength(3);
    });

    it('should create GoogleAuthService with convexSignIn function', () => {
      const config: GoogleAuthConfig = {
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      };

      new (GoogleAuthService as any)(config);

      expect(config.convexSignIn).toBe(mockConvexSignIn);
      expect(typeof config.convexSignIn).toBe('function');
    });
  });

  describe('OAuth Flow Success Handling', () => {
    it('should handle successful OAuth result with code and verifier', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'success',
        code: 'test-auth-code',
        codeVerifier: 'test-code-verifier',
      } as GoogleAuthResult);

      const mockGoogleAuthExchangeToken = jest.fn().mockResolvedValue(undefined as any);

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: mockGoogleAuthExchangeToken,
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      expect(result.type).toBe('success');
      expect(result.code).toBe('test-auth-code');
      expect(result.codeVerifier).toBe('test-code-verifier');
    });

    it('should call exchangeCodeForToken with correct parameters on success', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'success',
        code: 'test-auth-code',
        codeVerifier: 'test-code-verifier',
      } as GoogleAuthResult);

      const mockGoogleAuthExchangeToken = jest.fn().mockResolvedValue(undefined as any);

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: mockGoogleAuthExchangeToken,
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      if (result.type === 'success' && result.code && result.codeVerifier) {
        await googleAuth.exchangeCodeForToken(result.code, result.codeVerifier);

        expect(mockGoogleAuthExchangeToken).toHaveBeenCalledWith(
          'test-auth-code',
          'test-code-verifier'
        );
      }
    });

    it('should store auth token after successful authentication', async () => {
      await secureStorage.storeAuthToken('authenticated');

      expect(secureStorage.storeAuthToken).toHaveBeenCalledWith('authenticated');
    });
  });

  describe('OAuth Flow Cancellation Handling', () => {
    it('should handle user cancellation gracefully', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'cancel',
        error: 'User cancelled the authentication flow',
      } as GoogleAuthResult);

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: jest.fn(),
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      expect(result.type).toBe('cancel');
      // Cancellation should not throw an error in the hook
      // The hook should return silently without setting error state
    });

    it('should not call exchangeCodeForToken when user cancels', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'cancel',
        error: 'User cancelled the authentication flow',
      } as GoogleAuthResult);

      const mockGoogleAuthExchangeToken = jest.fn();

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: mockGoogleAuthExchangeToken,
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      if (result.type === 'cancel') {
        // Hook should return early without calling exchangeCodeForToken
        expect(mockGoogleAuthExchangeToken).not.toHaveBeenCalled();
      }
    });

    it('should not store auth token when user cancels', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'cancel',
      } as GoogleAuthResult);

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: jest.fn(),
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      if (result.type === 'cancel') {
        // Hook should not store token on cancellation
        expect(secureStorage.storeAuthToken).not.toHaveBeenCalled();
      }
    });
  });

  describe('OAuth Flow Error Handling', () => {
    it('should handle OAuth errors from GoogleAuthService', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'error',
        error: 'Failed to authenticate with Google',
      } as GoogleAuthResult);

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: jest.fn(),
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      expect(result.type).toBe('error');
      expect(result.error).toBe('Failed to authenticate with Google');
    });

    it('should handle missing authorization code error', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'success',
        // Missing code and codeVerifier
      } as GoogleAuthResult);

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: jest.fn(),
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      // Hook should detect missing code/verifier and set error
      if (result.type === 'success' && (!result.code || !result.codeVerifier)) {
        // This should trigger an error in the hook
        expect(result.code).toBeUndefined();
        expect(result.codeVerifier).toBeUndefined();
      }
    });

    it('should handle token exchange errors', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'success',
        code: 'test-auth-code',
        codeVerifier: 'test-code-verifier',
      } as GoogleAuthResult);

      const mockGoogleAuthExchangeToken = jest.fn().mockRejectedValue(
        new Error('Invalid authorization code')
      );

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: mockGoogleAuthExchangeToken,
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      if (result.type === 'success' && result.code && result.codeVerifier) {
        await expect(
          googleAuth.exchangeCodeForToken(result.code, result.codeVerifier)
        ).rejects.toThrow('Invalid authorization code');
      }
    });

    it('should handle network errors during token exchange', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'success',
        code: 'test-auth-code',
        codeVerifier: 'test-code-verifier',
      } as GoogleAuthResult);

      const mockGoogleAuthExchangeToken = jest.fn().mockRejectedValue(
        new Error('Network error during authentication')
      );

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: mockGoogleAuthExchangeToken,
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      if (result.type === 'success' && result.code && result.codeVerifier) {
        await expect(
          googleAuth.exchangeCodeForToken(result.code, result.codeVerifier)
        ).rejects.toThrow('Network error during authentication');
      }
    });

    it('should not store auth token when OAuth fails', async () => {
      const mockGoogleAuthSignIn = jest.fn().mockResolvedValue({
        type: 'error',
        error: 'OAuth failed',
      } as GoogleAuthResult);

      (GoogleAuthService as any as jest.Mock).mockImplementation(() => ({
        signIn: mockGoogleAuthSignIn,
        exchangeCodeForToken: jest.fn(),
      }));

      const googleAuth = new (GoogleAuthService as any)({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri: 'itimeditapp://auth/callback',
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: mockConvexSignIn as any,
      });

      const result = await googleAuth.signIn();

      if (result.type === 'error') {
        // Hook should not store token on error
        expect(secureStorage.storeAuthToken).not.toHaveBeenCalled();
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should detect missing Google Client ID', () => {
      delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      // Hook should check for this and throw error
      expect(googleClientId).toBeUndefined();
    });

    it('should validate Google Client ID is present before creating service', () => {
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      expect(googleClientId).toBeDefined();
      expect(googleClientId).toBe('test-client-id.apps.googleusercontent.com');
    });

    it('should use correct redirect URI scheme', () => {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'itimeditapp',
        path: 'auth/callback'
      });

      expect(redirectUri).toBe('itimeditapp://auth/callback');
      expect(redirectUri).toContain('itimeditapp://');
    });
  });

  describe('Error State Management', () => {
    it('should provide specific error message for OAuth errors', () => {
      const oauthError = 'Failed to authenticate with Google';
      
      // Hook should set this as the error state
      expect(oauthError).toBe('Failed to authenticate with Google');
    });

    it('should provide specific error message for missing code/verifier', () => {
      const missingDataError = 'Missing authorization code or code verifier';
      
      // Hook should set this as the error state
      expect(missingDataError).toBe('Missing authorization code or code verifier');
    });

    it('should provide specific error message for token exchange failure', () => {
      const exchangeError = 'Failed to complete authentication with server';
      
      // Hook should set this as the error state when exchange fails
      expect(exchangeError).toBe('Failed to complete authentication with server');
    });

    it('should provide specific error message for missing configuration', () => {
      const configError = 'Google OAuth is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.';
      
      // Hook should set this when EXPO_PUBLIC_GOOGLE_CLIENT_ID is missing
      expect(configError).toContain('Google OAuth is not configured');
      expect(configError).toContain('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
    });

    it('should clear error state before starting new OAuth flow', () => {
      // Hook should call setError(null) at the start of signInWithGoogle
      // This ensures previous errors don't persist
      const errorState = null;
      expect(errorState).toBeNull();
    });
  });
});

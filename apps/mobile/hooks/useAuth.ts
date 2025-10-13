import { api } from "@/convex/_generated/api";
import { secureStorage } from "@/services/storage";
import { GoogleAuthService } from "@/services/googleAuth";
import { AuthError, ErrorCategory, handleAuthError, shouldShowError, createAuthError } from "@/services/errors";
import { User } from "@/types/models";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import * as AuthSession from 'expo-auth-session';
import { useCallback, useEffect, useState } from "react";

export interface UseAuthReturn {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

/**
 * Authentication hook that manages user authentication state
 * Uses Convex Auth for authentication and Expo SecureStore for token storage
 */
export function useAuth(): UseAuthReturn {
  const { isAuthenticated: convexIsAuthenticated, isLoading: convexIsLoading } = useConvexAuth();
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Get the current user from Convex
  const user = useQuery(api.auth.loggedInUser) as User | null | undefined;

  // Use the built-in Convex Auth actions (signIn and signOut)
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

  /**
   * Check authentication status on mount
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsInitializing(true);
      const token = await secureStorage.getAuthToken();
      
      if (!token) {
        setIsInitializing(false);
        return;
      }

      // Token exists, Convex will handle the session
      setIsInitializing(false);
    } catch (err) {
      console.error("Error checking auth status:", err);
      setError("Failed to check authentication status");
      setIsInitializing(false);
    }
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);

        // Use the Convex Auth signIn action
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        formData.append("flow", "signIn");

        await convexSignIn("password", formData);

        // Store a flag to indicate successful authentication
        // The actual token is managed by Convex client
        await secureStorage.storeAuthToken("authenticated");
      } catch (err: any) {
        console.error("Sign in error:", err);
        const errorMessage = err?.message || "Failed to sign in. Please check your credentials.";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [convexSignIn]
  );

  /**
   * Sign in with Google OAuth
   * 
   * This method:
   * 1. Initializes GoogleAuthService with proper configuration
   * 2. Initiates the OAuth flow (opens in-app browser)
   * 3. Handles the OAuth result (success, cancel, error)
   * 4. Exchanges authorization code for session token via Convex
   * 5. Stores authentication token securely
   * 
   * Error handling:
   * - Configuration errors: Missing environment variables
   * - User cancellation: User closes browser
   * - OAuth errors: Invalid credentials, redirect issues
   * - Network errors: Connection problems
   * - Convex errors: Server-side issues
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);

      // Validate that Google OAuth is configured
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        const authError = createAuthError(
          ErrorCategory.CONFIGURATION,
          'Google OAuth client ID not configured',
          'Sign in with Google is temporarily unavailable. Please try again later.',
          null,
          false,
          false
        );
        setError(authError.userMessage);
        throw authError;
      }

      // Initialize Google Auth Service with proper configuration
      // For iOS OAuth clients, use the reverse client ID as the scheme
      const clientIdReversed = googleClientId.split('.').reverse().join('.');
      const googleAuth = new GoogleAuthService({
        clientId: googleClientId,
        redirectUri: AuthSession.makeRedirectUri({
          scheme: clientIdReversed,
          path: 'oauth2callback'
        }),
        scopes: ['openid', 'profile', 'email'],
        convexSignIn: convexSignIn,
      });

      // Start OAuth flow - this opens the in-app browser
      const result = await googleAuth.signIn();

      // Handle user cancellation - don't show error, just return
      if (result.type === 'cancel') {
        console.log('User cancelled Google sign in');
        // Don't set error for user cancellation
        return;
      }

      // Handle OAuth errors
      if (result.type === 'error') {
        const authError = result.authError || handleAuthError(
          new Error(result.error || 'Failed to authenticate with Google'),
          'useAuth.signInWithGoogle'
        );
        
        // Only show error if it's not a user cancellation
        if (shouldShowError(authError.category)) {
          setError(authError.userMessage);
        }
        
        throw authError;
      }

      // Verify we have the authorization code and code verifier
      if (!result.code || !result.codeVerifier) {
        const authError = createAuthError(
          ErrorCategory.OAUTH,
          'Missing authorization code or code verifier',
          'Authentication failed. Please try again.',
          { result },
          true,
          true
        );
        setError(authError.userMessage);
        throw authError;
      }

      // Exchange authorization code for session token through Convex
      try {
        await googleAuth.exchangeCodeForToken(result.code, result.codeVerifier);
      } catch (exchangeError: any) {
        // exchangeError is already an AuthError from GoogleAuthService
        const authError = exchangeError as AuthError;
        
        // Set user-friendly error message
        setError(authError.userMessage);
        
        // Re-throw for caller to handle
        throw authError;
      }

      // Store authentication flag securely
      // The actual session token is managed by Convex client
      await secureStorage.storeAuthToken("authenticated");

      console.log('Google sign in successful');
    } catch (err: any) {
      // If it's already an AuthError, just re-throw
      if (err.category && err.userMessage) {
        throw err;
      }
      
      // Otherwise, handle as unexpected error
      const authError = handleAuthError(err, 'useAuth.signInWithGoogle');
      
      // Set error message if not already set
      if (!error && shouldShowError(authError.category)) {
        setError(authError.userMessage);
      }
      
      // Re-throw to allow caller to handle
      throw authError;
    }
  }, [convexSignIn, error]);

  /**
   * Sign in anonymously as a guest user
   */
  const signInAnonymously = useCallback(async () => {
    try {
      setError(null);

      // Use the Convex Auth signIn action with "anonymous" provider
      await convexSignIn("anonymous");

      // Store a flag to indicate successful authentication
      // The actual token is managed by Convex client
      await secureStorage.storeAuthToken("authenticated");
    } catch (err: any) {
      console.error("Anonymous sign in error:", err);
      const errorMessage = err?.message || "Failed to sign in anonymously.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [convexSignIn]);

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    try {
      setError(null);

      // Use the Convex Auth signOut action
      await convexSignOut();

      // Clear stored auth token
      await secureStorage.clearAuthToken();
    } catch (err: any) {
      console.error("Sign out error:", err);
      const errorMessage = err?.message || "Failed to sign out";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [convexSignOut]);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Handle session expiration
  // If Convex says we're not authenticated but we have a stored token, clear it
  useEffect(() => {
    const handleSessionExpiration = async () => {
      if (!convexIsLoading && !convexIsAuthenticated && !isInitializing) {
        const token = await secureStorage.getAuthToken();
        if (token) {
          // Session has expired, clear the stored token
          console.log("Session expired, clearing stored token");
          await secureStorage.clearAuthToken();
          setError("Your session has expired. Please sign in again.");
        }
      }
    };

    handleSessionExpiration();
  }, [convexIsAuthenticated, convexIsLoading, isInitializing]);

  const isLoading = convexIsLoading || isInitializing || (convexIsAuthenticated && user === undefined);

  return {
    isAuthenticated: convexIsAuthenticated && user !== null && user !== undefined,
    user: user ?? null,
    isLoading,
    error,
    signIn,
    signInWithGoogle,
    signInAnonymously,
    signOut,
    checkAuthStatus,
  };
}

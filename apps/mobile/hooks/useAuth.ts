import { api } from "@/convex/_generated/api";
import { secureStorage } from "@/services/storage";
import { User } from "@/types/models";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
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
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);

      // Use the Convex Auth signIn action with "google" provider
      await convexSignIn("google");

      // Store a flag to indicate successful authentication
      // The actual token is managed by Convex client
      await secureStorage.storeAuthToken("authenticated");
    } catch (err: any) {
      console.error("Google sign in error:", err);
      const errorMessage = err?.message || "Failed to sign in with Google.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [convexSignIn]);

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

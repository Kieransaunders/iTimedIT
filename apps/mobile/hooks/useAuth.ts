import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { secureStorage, STORAGE_KEYS } from "../services/storage";

export function useAuth() {
  // Get Convex auth state
  const { isAuthenticated: convexIsAuthenticated, isLoading: convexIsLoading } = useConvexAuth();

  // Get current user from Convex
  const user = useQuery(api.auth.loggedInUser);

  // Get Convex Auth actions
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

  /**
   * Sign in with email and password using Convex Auth
   */
  const handlePasswordSignIn = async (email: string, password: string) => {
    try {
      // Use the Convex Auth signIn action with FormData
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("flow", "signIn");

      await convexSignIn("password", formData);

      // Store a flag to indicate successful authentication
      await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, "authenticated");

      return true;
    } catch (error) {
      console.error("Password sign in error:", error);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // TODO: Implement Google OAuth flow using convexSignIn("google", { redirectTo })
      // This requires setting up the OAuth callback handler
      throw new Error("Google sign-in not yet implemented");
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await convexSignOut();
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const isLoading = convexIsLoading || (convexIsAuthenticated && user === undefined);

  return {
    user,
    isAuthenticated: convexIsAuthenticated && user !== null && user !== undefined,
    isLoading,
    signInWithPassword: handlePasswordSignIn,
    signInWithGoogle: handleGoogleSignIn,
    signOut: handleSignOut,
  };
}

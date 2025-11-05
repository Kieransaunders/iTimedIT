import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { signInWithGoogle } from "../services/googleAuth";
import { secureStorage, STORAGE_KEYS } from "../services/storage";

export function useAuth() {
  // Get current user from Convex (using the correct function name)
  const user = useQuery(api.auth.loggedInUser);
  const signOut = useMutation(api.auth.signOut);
  const signIn = useMutation(api.auth.signIn);

  /**
   * Sign in with email and password using Convex Auth
   */
  const handlePasswordSignIn = async (email: string, password: string) => {
    try {
      await signIn({
        provider: "password",
        params: { email, password, flow: "signIn" },
      });
      return true;
    } catch (error) {
      console.error("Password sign in error:", error);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();

      if (result?.idToken) {
        // Store tokens securely
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.idToken);
        if (result.refreshToken) {
          await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
        }

        // Convex Auth will handle the session via the Convex client
        return true;
      }

      return false;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading: user === undefined,
    signInWithPassword: handlePasswordSignIn,
    signInWithGoogle: handleGoogleSignIn,
    signOut: handleSignOut,
  };
}

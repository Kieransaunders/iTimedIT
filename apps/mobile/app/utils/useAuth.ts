import { api } from "../../convex/_generated/api"
import { secureStorage } from "@/services/storage"
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import * as WebBrowser from "expo-web-browser"
import { useCallback, useEffect, useState } from "react"

// Define User type (you may need to adjust this based on your schema)
export interface User {
  _id: string
  _creationTime: number
  email?: string
  name?: string
  image?: string
}

export interface UseAuthReturn {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  checkAuthStatus: () => Promise<void>
}

/**
 * Authentication hook that manages user authentication state
 * Uses Convex Auth for authentication and Expo SecureStore for token storage
 */
export function useAuth(): UseAuthReturn {
  const authToken = useAuthToken()
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // Get the current user from Convex
  const user = useQuery(api.auth.loggedInUser) as User | null | undefined

  // Use the built-in Convex Auth actions (signIn and signOut)
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions()

  /**
   * Check authentication status on mount
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsInitializing(true)
      const token = await secureStorage.getAuthToken()

      if (!token) {
        setIsInitializing(false)
        return
      }

      // Token exists, Convex will handle the session
      setIsInitializing(false)
    } catch (err) {
      console.error("Error checking auth status:", err)
      setError("Failed to check authentication status")
      setIsInitializing(false)
    }
  }, [])

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null)

        // Use the Convex Auth signIn action
        const formData = new FormData()
        formData.append("email", email)
        formData.append("password", password)
        formData.append("flow", "signIn")

        await convexSignIn("password", formData)

        // Store a flag to indicate successful authentication
        // The actual token is managed by Convex client
        await secureStorage.storeAuthToken("authenticated")
      } catch (err: any) {
        console.error("Sign in error:", err)
        const errorMessage = err?.message || "Failed to sign in. Please check your credentials."
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [convexSignIn],
  )

  /**
   * Sign in with Google OAuth using Convex Auth's web-based flow
   *
   * This method implements the Convex Auth OAuth flow for React Native:
   * 1. Calls signIn("google", { redirectTo }) to get the OAuth URL
   * 2. Opens the Convex backend OAuth URL in an in-app browser
   * 3. OAuth happens on Convex's backend (using web redirect URIs)
   * 4. After success, Convex redirects back to the app with a code
   * 5. The code is handled and completed
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null)

      // Ensure any previous auth session is completed
      WebBrowser.maybeCompleteAuthSession()

      // Step 1: Call Convex signIn to get the OAuth redirect URL
      // The redirectTo is where Convex will redirect after successful OAuth
      const redirectTo = "itimeditapp://oauth-callback"

      console.log("Starting Google OAuth flow with redirectTo:", redirectTo)

      const result = await convexSignIn("google", { redirectTo } as any)

      // Step 2: Open the Convex OAuth URL in the in-app browser
      // The result should contain a 'redirect' property with the URL to open
      if (result && typeof result === "object" && "redirect" in result) {
        const redirectUrl = (result as { redirect: string | URL }).redirect

        // Convert URL object to string if needed
        const oauthUrl = typeof redirectUrl === "string" ? redirectUrl : redirectUrl.toString()

        console.log("Opening OAuth URL in browser:", oauthUrl)

        // Open the Convex OAuth page in an in-app browser
        // This will handle the entire OAuth flow on Convex's backend
        const browserResult = await WebBrowser.openAuthSessionAsync(oauthUrl, redirectTo)

        // Handle different browser result types
        if (browserResult.type === "cancel" || browserResult.type === "dismiss") {
          console.log("User cancelled Google sign in")
          // Don't set error for user cancellation
          return
        }

        if (browserResult.type === "locked") {
          const errorMessage = "Another authentication session is already in progress"
          setError(errorMessage)
          throw new Error(errorMessage)
        }

        if (browserResult.type === "success" && browserResult.url) {
          // Step 3: Extract the code from the callback URL
          const callbackUrl = new URL(browserResult.url)
          const code = callbackUrl.searchParams.get("code")

          if (!code) {
            const errorMessage = "Authentication failed. Please try again."
            setError(errorMessage)
            throw new Error(errorMessage)
          }

          // Step 4: Complete the sign-in with the authorization code
          console.log("Completing sign-in with authorization code")
          await convexSignIn("google", { code } as any)

          // Store authentication flag securely
          await secureStorage.storeAuthToken("authenticated")

          console.log("Google sign in successful")
        }
      } else {
        // If there's no redirect URL, the sign-in might have completed immediately
        // This shouldn't happen for OAuth, but handle it just in case
        console.log("Sign-in completed without redirect")
        await secureStorage.storeAuthToken("authenticated")
      }
    } catch (err: any) {
      console.error("Google sign in error:", err)

      // Set error message if not already set
      if (!error) {
        setError(err?.message || "Failed to sign in with Google. Please try again.")
      }

      // Re-throw to allow caller to handle
      throw err
    }
  }, [convexSignIn, error])

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    try {
      setError(null)

      // Use the Convex Auth signOut action
      await convexSignOut()

      // Clear stored auth token
      await secureStorage.clearAuthToken()
    } catch (err: any) {
      console.error("Sign out error:", err)
      const errorMessage = err?.message || "Failed to sign out"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [convexSignOut])

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  // Handle session expiration
  // If Convex says we're not authenticated but we have a stored token, clear it
  useEffect(() => {
    const handleSessionExpiration = async () => {
      const hasToken = authToken !== null
      if (!isInitializing && !hasToken && user === null) {
        const storedToken = await secureStorage.getAuthToken()
        if (storedToken) {
          // Session has expired, clear the stored token
          console.log("Session expired, clearing stored token")
          await secureStorage.clearAuthToken()
          setError("Your session has expired. Please sign in again.")
        }
      }
    }

    handleSessionExpiration()
  }, [authToken, user, isInitializing])

  // Determine authentication state:
  // - user === undefined means query is loading
  // - user === null means not authenticated
  // - user object means authenticated
  const isAuthenticated = authToken !== null && user !== null && user !== undefined
  const isLoading = isInitializing || user === undefined

  return {
    isAuthenticated,
    user: user ?? null,
    isLoading,
    error,
    signIn,
    signInWithPassword: signIn, // Alias for backward compatibility
    signInWithGoogle,
    signOut,
    checkAuthStatus,
  }
}

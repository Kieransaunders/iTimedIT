/**
 * Convex Context Provider for React Native
 *
 * This provider wraps the app with Convex client functionality,
 * allowing the mobile app to connect to the same Convex backend
 * as the web app.
 */
import { PropsWithChildren } from "react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ConvexProviderWithAuth } from "convex/react"
import "react-native-get-random-values" // Required for Convex crypto polyfill
import "react-native-url-polyfill/auto" // Required for URL polyfill

// Get Convex URL from environment variable
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL!

if (!CONVEX_URL) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL environment variable.\n" +
    "Add it to your .env.local file:\n" +
    "EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud"
  )
}

// Create Convex client instance
const convex = new ConvexReactClient(CONVEX_URL, {
  // Enable verbose logging in development
  verbose: __DEV__,
})

export interface ConvexAppProviderProps extends PropsWithChildren {}

/**
 * Convex Provider Component
 *
 * Wraps the app with Convex client functionality. This should be placed
 * high in the component tree, typically in app.tsx.
 */
export function ConvexAppProvider({ children }: ConvexAppProviderProps) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  )
}

/**
 * Export the Convex client for direct use if needed
 */
export { convex }

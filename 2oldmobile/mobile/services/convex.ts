import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

// Lazy initialization to prevent Hermes crash during module load in release builds
let _convexClient: ConvexReactClient | null = null;

function getConvexUrl(): string {
  // Get Convex URL from environment variables
  const convexUrl = Constants.expoConfig?.extra?.convexUrl || process.env.EXPO_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    const errorMessage = [
      "❌ CONVEX URL NOT CONFIGURED",
      "",
      "The app cannot start because EXPO_PUBLIC_CONVEX_URL is not set.",
      "",
      "To fix this:",
      "1. Create a .env file in apps/mobile/",
      "2. Add: EXPO_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud",
      "3. Restart the development server",
      "",
      "For production builds, ensure the environment variable is set in app.config.ts extra.convexUrl",
    ].join("\n");

    throw new Error(errorMessage);
  }

  return convexUrl;
}

// Lazy getter for Convex client - only creates instance when first accessed
export function getConvexClient(): ConvexReactClient {
  if (!_convexClient) {
    try {
      const url = getConvexUrl();
      _convexClient = new ConvexReactClient(url);
    } catch (error) {
      console.error("Failed to initialize Convex client:", error);
      throw error;
    }
  }
  return _convexClient;
}

// Create and export the Convex client (lazy-loaded via getter)
export const convexClient = getConvexClient();

// Export as 'convex' for backward compatibility
export const convex = convexClient;

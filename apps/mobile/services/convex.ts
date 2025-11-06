import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

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

// Create and export the Convex client
export const convexClient = new ConvexReactClient(convexUrl);

// Export as 'convex' for backward compatibility
export const convex = convexClient;

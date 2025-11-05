import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

// Get Convex URL from environment variables
const convexUrl = Constants.expoConfig?.extra?.convexUrl || process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL environment variable. " +
    "Please set it in your .env.local file or app.config.ts"
  );
}

// Create and export the Convex client
export const convexClient = new ConvexReactClient(convexUrl);

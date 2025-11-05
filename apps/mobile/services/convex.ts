import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

// Get Convex URL from environment
const convexUrl = Constants.expoConfig?.extra?.convexUrl;

if (!convexUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL environment variable. " +
    "Please add it to your .env file."
  );
}

// Initialize Convex client
export const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

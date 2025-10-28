// Try to import expo-live-activity, but handle gracefully if not available
let LiveActivity: any = null;
let moduleLoadError: any = null;

// Enable Live Activities based on environment variable
// For production safety, we'll check multiple conditions
const LIVE_ACTIVITIES_ENABLED = process.env.EXPO_PUBLIC_LIVE_ACTIVITIES === "1";

// Attempt to load the module with comprehensive error handling
if (LIVE_ACTIVITIES_ENABLED) {
  try {
    // Use a dynamic import wrapped in try-catch for maximum safety
    const loadLiveActivityModule = () => {
      try {
        // Check if we're in a native build environment (not Expo Go)
        const { NativeModules } = require("react-native");

        // Check if the native module exists before trying to load the JS module
        if (!NativeModules.ExpoLiveActivity) {
          console.warn("Native ExpoLiveActivity module not found. Live Activities will be disabled.");
          console.warn("This is expected in Expo Go or development builds without the native module.");
          return null;
        }

        // Now try to load the actual module
        const module = require("expo-live-activity");

        // Verify the module has the expected methods
        if (module && typeof module.startActivity === "function") {
          console.log("✅ Live Activity module loaded successfully");
          return module;
        } else {
          console.warn("Live Activity module loaded but appears to be invalid");
          return null;
        }
      } catch (innerError: any) {
        // Store the error for debugging but don't crash
        moduleLoadError = innerError;
        console.warn("Failed to load expo-live-activity module:", innerError?.message);

        // Check if it's a specific error we can handle
        if (innerError?.message?.includes("Native module cannot be null")) {
          console.warn("The native Live Activity extension is not properly included in this build.");
          console.warn("Run 'npx expo prebuild --clean' and rebuild to include the extension.");
        }

        return null;
      }
    };

    // Delay module loading until after initial app setup
    // This prevents crashes during the critical startup phase
    setTimeout(() => {
      if (!LiveActivity) {
        LiveActivity = loadLiveActivityModule();
      }
    }, 100);

  } catch (error: any) {
    moduleLoadError = error;
    console.warn("expo-live-activity not available. Live Activities will be disabled.");
    console.warn("Error:", error?.message);
  }
}

// Export a function to check module status for debugging
export function getLiveActivityStatus() {
  return {
    enabled: LIVE_ACTIVITIES_ENABLED,
    loaded: !!LiveActivity,
    error: moduleLoadError?.message || null
  };
}

import { Platform } from "react-native";
import type { Project } from "@/types/models";

/**
 * Live Activity Service
 *
 * Manages iOS Live Activities for real-time timer display on lock screen and Dynamic Island.
 *
 * Features:
 * - Real-time timer updates on lock screen
 * - Dynamic Island integration (iPhone 14 Pro+)
 * - Tap-to-open app functionality
 * - Automatic fallback for unsupported devices
 *
 * Requirements:
 * - iOS 16.2+
 * - Expo DevClient (not Expo Go)
 * - Native module properly configured in build
 *
 * Note: This service is iOS-only and will no-op on Android or older iOS versions.
 */
class LiveActivityService {
  private activityId: string | null = null;
  private startTime: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private projectInfo: {
    name: string;
    client?: string;
    color?: string;
    hourlyRate?: number
  } | null = null;

  /**
   * Check if Live Activities are supported on this device
   */
  isSupported(): boolean {
    // First check if feature is enabled in build
    if (!LIVE_ACTIVITIES_ENABLED) {
      return false;
    }

    // Platform check
    if (Platform.OS !== "ios") {
      return false;
    }

    // iOS version check - Live Activities require iOS 16.2+
    const version = parseFloat(Platform.Version as string);
    if (version < 16.2) {
      return false;
    }

    // Check if the native module is available
    try {
      const { NativeModules } = require("react-native");
      if (!NativeModules.ExpoLiveActivity) {
        console.log("Native Live Activity module not found");
        return false;
      }
    } catch (error) {
      console.log("Error checking for native module:", error);
      return false;
    }

    // Check if the JS module is loaded
    if (!LiveActivity) {
      // Try to load it now if it hasn't been loaded yet
      try {
        const { NativeModules } = require("react-native");
        if (NativeModules.ExpoLiveActivity) {
          LiveActivity = require("expo-live-activity");
        }
      } catch (error) {
        console.log("Failed to load Live Activity module:", error);
        return false;
      }
    }

    // Final check that module is valid
    return !!LiveActivity && typeof LiveActivity.startActivity === "function";
  }

  /**
   * Start a Live Activity for the running timer
   */
  async startActivity(project: Project, startedAt: number): Promise<void> {
    if (!this.isSupported()) {
      console.log("Live Activities not supported on this device");
      return;
    }

    try {
      // Store project info and start time
      this.startTime = startedAt;
      this.projectInfo = {
        name: project.name,
        client: project.client?.name,
        color: project.color || "#a855f7",
        hourlyRate: project.hourlyRate,
      };

      // Initial elapsed time
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

      // Start the Live Activity (with extra safety check)
      const state = this.createActivityState(elapsedSeconds);
      const config = this.createActivityConfig();

      if (LiveActivity && LiveActivity.startActivity) {
        this.activityId = await LiveActivity.startActivity(state, config);
      } else {
        throw new Error("LiveActivity module not available");
      }

      // Start periodic updates
      this.startPeriodicUpdates();

      console.log("Live Activity started:", this.activityId);
    } catch (error) {
      console.error("Failed to start Live Activity:", error);
      throw error;
    }
  }

  /**
   * Update the Live Activity with current elapsed time
   */
  async updateActivity(elapsedSeconds: number): Promise<void> {
    if (!this.activityId || !this.isSupported()) {
      return;
    }

    try {
      const state = this.createActivityState(elapsedSeconds);
      if (LiveActivity && LiveActivity.updateActivity) {
        await LiveActivity.updateActivity(this.activityId, state);
      }
    } catch (error) {
      console.error("Failed to update Live Activity:", error);
    }
  }

  /**
   * Stop the Live Activity
   */
  async stopActivity(): Promise<void> {
    if (!this.activityId || !this.isSupported()) {
      return;
    }

    try {
      // Stop periodic updates
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // End the Live Activity with final state
      const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      const finalState = this.createActivityState(elapsedSeconds);
      if (LiveActivity && LiveActivity.endActivity) {
        await LiveActivity.endActivity(this.activityId, finalState);
      }

      console.log("Live Activity stopped");

      // Clear stored data
      this.activityId = null;
      this.startTime = 0;
      this.projectInfo = null;
    } catch (error) {
      console.error("Failed to stop Live Activity:", error);
    }
  }

  /**
   * Create Live Activity state object
   */
  private createActivityState(elapsedSeconds: number) {
    if (!this.projectInfo) {
      throw new Error("Project info not available");
    }

    const timeDisplay = this.formatTime(elapsedSeconds);
    const earnings = this.calculateEarnings(elapsedSeconds);

    // State structure for Live Activity
    return {
      // Main title (project name)
      title: this.projectInfo.name,

      // Subtitle (client or status)
      subtitle: this.projectInfo.client || "Timer Running",

      // Progress bar with countdown timer
      // Note: This creates a visual countdown from now to future time
      // We're using it to show elapsed time by setting a far future date
      progressBar: {
        date: Date.now() + (60 * 60 * 1000), // 1 hour from now (placeholder for visual)
      },

      // Custom data for display
      elapsedTime: timeDisplay,
      earnings: earnings || "",
      projectColor: this.projectInfo.color,

      // For image display (optional)
      imageName: "timer_icon", // Must match asset in assets/liveActivity/
    };
  }

  /**
   * Create Live Activity configuration
   */
  private createActivityConfig() {
    return {
      // Timer display type
      timerType: "circular", // Options: 'circular', 'linear'

      // Color customization
      progressViewTint: this.projectInfo?.color || "#a855f7",

      // Text customization
      titleColor: "#000000",
      subtitleColor: "#666666",

      // Background
      backgroundColor: "#FFFFFF",

      // Enable tap to open
      onTap: "open-app", // Opens app when tapped
    };
  }

  /**
   * Start periodic updates for the Live Activity
   */
  private startPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 5 seconds (iOS system limit for Live Activities)
    const updateIntervalMs = 5000;

    this.updateInterval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      this.updateActivity(elapsedSeconds).catch((error) => {
        console.error("Failed to update Live Activity in interval:", error);
      });
    }, updateIntervalMs);
  }

  /**
   * Format seconds into HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours, minutes, secs]
      .map((val) => String(val).padStart(2, "0"))
      .join(":");
  }

  /**
   * Calculate earnings based on elapsed time and hourly rate
   */
  private calculateEarnings(elapsedSeconds: number): string {
    if (!this.projectInfo?.hourlyRate) {
      return "";
    }

    const hours = elapsedSeconds / 3600;
    const earnings = hours * this.projectInfo.hourlyRate;

    return `$${earnings.toFixed(2)}`;
  }
}

/**
 * Singleton instance
 */
export const liveActivityService = new LiveActivityService();

import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

// Task name for background heartbeat
export const BACKGROUND_HEARTBEAT_TASK = "timer-heartbeat-task";

/**
 * Register the background fetch task for timer heartbeat
 * This will be called periodically when the app is in the background
 */
export async function registerBackgroundFetch(): Promise<void> {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_HEARTBEAT_TASK
    );

    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_HEARTBEAT_TASK, {
        minimumInterval: 30, // 30 seconds (minimum allowed by iOS)
        stopOnTerminate: false, // Continue after app termination
        startOnBoot: true, // Start on device boot (Android)
      });
      console.log("Background fetch task registered");
    }
  } catch (error) {
    console.error("Failed to register background fetch:", error);
  }
}

/**
 * Unregister the background fetch task
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_HEARTBEAT_TASK);
    console.log("Background fetch task unregistered");
  } catch (error) {
    console.error("Failed to unregister background fetch:", error);
  }
}

/**
 * Get the status of background fetch
 */
export async function getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
  return await BackgroundFetch.getStatusAsync();
}

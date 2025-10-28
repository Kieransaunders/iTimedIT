import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Project } from "@/types/models";
// Live Activities temporarily disabled - causing build issues
// import { liveActivityService } from "./liveActivityService";

/**
 * Notification ID for the persistent timer notification
 */
const TIMER_NOTIFICATION_ID = "timer-running";

/**
 * Timer Notification Service
 *
 * Handles lock screen timer display with platform-specific implementations:
 * - iOS 16.2+: Live Activities with real-time updates and Dynamic Island
 * - iOS < 16.2: Time-sensitive notification with 5-second updates
 * - Android: Foreground notification with 3-second updates
 */
class TimerNotificationService {
  private notificationId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private projectInfo: { name: string; client?: string; color?: string; hourlyRate?: number } | null = null;

  /**
   * Start displaying the timer on the lock screen
   */
  async startTimerNotification(project: Project, startedAt: number): Promise<void> {
    try {
      // Live Activities temporarily disabled - use standard notifications
      // if (liveActivityService.isSupported()) {
      //   await liveActivityService.startActivity(project, startedAt);
      //   console.log("Timer Live Activity started for project:", project.name);
      //   return; // Early return, don't use notifications
      // }

      // Use standard notifications for all platforms
      // Store start time and project info
      this.startTime = startedAt;
      this.projectInfo = {
        name: project.name,
        client: project.client?.name,
        color: project.color,
        hourlyRate: project.hourlyRate,
      };

      // Show initial notification
      await this.showNotification(0);

      // Start periodic updates
      this.startPeriodicUpdates();

      console.log("Timer notification started for project:", project.name);
    } catch (error) {
      console.error("Failed to start timer notification:", error);
      throw error;
    }
  }

  /**
   * Update the timer notification with current elapsed time
   */
  async updateTimerNotification(elapsedSeconds: number): Promise<void> {
    try {
      await this.showNotification(elapsedSeconds);
    } catch (error) {
      console.error("Failed to update timer notification:", error);
    }
  }

  /**
   * Stop the timer notification and clear updates
   */
  async stopTimerNotification(): Promise<void> {
    try {
      // Live Activities temporarily disabled - use standard notifications
      // if (liveActivityService.isSupported()) {
      //   await liveActivityService.stopActivity();
      //   console.log("Timer Live Activity stopped");
      //   return; // Early return
      // }

      // Stop standard notifications
      // Stop periodic updates
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Dismiss the notification
      if (this.notificationId) {
        await Notifications.dismissNotificationAsync(this.notificationId);
        this.notificationId = null;
      }

      // Clear stored data
      this.startTime = 0;
      this.projectInfo = null;

      console.log("Timer notification stopped");
    } catch (error) {
      console.error("Failed to stop timer notification:", error);
    }
  }

  /**
   * Show or update the timer notification
   */
  private async showNotification(elapsedSeconds: number): Promise<void> {
    if (!this.projectInfo) {
      console.warn("Cannot show notification: no project info");
      return;
    }

    const timeDisplay = this.formatTime(elapsedSeconds);
    const earnings = this.calculateEarnings(elapsedSeconds);

    // Platform-specific notification content
    const notification = Platform.select({
      android: this.createAndroidNotification(timeDisplay, earnings),
      ios: this.createIOSNotification(timeDisplay, earnings),
      default: this.createAndroidNotification(timeDisplay, earnings),
    });

    // Schedule or update the notification
    this.notificationId = await Notifications.scheduleNotificationAsync({
      identifier: TIMER_NOTIFICATION_ID,
      content: notification,
      trigger: null, // Show immediately
    });
  }

  /**
   * Create Android notification content
   * Ongoing notification with high importance for lock screen visibility
   */
  private createAndroidNotification(timeDisplay: string, earnings: string): Notifications.NotificationContentInput {
    const { name, client } = this.projectInfo!;

    return {
      title: "iTimedIT Timer Running",
      body: `${name}${client ? ` • ${client}` : ""} • ${timeDisplay}${earnings ? ` • ${earnings}` : ""}`,
      data: { type: "timer-running" },
      categoryIdentifier: "timer-running",
      sticky: true, // Persistent notification
      priority: Notifications.AndroidNotificationPriority.HIGH,
      // @ts-ignore - Android-specific properties
      channelId: "timer-foreground",
      ongoing: true, // Cannot be dismissed by user
      color: this.projectInfo!.color,
    };
  }

  /**
   * Create iOS notification content
   * Time-sensitive notification for lock screen
   */
  private createIOSNotification(timeDisplay: string, earnings: string): Notifications.NotificationContentInput {
    const { name, client } = this.projectInfo!;

    return {
      title: name,
      subtitle: client || "Timer Running",
      body: `${timeDisplay}${earnings ? ` • ${earnings}` : ""}`,
      data: { type: "timer-running" },
      categoryIdentifier: "timer-running",
      sound: false, // Silent updates
      // @ts-ignore - iOS-specific properties
      interruptionLevel: "timeSensitive", // iOS 15+ for lock screen display
    };
  }

  /**
   * Start periodic notification updates
   * - Android: Every 3 seconds
   * - iOS: Every 5 seconds (system limit)
   */
  private startPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update interval based on platform
    const updateIntervalMs = Platform.OS === "android" ? 3000 : 5000;

    this.updateInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - this.startTime) / 1000);
      this.updateTimerNotification(elapsedSeconds);
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
export const timerNotificationService = new TimerNotificationService();

/**
 * Setup notification category for timer notifications
 * Call this during app initialization
 */
export async function setupTimerNotificationCategory(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync("timer-running", [
      {
        identifier: "stop-timer",
        buttonTitle: "Stop",
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
      {
        identifier: "view-timer",
        buttonTitle: "View",
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    console.log("Timer notification category configured");
  } catch (error) {
    console.error("Failed to setup timer notification category:", error);
  }
}

/**
 * Setup Android notification channel for timer foreground service
 * Must be called before starting timer notifications on Android
 */
export async function setupTimerNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("timer-foreground", {
        name: "Timer Running",
        importance: Notifications.AndroidImportance.HIGH,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: null, // Silent updates
        vibrationPattern: null, // No vibration
        enableVibrate: false,
        showBadge: false,
        description: "Shows your active timer on the lock screen",
      });

      console.log("Timer notification channel configured for Android");
    } catch (error) {
      console.error("Failed to setup timer notification channel:", error);
    }
  }
}

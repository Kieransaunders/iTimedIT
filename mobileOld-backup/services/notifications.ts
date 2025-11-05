import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { setupTimerNotificationChannel, setupTimerNotificationCategory } from "./timerNotification";

/**
 * Configure how notifications are handled when the app is in the foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification: Notifications.Notification) => {
    const notificationType = notification.request.content.data?.type;

    // Timer running notifications should be silent (no banner/alert)
    // They update every 3-5 seconds and should only show in notification tray
    if (notificationType === "timer-running" ||
        notification.request.content.categoryIdentifier === "timer-running") {
      return {
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: true, // Still show in notification list
      };
    }

    // All other notifications (interrupts, budget alerts, etc.) should show
    return {
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/**
 * Request notification permissions from the user
 * @returns true if permissions were granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/**
 * Get the Expo push token for this device
 * @returns The push token string
 * @throws Error with detailed message if token cannot be obtained
 */
export async function getExpoPushToken(): Promise<string> {
  // Check if running on a physical device
  if (!Constants.isDevice) {
    console.warn(
      "⚠️ Push notifications only work on physical devices. " +
      "Skipping token registration on simulator/emulator."
    );
    // Return a dummy token for development on simulators
    return "ExponentPushToken[simulator-development-token]";
  }

  // Request permissions first
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    throw new Error(
      "Notification permissions not granted. " +
      "Please enable notifications in your device settings."
    );
  }

  // Get the push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    console.warn("No EAS project ID found. This may cause issues in production.");
    console.warn("Set EXPO_PUBLIC_EAS_PROJECT_ID in your .env file.");
  }

  try {
    console.log(`Getting Expo push token${projectId ? ` with project ID: ${projectId}` : " without project ID"}...`);

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    if (!tokenData?.data) {
      throw new Error("Token data is missing or invalid");
    }

    console.log("Successfully obtained push token:", tokenData.data.substring(0, 20) + "...");
    return tokenData.data;
  } catch (error) {
    // Provide detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get Expo push token: ${errorMessage}. ` +
      `Device: ${Constants.isDevice ? "Physical" : "Simulator"}, ` +
      `Platform: ${Platform.OS}, ` +
      `Project ID: ${projectId || "Not set"}`
    );
  }
}

/**
 * Configure notification channels for Android
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9d4edd",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync("timer-interrupts", {
      name: "Timer Interrupts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9d4edd",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync("budget-alerts", {
      name: "Budget Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ff9f1c",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Timer foreground notification channel
    await setupTimerNotificationChannel();
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  categoryIdentifier?: string
): Promise<string> {
  const content: Notifications.NotificationContentInput = {
    title,
    body,
    data,
    sound: true, // Enable sound for better visibility
    priority: Notifications.AndroidNotificationPriority.HIGH,
  };

  // Only include categoryIdentifier if it's provided
  if (categoryIdentifier) {
    content.categoryIdentifier = categoryIdentifier;
  }

  // Platform-specific settings for lock screen visibility
  if (Platform.OS === "android") {
    content.channelId = "default";
  }

  return await Notifications.scheduleNotificationAsync({
    content,
    trigger: null, // Show immediately
  });
}

/**
 * Set up notification categories with actions
 */
export async function setupNotificationCategories(): Promise<void> {
  // Timer interrupt category with Continue and Stop actions
  await Notifications.setNotificationCategoryAsync("timer-interrupt", [
    {
      identifier: "continue",
      buttonTitle: "Continue",
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: "stop",
      buttonTitle: "Stop",
      options: {
        opensAppToForeground: false,
      },
    },
  ]);

  // Pomodoro break category with Start Break action
  await Notifications.setNotificationCategoryAsync("pomodoro-break", [
    {
      identifier: "start-break",
      buttonTitle: "Start Break",
      options: {
        opensAppToForeground: false,
      },
    },
  ]);

  // Pomodoro complete category with Continue action
  await Notifications.setNotificationCategoryAsync("pomodoro-complete", [
    {
      identifier: "continue-work",
      buttonTitle: "Continue",
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  // Timer running category with Stop and View actions
  await setupTimerNotificationCategory();
}

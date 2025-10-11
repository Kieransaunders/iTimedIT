import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Configure how notifications are handled when the app is in the foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification: Notifications.Notification) => {
    return {
      shouldShowAlert: true,
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
 * @returns The push token string or null if unable to get token
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    // Check if running on a physical device
    if (!Constants.isDevice) {
      console.warn("Push notifications only work on physical devices");
      return null;
    }

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn("Notification permissions not granted");
      return null;
    }

    // Get the push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    // For development, we can skip the projectId requirement
    // In production, you'll need a valid EAS project ID
    const tokenData = projectId 
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenData.data;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
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
    });

    await Notifications.setNotificationChannelAsync("timer-interrupts", {
      name: "Timer Interrupts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9d4edd",
    });

    await Notifications.setNotificationChannelAsync("budget-alerts", {
      name: "Budget Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ff9f1c",
    });
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
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      categoryIdentifier,
    },
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
}

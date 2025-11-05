import { api } from "@/convex/_generated/api";
import {
    getExpoPushToken,
    requestNotificationPermissions,
    setupNotificationCategories,
    setupNotificationChannels,
} from "@/services/notifications";
import { useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";

export type NotificationHandler = (notification: Notifications.Notification) => void;
export type NotificationResponseHandler = (response: Notifications.NotificationResponse) => void;

export interface UseNotificationsReturn {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  notificationResponse: Notifications.NotificationResponse | null;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  registerForPushNotifications: () => Promise<void>;
  setNotificationHandler: (handler: NotificationHandler | null) => void;
  setResponseHandler: (handler: NotificationResponseHandler | null) => void;
}

/**
 * Hook for managing push notifications
 * Handles permission requests, token registration, and notification listeners
 */
export function useNotifications(): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [notificationResponse, setNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerToken = useMutation(api.users.registerExpoPushToken);
  const router = useRouter();

  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const customNotificationHandler = useRef<NotificationHandler | null>(null);
  const customResponseHandler = useRef<NotificationResponseHandler | null>(null);

  /**
   * Request notification permissions from the user
   */
  const requestPermissions = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const granted = await requestNotificationPermissions();
      setHasPermission(granted);
      return granted;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to request permissions";
      setError(message);
      console.error("Error requesting notification permissions:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register for push notifications and store token in Convex
   */
  const registerForPushNotifications = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Starting push notification registration...");

      // Set up notification channels (Android) and categories (iOS)
      await setupNotificationChannels();
      await setupNotificationCategories();

      // Request permissions
      const granted = await requestPermissions();
      if (!granted) {
        throw new Error("Notification permissions not granted");
      }

      // Get the Expo push token (now throws with detailed error)
      const token = await getExpoPushToken();

      setExpoPushToken(token);

      // Collect device information
      const deviceInfo = {
        platform: Platform.OS,
        deviceName: Device.deviceName || undefined,
        osVersion: Device.osVersion || undefined,
        appVersion: Constants.expoConfig?.version || undefined,
      };

      // Register the token with Convex
      await registerToken({ token, deviceInfo });

      console.log("Successfully registered push token with backend");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register for push notifications";
      setError(message);
      console.error("Error registering for push notifications:", err);

      // Re-throw the error so callers can handle it
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set a custom notification handler for foreground notifications
   */
  const setNotificationHandler = (handler: NotificationHandler | null) => {
    customNotificationHandler.current = handler;
  };

  /**
   * Set a custom response handler for notification taps
   */
  const setResponseHandler = (handler: NotificationResponseHandler | null) => {
    customResponseHandler.current = handler;
  };

  /**
   * Handle foreground notifications
   */
  const handleForegroundNotification = (notification: Notifications.Notification) => {
    console.log("Foreground notification received:", notification);
    setNotification(notification);

    // Call custom handler if set
    if (customNotificationHandler.current) {
      customNotificationHandler.current(notification);
      return;
    }

    // Default behavior: show in-app alert
    const { title, body, data } = notification.request.content;

    // SKIP ALERTS FOR TIMER-RUNNING AND WEB-TIMER-STARTED NOTIFICATIONS
    // Timer updates every 3-5 seconds and should NOT show as popup alerts
    // Web timer started notifications should only show in notification tray
    if (data?.type === "timer-running" ||
        data?.type === "web-timer-started" ||
        notification.request.content.categoryIdentifier === "timer-running") {
      return; // Silent - no alert
    }

    // Determine alert buttons based on notification type
    let buttons: any[] = [{ text: "OK", style: "default" }];

    if (data?.type === "budget-warning" || data?.type === "budget-overrun") {
      buttons = [
        { text: "Dismiss", style: "cancel" },
        {
          text: "View Timer",
          style: "default",
          onPress: () => router.push("/(tabs)")
        }
      ];
    } else if (data?.type === "pomodoro-break") {
      buttons = [
        { text: "OK", style: "default" }
      ];
    } else if (data?.type === "pomodoro-complete") {
      buttons = [
        { text: "Dismiss", style: "cancel" },
        {
          text: "Continue",
          style: "default",
          onPress: () => router.push("/")
        }
      ];
    }

    if (Platform.OS === 'ios') {
      // On iOS, show an alert for foreground notifications
      Alert.alert(
        title || "Notification",
        body || "",
        buttons
      );
    }
    // On Android, the notification will be shown by the system
  };

  /**
   * Handle notification responses (when user taps notification)
   */
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    console.log("Notification response received:", response);
    setNotificationResponse(response);

    // Call custom handler if set
    if (customResponseHandler.current) {
      customResponseHandler.current(response);
      return;
    }

    // Get action identifier for notification actions (Stop, View, etc.)
    const actionIdentifier = response.actionIdentifier;

    // Default behavior: handle deep linking based on notification data
    const data = response.notification.request.content.data;

    if (data?.type) {
      switch (data.type) {
        case "timer-running":
          // Handle timer notification actions
          if (actionIdentifier === "stop-timer") {
            // Timer will be stopped via custom handler set in index.tsx
            console.log("Stop timer action triggered from notification");
          } else {
            // Default tap or "view-timer" action - navigate to timer screen
            router.push("/");
          }
          break;

        case "timer-interrupt":
          // Navigate to timer screen (already on home)
          router.push("/");
          break;

        case "budget-warning":
        case "budget-overrun":
          // Navigate to timer screen to show project details
          router.push("/(tabs)");
          break;

        case "pomodoro-break":
        case "pomodoro-complete":
          // Navigate to timer screen
          router.push("/");
          break;

        default:
          // Navigate to home by default
          router.push("/");
      }
    }
  };

  /**
   * Set up notification listeners on mount
   */
  useEffect(() => {
    // Check current permission status
    Notifications.getPermissionsAsync().then((status) => {
      setHasPermission(status.status === "granted");
    });

    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      handleForegroundNotification
    );

    // Listener for when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response);
        }
      })
      .catch((err) => {
        console.error("Error getting last notification response:", err);
      });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    notificationResponse,
    hasPermission,
    isLoading,
    error,
    requestPermissions,
    registerForPushNotifications,
    setNotificationHandler,
    setResponseHandler,
  };
}

import { Platform, Linking, Alert } from "react-native";
import { storage } from "./storage";

/**
 * Battery Optimization Service
 *
 * Handles Android battery optimization detection and exemption requests
 * to ensure timer notifications work reliably in the background
 */

const BATTERY_PROMPT_SHOWN_KEY = "battery_optimization_prompt_shown";

/**
 * Check if the app should request battery optimization exemption
 * Only relevant for Android
 */
export async function shouldRequestBatteryOptimization(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  try {
    // Check if we've already shown the prompt
    const promptShown = await storage.getItem(BATTERY_PROMPT_SHOWN_KEY);

    if (promptShown === "true") {
      return false;
    }

    // In a real implementation, you would check the actual battery optimization status
    // using a native module. For now, we'll just check if it's the first time.
    return true;
  } catch (error) {
    console.error("Error checking battery optimization status:", error);
    return false;
  }
}

/**
 * Mark that the battery optimization prompt has been shown
 */
export async function markBatteryPromptShown(): Promise<void> {
  try {
    await storage.setItem(BATTERY_PROMPT_SHOWN_KEY, "true");
  } catch (error) {
    console.error("Error marking battery prompt shown:", error);
  }
}

/**
 * Reset the battery prompt state (for testing or settings)
 */
export async function resetBatteryPrompt(): Promise<void> {
  try {
    await storage.removeItem(BATTERY_PROMPT_SHOWN_KEY);
  } catch (error) {
    console.error("Error resetting battery prompt:", error);
  }
}

/**
 * Show alert explaining battery optimization and request exemption
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  Alert.alert(
    "Battery Optimization",
    "To ensure your timer notifications work reliably, please disable battery optimization for iTimedIT.\n\n" +
    "This will allow the app to show your active timer on the lock screen even when your phone is locked.",
    [
      {
        text: "Not Now",
        style: "cancel",
        onPress: async () => {
          await markBatteryPromptShown();
        },
      },
      {
        text: "Open Settings",
        onPress: async () => {
          await markBatteryPromptShown();
          await openBatterySettings();
        },
      },
    ]
  );
}

/**
 * Open device battery optimization settings
 */
async function openBatterySettings(): Promise<void> {
  try {
    // Try to open battery settings
    // Note: This is a best-effort approach. The exact intent may vary by device.
    const settingsUrl = "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS";

    const supported = await Linking.canOpenURL(`intent://${settingsUrl}#Intent;end`);

    if (supported) {
      await Linking.openURL(`intent://${settingsUrl}#Intent;end`);
    } else {
      // Fallback to general app settings
      await Linking.openSettings();
    }
  } catch (error) {
    console.error("Error opening battery settings:", error);

    // Fallback to general app settings
    try {
      await Linking.openSettings();
    } catch (fallbackError) {
      console.error("Error opening app settings:", fallbackError);
      Alert.alert(
        "Cannot Open Settings",
        "Please manually navigate to Settings > Apps > iTimedIT > Battery to disable battery optimization."
      );
    }
  }
}

/**
 * Show battery optimization guidance with instructions
 */
export function showBatteryOptimizationGuide(): void {
  Alert.alert(
    "Battery Optimization Guide",
    "To ensure timer notifications work on your lock screen:\n\n" +
    "1. Open your device Settings\n" +
    "2. Go to Apps > iTimedIT\n" +
    "3. Tap Battery\n" +
    "4. Select 'Unrestricted' or 'Don't optimize'\n\n" +
    "This allows the app to update your timer while your screen is locked.",
    [
      {
        text: "Got It",
        style: "default",
      },
      {
        text: "Open Settings",
        onPress: openBatterySettings,
      },
    ]
  );
}

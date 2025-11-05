import * as Haptics from "expo-haptics";

/**
 * Provides a light haptic feedback.
 * Use for: Button taps, minor UI interactions, list item selections
 *
 * @example
 * ```typescript
 * <TouchableOpacity onPress={() => { lightTap(); handlePress(); }}>
 * ```
 */
export const lightTap = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Silently fail - some devices don't support haptics
    console.debug("Haptic feedback not available:", error);
  }
};

/**
 * Provides a medium haptic feedback.
 * Use for: Standard button presses, modal dismissals, tab switches
 *
 * @example
 * ```typescript
 * <Button onPress={() => { mediumTap(); handleSubmit(); }}>
 * ```
 */
export const mediumTap = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    // Silently fail - some devices don't support haptics
    console.debug("Haptic feedback not available:", error);
  }
};

/**
 * Provides a heavy haptic feedback.
 * Use for: Important actions, destructive operations, confirmation dialogs
 *
 * @example
 * ```typescript
 * <Button onPress={() => { heavyTap(); handleDelete(); }}>
 * ```
 */
export const heavyTap = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    // Silently fail - some devices don't support haptics
    console.debug("Haptic feedback not available:", error);
  }
};

/**
 * Provides a soft success haptic feedback.
 * Use for: Success states, completed actions, positive confirmations
 *
 * @example
 * ```typescript
 * await saveData();
 * softTap();
 * showSuccessToast();
 * ```
 */
export const softTap = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    // Silently fail - some devices don't support haptics
    console.debug("Haptic feedback not available:", error);
  }
};

/**
 * Provides a warning haptic feedback.
 * Use for: Warnings, budget alerts, threshold notifications
 *
 * @example
 * ```typescript
 * if (budgetExceeded) {
 *   warningTap();
 *   showWarningMessage();
 * }
 * ```
 */
export const warningTap = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    // Silently fail - some devices don't support haptics
    console.debug("Haptic feedback not available:", error);
  }
};

/**
 * Haptics utility for providing tactile feedback on user interactions.
 *
 * All functions are safe to call on any device - they will silently fail
 * on devices that don't support haptic feedback.
 */
export const HapticsManager = {
  lightTap,
  mediumTap,
  heavyTap,
  softTap,
  warningTap,
} as const;

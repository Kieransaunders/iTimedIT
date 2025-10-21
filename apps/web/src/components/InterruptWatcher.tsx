/**
 * InterruptWatcher - Global Timer Interrupt Alert System
 *
 * This component monitors timer interrupts across all screens and provides
 * multi-channel alerts when an interrupt occurs, ensuring users never miss
 * an interrupt even when viewing Settings, Clients, Projects, or other pages.
 *
 * Alert Channels:
 * 1. Sound Alert - Plays break start sound (if enabled)
 * 2. Browser Notification - Native notification with action buttons
 * 3. Toast Notification - In-app toast visible on all screens
 * 4. Tab Title Update - Countdown in browser tab (handled by ModernDashboard)
 * 5. Favicon Update - Visual indicator (handled by ModernDashboard)
 */

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { enableSounds, playBreakStartSound } from "../lib/sounds";

export function InterruptWatcher() {
  const runningTimer = useQuery(api.timer.getRunningTimer);
  const userSettings = useQuery(api.timer.getUserSettings);
  const notificationPrefs = useQuery(api.pushNotifications.getNotificationPreferences);
  const ackInterrupt = useMutation(api.timer.ackInterrupt);

  // Track if we've already alerted for this interrupt
  const lastInterruptTimeRef = useRef<number | null>(null);
  const notificationShownRef = useRef(false);

  useEffect(() => {
    // Check if there's an active interrupt
    if (!runningTimer?.awaitingInterruptAck) {
      // Reset tracking when interrupt is cleared
      lastInterruptTimeRef.current = null;
      notificationShownRef.current = false;
      return;
    }

    const interruptTime = runningTimer.interruptShownAt;

    // Only trigger alerts if this is a new interrupt
    if (lastInterruptTimeRef.current === interruptTime) {
      return;
    }

    // Update tracking
    lastInterruptTimeRef.current = interruptTime;
    notificationShownRef.current = false;

    console.log("🚨 Global interrupt watcher triggered for interrupt at:", interruptTime);

    // Get user preferences
    const soundEnabled = notificationPrefs?.soundEnabled !== false; // Default: true
    const webPushEnabled = notificationPrefs?.webPushEnabled !== false; // Default: true
    const doNotDisturb = notificationPrefs?.doNotDisturbEnabled === true; // Default: false

    // Respect do-not-disturb mode
    if (doNotDisturb) {
      console.log("⏸️ Do not disturb enabled - skipping alerts");
      return;
    }

    // Check quiet hours
    if (notificationPrefs?.quietHoursStart && notificationPrefs?.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const quietStart = notificationPrefs.quietHoursStart;
      const quietEnd = notificationPrefs.quietHoursEnd;

      // Simple quiet hours check (doesn't handle midnight crossing)
      if (currentTime >= quietStart && currentTime <= quietEnd) {
        console.log("🌙 Quiet hours active - skipping alerts");
        return;
      }
    }

    // 1. Play sound alert
    if (soundEnabled) {
      console.log("🔊 Playing interrupt sound");
      enableSounds();
      playBreakStartSound(userSettings?.notificationSound);
    }

    // 2. Show toast notification
    const projectName = runningTimer.project?.name || "this project";
    const gracePeriod = userSettings?.gracePeriod || 5;

    toast.warning(`Still working on ${projectName}?`, {
      description: `Timer will auto-stop in ${gracePeriod} seconds unless you respond`,
      duration: gracePeriod * 1000,
      action: {
        label: "Continue",
        onClick: async () => {
          await ackInterrupt({ continue: true });
        },
      },
    });

    // 3. Show browser notification (if permission granted and enabled)
    if (webPushEnabled && !notificationShownRef.current) {
      showBrowserNotification(projectName, gracePeriod, ackInterrupt);
      notificationShownRef.current = true;
    }

  }, [
    runningTimer?.awaitingInterruptAck,
    runningTimer?.interruptShownAt,
    runningTimer?.project?.name,
    userSettings?.notificationSound,
    userSettings?.gracePeriod,
    notificationPrefs?.soundEnabled,
    notificationPrefs?.webPushEnabled,
    notificationPrefs?.doNotDisturbEnabled,
    notificationPrefs?.quietHoursStart,
    notificationPrefs?.quietHoursEnd,
    ackInterrupt,
  ]);

  // This component doesn't render anything
  return null;
}

/**
 * Show browser notification using Notification API
 */
async function showBrowserNotification(
  projectName: string,
  gracePeriod: number,
  ackInterrupt: (args: { continue: boolean }) => Promise<void>
) {
  // Check if browser supports notifications
  if (!("Notification" in window)) {
    console.warn("Browser doesn't support notifications");
    return;
  }

  // Check permission
  let permission = Notification.permission;

  // Request permission if not yet determined
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  // Only show notification if permission granted
  if (permission !== "granted") {
    console.log("Notification permission not granted:", permission);
    return;
  }

  console.log("📬 Showing browser notification");

  // Create notification
  const notification = new Notification("Timer Interruption", {
    body: `Still working on ${projectName}? Auto-stop in ${gracePeriod}s`,
    icon: "/iconnectit.png",
    badge: "/iconnectit.png",
    tag: "timer-interrupt", // Reuse notification slot
    requireInteraction: true, // Keep notification until user interacts
    silent: false, // Play system sound
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    actions: [
      { action: "continue", title: "Continue" },
      { action: "stop", title: "Stop Timer" },
    ] as any, // TypeScript doesn't recognize actions in constructor
  });

  // Handle notification click
  notification.onclick = async () => {
    window.focus();
    await ackInterrupt({ continue: true });
    notification.close();
  };

  // Auto-close notification after grace period
  setTimeout(() => {
    notification.close();
  }, gracePeriod * 1000);
}

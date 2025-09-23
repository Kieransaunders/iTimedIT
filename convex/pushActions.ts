"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { buildNotificationUrl, hasFallbackChannelEnabled } from "./lib/notificationHelpers";

// Send push notification action
export const sendTimerAlert = action({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    alertType: v.union(
      v.literal("interrupt"),
      v.literal("overrun"),
      v.literal("budget_warning"),
      v.literal("break_reminder")
    ),
    projectName: v.optional(v.string()),
    clientName: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    reason?: string;
    results?: Array<{
      subscriptionId: string;
      success: boolean;
      error?: string;
    }>;
    totalSubscriptions?: number;
  }> => {
    // Get user notification preferences
    const prefs = await ctx.runQuery(internal.pushNotifications.getNotificationPrefsForUser, {
      userId: args.userId,
    });

    const hasFallback = prefs ? hasFallbackChannelEnabled(prefs) : false;

    // Get active push subscriptions for this user
    const subscriptions = await ctx.runQuery(internal.pushNotifications.getUserSubscriptionsForUser, {
      userId: args.userId,
    });

    if ((!prefs || !prefs.webPushEnabled) && hasFallback) {
      await ctx.runAction(api.fallbackNotifications.dispatchFallbacks, buildFallbackArgs(args));
      return { success: false, reason: "notifications_disabled" };
    }

    if (!prefs || !prefs.webPushEnabled) {
      console.log("Push notifications disabled and no fallbacks configured");
      return { success: false, reason: "notifications_disabled" };
    }

    if (subscriptions.length === 0) {
      console.log("No active push subscriptions for user");
      if (hasFallback) {
        await ctx.runAction(api.fallbackNotifications.dispatchFallbacks, buildFallbackArgs(args));
      }
      return { success: false, reason: "no_subscriptions" };
    }

    // Check quiet hours
    if (prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (isInQuietHours(currentTime, prefs.quietHoursStart, prefs.quietHoursEnd)) {
        console.log("Currently in quiet hours, skipping notification");
        return { success: false, reason: "quiet_hours" };
      }
    }

    const webpush = await import("web-push");
    
    // Configure VAPID details
    webpush.default.setVapidDetails(
      'mailto:support@timer-app.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const notificationUrl = buildNotificationUrl(args.alertType, args.data);

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      icon: '/icons/timer.svg',
      badge: '/icons/badge.svg',
      tag: 'timer-alert',
      requireInteraction: true,
      data: {
        alertType: args.alertType,
        projectName: args.projectName,
        clientName: args.clientName,
        timestamp: Date.now(),
        ...args.data,
        url: notificationUrl,
      },
      actions: getActionsForAlertType(args.alertType),
    });

    const results: Array<{
      subscriptionId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const subscription of subscriptions) {
      try {
        console.log('Sending push notification with payload:', payload);
        
        await webpush.default.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          },
          payload,
          {
            contentEncoding: 'aes128gcm'
          }
        );

        // Update last used timestamp
        await ctx.runMutation(internal.pushNotifications.updateSubscriptionLastUsed, {
          subscriptionId: subscription._id,
        });

        results.push({ subscriptionId: subscription._id, success: true });
      } catch (error) {
        console.error("Failed to send push notification:", error);
        
        // If the subscription is invalid, deactivate it
        if (error instanceof Error && (error.message.includes('410') || error.message.includes('invalid'))) {
          await ctx.runMutation(internal.pushNotifications.deactivateSubscription, {
            subscriptionId: subscription._id,
          });
        }
        
        results.push({ 
          subscriptionId: subscription._id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const pushSuccess = results.some((r) => r.success);

    if (!pushSuccess && hasFallback) {
      await ctx.runAction(api.fallbackNotifications.dispatchFallbacks, buildFallbackArgs(args));
    }

    if (pushSuccess && hasFallback && !prefs.doNotDisturbEnabled) {
      const delayMs = (prefs.escalationDelayMinutes ?? 2) * 60 * 1000;
      await ctx.scheduler.runAfter(delayMs, internal.fallbackNotifications.escalateIfStillRelevant, {
        ...buildFallbackArgs(args),
        organizationId: args.data?.organizationId,
        timerId: args.data?.timerId,
      });
    }

    return {
      success: pushSuccess,
      results,
      totalSubscriptions: subscriptions.length,
    };
  },
});

// Helper functions
function isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start <= end) {
    // Same day quiet hours (e.g., 22:00 to 08:00)
    return current >= start && current <= end;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00)
    return current >= start || current <= end;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function buildFallbackArgs(args: any) {
  return {
    userId: args.userId,
    title: args.title,
    body: args.body,
    alertType: args.alertType,
    projectName: args.projectName,
    clientName: args.clientName,
    url: buildNotificationUrl(args.alertType, args.data),
  };
}

function getActionsForAlertType(alertType: string) {
  switch (alertType) {
    case 'interrupt':
      return [
        { action: 'stop', title: 'Stop Timer', icon: '/icons/stop.svg' },
        { action: 'snooze', title: 'Snooze 5min', icon: '/icons/snooze.svg' },
        { action: 'switch', title: 'Switch Project', icon: '/icons/switch.svg' },
      ];
    case 'overrun':
      return [
        { action: 'stop', title: 'Stop Timer', icon: '/icons/stop.svg' },
        { action: 'snooze', title: 'Snooze 5min', icon: '/icons/snooze.svg' },
      ];
    case 'budget_warning':
      return [
        { action: 'stop', title: 'Stop Timer', icon: '/icons/stop.svg' },
        { action: 'switch', title: 'Switch Project', icon: '/icons/switch.svg' },
      ];
    case 'break_reminder':
      return [
        { action: 'stop', title: 'Take a Break', icon: '/icons/stop.svg' },
        { action: 'switch', title: 'Switch Focus', icon: '/icons/switch.svg' },
      ];
    default:
      return [
        { action: 'stop', title: 'Stop Timer', icon: '/icons/stop.svg' },
        { action: 'snooze', title: 'Snooze 5min', icon: '/icons/snooze.svg' },
      ];
  }
}

"use node";

import { action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Send push notification to mobile devices via Expo Push Service
 * This action sends notifications to all active Expo tokens for a user
 */
export const sendExpoPushNotification = action({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    sound: v.optional(v.union(v.literal("default"), v.literal(null))),
    badge: v.optional(v.number()),
    categoryId: v.optional(v.string()),
    priority: v.optional(v.union(
      v.literal("default"),
      v.literal("normal"),
      v.literal("high")
    )),
    ttl: v.optional(v.number()), // Time to live in seconds
    channelId: v.optional(v.string()), // Android channel ID
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    errors?: Array<{ token: string; error: string }>;
  }> => {
    // Get active Expo push tokens for this user
    const tokens = await ctx.runQuery(internal.expoPushActions.getActiveExpoPushTokens, {
      userId: args.userId,
    });

    if (tokens.length === 0) {
      console.log("No active Expo push tokens found for user:", args.userId);
      return { success: false, sentCount: 0, failedCount: 0 };
    }

    // Prepare messages for Expo Push Service
    const messages = tokens.map((tokenData) => {
      // Add platform-specific enhancements
      const message: any = {
        to: tokenData.token,
        sound: args.sound ?? "default",
        title: args.title,
        body: args.body,
        data: args.data || {},
        badge: args.badge ?? 1, // Default badge to 1 for new notifications
        categoryId: args.categoryId,
        priority: args.priority ?? "high",
        ttl: args.ttl ?? 3600, // Default 1 hour TTL
        channelId: args.channelId,
      };

      // Add Android-specific settings
      if (tokenData.deviceInfo?.platform === "android") {
        message.android = {
          priority: args.priority === "high" ? "high" : "normal",
          channelId: args.channelId || "default",
        };
      }

      // Add iOS-specific settings
      if (tokenData.deviceInfo?.platform === "ios") {
        message.ios = {
          sound: args.sound ?? "default",
          badge: args.badge ?? 1,
          _displayInForeground: true,
        };
      }

      return message;
    });

    // Send to Expo Push Service
    const results = await sendToExpoPushService(messages);

    // Process results and update token status
    let sentCount = 0;
    let failedCount = 0;
    const errors: Array<{ token: string; error: string }> = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const tokenData = tokens[i];

      if (result.status === "ok") {
        sentCount++;
        // Update last used timestamp
        await ctx.runMutation(internal.expoPushActions.updateTokenLastUsed, {
          tokenId: tokenData._id,
        });
      } else {
        failedCount++;
        errors.push({
          token: tokenData.token.substring(0, 20) + "...",
          error: result.message || "Unknown error",
        });

        // Deactivate token if it's invalid
        if (result.details?.error === "DeviceNotRegistered") {
          console.log("Deactivating invalid Expo push token:", tokenData._id);
          await ctx.runMutation(internal.expoPushActions.deactivateToken, {
            tokenId: tokenData._id,
          });
        }
      }
    }

    console.log(`Expo push notification sent: ${sentCount} success, ${failedCount} failed`);

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * Send messages to Expo Push Service API
 */
async function sendToExpoPushService(messages: any[]): Promise<any[]> {
  const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Expo Push Service error:", errorText);
      throw new Error(`Expo Push Service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Expo returns { data: [results] }
    return result.data || [];
  } catch (error) {
    console.error("Failed to send to Expo Push Service:", error);
    // Return error results for all messages
    return messages.map(() => ({
      status: "error",
      message: error instanceof Error ? error.message : "Network error",
    }));
  }
}

/**
 * Internal query to get active Expo push tokens for a user
 */
export const getActiveExpoPushTokens = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("expoPushTokens")
      .withIndex("byUserActive", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();
  },
});

/**
 * Internal mutation to update token last used timestamp
 */
export const updateTokenLastUsed = internalMutation({
  args: { tokenId: v.id("expoPushTokens") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, {
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to deactivate an invalid token
 */
export const deactivateToken = internalMutation({
  args: { tokenId: v.id("expoPushTokens") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, {
      isActive: false,
    });
  },
});

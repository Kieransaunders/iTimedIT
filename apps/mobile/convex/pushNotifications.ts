import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ensureMembership, requireMembership, maybeMembership } from "./orgContext";
import { internal } from "./_generated/api";

// Save or update push subscription
export const savePushSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dhKey: v.string(),
    authKey: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await ensureMembership(ctx);
    const { userId } = membership;

    // Check if subscription already exists
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byEndpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    const now = Date.now();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        userId,
        p256dhKey: args.p256dhKey,
        authKey: args.authKey,
        userAgent: args.userAgent,
        lastUsedAt: now,
        isActive: true,
      });
      return existing._id;
    } else {
      // Create new subscription
      const subscriptionId = await ctx.db.insert("pushSubscriptions", {
        userId,
        endpoint: args.endpoint,
        p256dhKey: args.p256dhKey,
        authKey: args.authKey,
        userAgent: args.userAgent,
        createdAt: now,
        lastUsedAt: now,
        isActive: true,
      });
      return subscriptionId;
    }
  },
});

// Get user's push subscriptions
export const getUserPushSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const membership = await requireMembership(ctx);
    
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("byUserActive", (q) => 
        q.eq("userId", membership.userId).eq("isActive", true)
      )
      .collect();
  },
});

// Remove push subscription
export const removePushSubscription = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ensureMembership(ctx);
    
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byEndpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (subscription && subscription.userId === membership.userId) {
      await ctx.db.patch(subscription._id, {
        isActive: false,
      });
    }
  },
});

// Get notification preferences (read-only, won't create)
export const getNotificationPrefs = query({
  args: {},
  handler: async (ctx) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return null;
    }

    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("byUser", (q) => q.eq("userId", membership.userId))
      .unique();

    return prefs;
  },
});

// Create default notification preferences if they don't exist
export const ensureNotificationPrefs = mutation({
  args: {},
  handler: async (ctx) => {
    const membership = await ensureMembership(ctx);
    
    let prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("byUser", (q) => q.eq("userId", membership.userId))
      .unique();

    if (!prefs) {
      // Create default preferences
      const now = Date.now();
      const prefsId = await ctx.db.insert("notificationPrefs", {
        userId: membership.userId,
        webPushEnabled: true,
        soundEnabled: true, // Enable sounds by default for better UX
        vibrationEnabled: false,
        wakeLockEnabled: false,
        emailEnabled: false,
        smsEnabled: false,
        slackEnabled: false,
        escalationDelayMinutes: 2,
        doNotDisturbEnabled: false,
        createdAt: now,
        updatedAt: now,
      });
      
      prefs = await ctx.db.get(prefsId);
    }

    return prefs;
  },
});

// Update notification preferences
export const updateNotificationPrefs = mutation({
  args: {
    webPushEnabled: v.optional(v.boolean()),
    soundEnabled: v.optional(v.boolean()),
    vibrationEnabled: v.optional(v.boolean()),
    wakeLockEnabled: v.optional(v.boolean()),
    emailEnabled: v.optional(v.boolean()),
    smsEnabled: v.optional(v.boolean()),
    slackEnabled: v.optional(v.boolean()),
    fallbackEmail: v.optional(v.string()),
    smsNumber: v.optional(v.string()),
    slackWebhookUrl: v.optional(v.string()),
    quietHoursStart: v.optional(v.string()),
    quietHoursEnd: v.optional(v.string()),
    escalationDelayMinutes: v.optional(v.number()),
    timezone: v.optional(v.string()),
    doNotDisturbEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const membership = await ensureMembership(ctx);
    
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("byUser", (q) => q.eq("userId", membership.userId))
      .unique();

    const now = Date.now();
    const payload = {
      userId: membership.userId,
      webPushEnabled: args.webPushEnabled ?? prefs?.webPushEnabled ?? true,
      soundEnabled: args.soundEnabled ?? prefs?.soundEnabled ?? true, // Enable sounds by default
      vibrationEnabled: args.vibrationEnabled ?? prefs?.vibrationEnabled ?? false,
      wakeLockEnabled: args.wakeLockEnabled ?? prefs?.wakeLockEnabled ?? false,
      emailEnabled: args.emailEnabled ?? prefs?.emailEnabled ?? false,
      smsEnabled: args.smsEnabled ?? prefs?.smsEnabled ?? false,
      slackEnabled: args.slackEnabled ?? prefs?.slackEnabled ?? false,
      fallbackEmail: args.fallbackEmail ?? prefs?.fallbackEmail,
      smsNumber: args.smsNumber ?? prefs?.smsNumber,
      slackWebhookUrl: args.slackWebhookUrl ?? prefs?.slackWebhookUrl,
      quietHoursStart: args.quietHoursStart ?? prefs?.quietHoursStart,
      quietHoursEnd: args.quietHoursEnd ?? prefs?.quietHoursEnd,
      escalationDelayMinutes: args.escalationDelayMinutes ?? prefs?.escalationDelayMinutes ?? 2,
      timezone: args.timezone ?? prefs?.timezone,
      doNotDisturbEnabled: args.doNotDisturbEnabled ?? prefs?.doNotDisturbEnabled ?? false,
      createdAt: prefs?.createdAt ?? now,
      updatedAt: now,
    } as const;

    if (prefs) {
      await ctx.db.patch(prefs._id, payload);
    } else {
      await ctx.db.insert("notificationPrefs", payload);
    }
  },
});


// Internal functions for actions
export const getUserSubscriptionsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("byUserActive", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();
  },
});

export const getNotificationPrefsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notificationPrefs")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const updateSubscriptionLastUsed = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      lastUsedAt: Date.now(),
    });
  },
});

export const deactivateSubscription = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      isActive: false,
    });
  },
});


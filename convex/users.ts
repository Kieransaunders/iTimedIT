import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    return settings || {
      userId,
      interruptEnabled: true,
      interruptInterval: 45, // 45 minutes default
      gracePeriod: 60, // 60 seconds default
      budgetWarningEnabled: true,
      budgetWarningThresholdHours: 1.0,
      budgetWarningThresholdAmount: 50.0,
      pomodoroEnabled: false,
      pomodoroWorkMinutes: 25,
      pomodoroBreakMinutes: 5,
      currency: "USD" as const,
    };
  },
});

export const ensureUserSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    if (!settings) {
      const defaultSettings = {
        userId,
        interruptEnabled: true,
        interruptInterval: 45, // 45 minutes default
        gracePeriod: 60, // 60 seconds default
        budgetWarningEnabled: true,
        budgetWarningThresholdHours: 1.0,
        budgetWarningThresholdAmount: 50.0,
        pomodoroEnabled: false,
        pomodoroWorkMinutes: 25,
        pomodoroBreakMinutes: 5,
        currency: "USD" as const,
      };
      await ctx.db.insert("userSettings", defaultSettings);
      return defaultSettings;
    }

    return settings;
  },
});

export const updateSettings = mutation({
  args: {
    interruptEnabled: v.optional(v.boolean()),
    interruptInterval: v.optional(v.number()), // Minutes: 1-480
    gracePeriod: v.optional(v.number()), // Seconds: 5-300
    budgetWarningEnabled: v.optional(v.boolean()),
    budgetWarningThresholdHours: v.optional(v.number()),
    budgetWarningThresholdAmount: v.optional(v.number()),
    pomodoroEnabled: v.optional(v.boolean()),
    pomodoroWorkMinutes: v.optional(v.number()),
    pomodoroBreakMinutes: v.optional(v.number()),
    currency: v.optional(v.union(
      v.literal("USD"),
      v.literal("EUR"),
      v.literal("GBP")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate interrupt interval (0.0833-480 minutes, allowing 5 seconds debug mode)
    if (args.interruptInterval !== undefined && (args.interruptInterval < 0.0833 || args.interruptInterval > 480)) {
      throw new Error("Interrupt interval must be between 0.0833 and 480 minutes");
    }

    // Validate grace period (5-300 seconds)
    if (args.gracePeriod !== undefined && (args.gracePeriod < 5 || args.gracePeriod > 300)) {
      throw new Error("Grace period must be between 5 and 300 seconds");
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    if (!settings) {
      await ctx.db.insert("userSettings", {
        userId,
        interruptEnabled: args.interruptEnabled ?? true,
        interruptInterval: args.interruptInterval ?? 45,
        gracePeriod: args.gracePeriod ?? 60,
        budgetWarningEnabled: args.budgetWarningEnabled ?? true,
        budgetWarningThresholdHours: args.budgetWarningThresholdHours ?? 1.0,
        budgetWarningThresholdAmount: args.budgetWarningThresholdAmount ?? 50.0,
        pomodoroEnabled: args.pomodoroEnabled ?? false,
        pomodoroWorkMinutes: args.pomodoroWorkMinutes ?? 25,
        pomodoroBreakMinutes: args.pomodoroBreakMinutes ?? 5,
        currency: args.currency ?? "USD",
      });
    } else {
      await ctx.db.patch(settings._id, {
        ...(args.interruptEnabled !== undefined && { interruptEnabled: args.interruptEnabled }),
        ...(args.interruptInterval !== undefined && { interruptInterval: args.interruptInterval }),
        ...(args.gracePeriod !== undefined && { gracePeriod: args.gracePeriod }),
        ...(args.budgetWarningEnabled !== undefined && { budgetWarningEnabled: args.budgetWarningEnabled }),
        ...(args.budgetWarningThresholdHours !== undefined && { budgetWarningThresholdHours: args.budgetWarningThresholdHours }),
        ...(args.budgetWarningThresholdAmount !== undefined && { budgetWarningThresholdAmount: args.budgetWarningThresholdAmount }),
        ...(args.pomodoroEnabled !== undefined && { pomodoroEnabled: args.pomodoroEnabled }),
        ...(args.pomodoroWorkMinutes !== undefined && { pomodoroWorkMinutes: args.pomodoroWorkMinutes }),
        ...(args.pomodoroBreakMinutes !== undefined && { pomodoroBreakMinutes: args.pomodoroBreakMinutes }),
        ...(args.currency !== undefined && { currency: args.currency }),
      });
    }
  },
});

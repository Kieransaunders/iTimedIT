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
      interruptInterval: 0.0833 as const,
      gracePeriod: 5 as const,
      budgetWarningEnabled: true,
      budgetWarningThresholdHours: 1.0,
      budgetWarningThresholdAmount: 50.0,
      pomodoroEnabled: false,
      pomodoroWorkMinutes: 25,
      pomodoroBreakMinutes: 5,
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
        interruptInterval: 0.0833 as const,
        gracePeriod: 5 as const,
        budgetWarningEnabled: true,
        budgetWarningThresholdHours: 1.0,
        budgetWarningThresholdAmount: 50.0,
        pomodoroEnabled: false,
        pomodoroWorkMinutes: 25,
        pomodoroBreakMinutes: 5,
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
    interruptInterval: v.optional(
      v.union(v.literal(0.0833), v.literal(5), v.literal(15), v.literal(30), v.literal(45), v.literal(60), v.literal(120))
    ),
    gracePeriod: v.optional(
      v.union(v.literal(5), v.literal(10), v.literal(30), v.literal(60), v.literal(120))
    ),
    budgetWarningEnabled: v.optional(v.boolean()),
    budgetWarningThresholdHours: v.optional(v.number()),
    budgetWarningThresholdAmount: v.optional(v.number()),
    pomodoroEnabled: v.optional(v.boolean()),
    pomodoroWorkMinutes: v.optional(v.number()),
    pomodoroBreakMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    if (!settings) {
      await ctx.db.insert("userSettings", {
        userId,
        interruptEnabled: args.interruptEnabled ?? true,
        interruptInterval: args.interruptInterval ?? 0.0833,
        gracePeriod: args.gracePeriod ?? 5,
        budgetWarningEnabled: args.budgetWarningEnabled ?? true,
        budgetWarningThresholdHours: args.budgetWarningThresholdHours ?? 1.0,
        budgetWarningThresholdAmount: args.budgetWarningThresholdAmount ?? 50.0,
        pomodoroEnabled: args.pomodoroEnabled ?? false,
        pomodoroWorkMinutes: args.pomodoroWorkMinutes ?? 25,
        pomodoroBreakMinutes: args.pomodoroBreakMinutes ?? 5,
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
      });
    }
  },
});

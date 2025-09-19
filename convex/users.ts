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
      interruptInterval: 60 as const,
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
        interruptInterval: 60 as const,
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
      v.union(v.literal(5), v.literal(15), v.literal(30), v.literal(60), v.literal(120))
    ),
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
        interruptInterval: args.interruptInterval ?? 60,
      });
    } else {
      await ctx.db.patch(settings._id, {
        ...(args.interruptEnabled !== undefined && { interruptEnabled: args.interruptEnabled }),
        ...(args.interruptInterval !== undefined && { interruptInterval: args.interruptInterval }),
      });
    }
  },
});

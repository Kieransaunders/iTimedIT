import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

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

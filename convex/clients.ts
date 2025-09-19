import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("clients")
      .withIndex("byOwner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("clients", {
      ownerId: userId,
      name: args.name,
      note: args.note,
      archived: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.optional(v.string()),
    note: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const client = await ctx.db.get(args.id);
    if (!client || client.ownerId !== userId) {
      throw new Error("Client not found");
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.note !== undefined && { note: args.note }),
      ...(args.archived !== undefined && { archived: args.archived }),
    });
  },
});

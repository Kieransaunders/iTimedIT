import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listPersonal = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const clients = await ctx.db
      .query("clients")
      .withIndex("byOwnerPersonal", (q) => 
        q.eq("ownerId", userId).eq("workspaceType", "personal")
      )
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    const clientsWithTotals = await Promise.all(
      clients.map(async (client) => {
        const projects = await ctx.db
          .query("projects")
          .withIndex("byClient", (q) => q.eq("clientId", client._id))
          .filter((q) => q.and(
            q.eq(q.field("archived"), false),
            q.eq(q.field("workspaceType"), "personal"),
            q.eq(q.field("ownerId"), userId)
          ))
          .collect();

        let totalAmount = 0;
        
        for (const project of projects) {
          const timeEntries = await ctx.db
            .query("timeEntries")
            .withIndex("byProject", (q) => q.eq("projectId", project._id))
            .filter((q) => q.neq(q.field("stoppedAt"), undefined))
            .collect();

          const projectTotal = timeEntries.reduce((sum, entry) => {
            if (entry.seconds && entry.stoppedAt) {
              const hours = entry.seconds / 3600;
              return sum + (hours * project.hourlyRate);
            }
            return sum;
          }, 0);

          totalAmount += projectTotal;
        }

        return {
          ...client,
          totalAmountSpent: totalAmount,
        };
      })
    );

    return clientsWithTotals;
  },
});

export const createPersonal = mutation({
  args: {
    name: v.string(),
    note: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
      postCode: v.optional(v.string()),
    })),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("clients", {
      organizationId: undefined,
      createdBy: userId,
      ownerId: userId,
      name: args.name,
      note: args.note,
      address: args.address,
      color: args.color,
      archived: false,
      workspaceType: "personal",
    });
  },
});

export const updatePersonal = mutation({
  args: {
    id: v.id("clients"),
    name: v.optional(v.string()),
    note: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
      postCode: v.optional(v.string()),
    })),
    color: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const client = await ctx.db.get(args.id);
    if (!client || client.ownerId !== userId || client.workspaceType !== "personal") {
      throw new Error("Personal client not found");
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.note !== undefined && { note: args.note }),
      ...(args.address !== undefined && { address: args.address }),
      ...(args.color !== undefined && { color: args.color }),
      ...(args.archived !== undefined && { archived: args.archived }),
    });
  },
});

export const getPersonal = query({
  args: {
    id: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const client = await ctx.db.get(args.id);
    if (!client || client.ownerId !== userId || client.workspaceType !== "personal") {
      throw new Error("Personal client not found");
    }

    return client;
  },
});
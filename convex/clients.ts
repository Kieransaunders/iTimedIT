import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireMembership, ensureMembershipWithRole, requireMembershipWithRole } from "./orgContext";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await requireMembership(ctx);

    const clients = await ctx.db
      .query("clients")
      .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    // Calculate total amount spent for each client
    const clientsWithTotals = await Promise.all(
      clients.map(async (client) => {
        // Get all projects for this client
        const projects = await ctx.db
          .query("projects")
          .withIndex("byClient", (q) => q.eq("clientId", client._id))
          .filter((q) => q.eq(q.field("archived"), false))
          .collect();

        // Calculate total amount across all projects for this client
        let totalAmount = 0;
        
        for (const project of projects) {
          // Get all completed time entries for this project
          const timeEntries = await ctx.db
            .query("timeEntries")
            .withIndex("byProject", (q) => q.eq("projectId", project._id))
            .filter((q) => q.neq(q.field("stoppedAt"), undefined))
            .collect();

          // Calculate total amount for this project
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

export const create = mutation({
  args: {
    name: v.string(),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await ensureMembershipWithRole(ctx, [
      "owner",
      "admin",
    ]);

    return await ctx.db.insert("clients", {
      organizationId,
      createdBy: userId,
      name: args.name,
      note: args.note,
      color: args.color,
      archived: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.optional(v.string()),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const client = await ctx.db.get(args.id);
    if (!client || client.organizationId !== organizationId) {
      throw new Error("Client not found");
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.note !== undefined && { note: args.note }),
      ...(args.color !== undefined && { color: args.color }),
      ...(args.archived !== undefined && { archived: args.archived }),
    });
  },
});

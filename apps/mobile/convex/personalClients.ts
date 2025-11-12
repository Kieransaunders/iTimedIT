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

    // Calculate comprehensive analytics for each client
    const clientsWithAnalytics = await Promise.all(
      clients.map(async (client) => {
        // Get all projects for this client
        const projects = await ctx.db
          .query("projects")
          .withIndex("byClient", (q) => q.eq("clientId", client._id))
          .filter((q) => q.and(
            q.eq(q.field("archived"), false),
            q.eq(q.field("workspaceType"), "personal"),
            q.eq(q.field("ownerId"), userId)
          ))
          .collect();

        const archivedProjects = await ctx.db
          .query("projects")
          .withIndex("byClient", (q) => q.eq("clientId", client._id))
          .filter((q) => q.and(
            q.eq(q.field("archived"), true),
            q.eq(q.field("workspaceType"), "personal"),
            q.eq(q.field("ownerId"), userId)
          ))
          .collect();

        // Calculate comprehensive stats
        let totalAmount = 0;
        let totalSeconds = 0;
        let lastActivity = 0;
        const monthlyData: { [key: string]: { amount: number; seconds: number } } = {};
        const categoryData: { [key: string]: { amount: number; seconds: number } } = {};
        let completedProjectsCount = 0;
        let totalBudgetHours = 0;
        let totalBudgetAmount = 0;

        for (const project of projects) {
          // Track budget allocations
          if (project.budgetType === "hours" && project.budgetHours) {
            totalBudgetHours += project.budgetHours;
          }
          if (project.budgetType === "amount" && project.budgetAmount) {
            totalBudgetAmount += project.budgetAmount;
          }

          // Get all completed time entries for this project
          const timeEntries = await ctx.db
            .query("timeEntries")
            .withIndex("byProject", (q) => q.eq("projectId", project._id))
            .filter((q) => q.neq(q.field("stoppedAt"), undefined))
            .collect();

          // Process each time entry
          for (const entry of timeEntries) {
            if (entry.seconds && entry.stoppedAt) {
              const hours = entry.seconds / 3600;
              const amount = hours * project.hourlyRate;

              totalAmount += amount;
              totalSeconds += entry.seconds;
              lastActivity = Math.max(lastActivity, entry.stoppedAt);

              // Monthly breakdown
              const monthKey = new Date(entry.stoppedAt).toISOString().substring(0, 7); // YYYY-MM
              if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { amount: 0, seconds: 0 };
              }
              monthlyData[monthKey].amount += amount;
              monthlyData[monthKey].seconds += entry.seconds;

              // Category breakdown
              const category = entry.category || 'Uncategorized';
              if (!categoryData[category]) {
                categoryData[category] = { amount: 0, seconds: 0 };
              }
              categoryData[category].amount += amount;
              categoryData[category].seconds += entry.seconds;
            }
          }

          // Check if project is completed (has time entries and is not active)
          if (timeEntries.length > 0) {
            completedProjectsCount++;
          }
        }

        // Calculate health metrics
        const daysSinceLastActivity = lastActivity ? (Date.now() - lastActivity) / (1000 * 60 * 60 * 24) : Infinity;
        const averageProjectValue = projects.length > 0 ? totalAmount / projects.length : 0;
        const utilizationRate = totalBudgetHours > 0 ? (totalSeconds / 3600) / totalBudgetHours : 1;

        // Determine client status
        let status: 'active' | 'inactive' | 'at-risk' = 'inactive';
        if (daysSinceLastActivity < 7) status = 'active';
        else if (daysSinceLastActivity < 30) status = 'at-risk';

        return {
          ...client,
          // Basic totals
          totalAmountSpent: totalAmount,
          totalTimeSpent: totalSeconds,

          // Project metrics
          activeProjectsCount: projects.length,
          completedProjectsCount,
          archivedProjectsCount: archivedProjects.length,
          totalProjectsCount: projects.length + archivedProjects.length,

          // Activity metrics
          lastActivityAt: lastActivity || null,
          daysSinceLastActivity: lastActivity ? daysSinceLastActivity : null,
          status,

          // Performance metrics
          averageProjectValue,
          utilizationRate,
          averageHourlyEarning: totalSeconds > 0 ? totalAmount / (totalSeconds / 3600) : 0,

          // Trend data
          monthlyBreakdown: Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12) // Last 12 months
            .map(([month, data]) => ({
              month,
              amount: data.amount,
              hours: data.seconds / 3600
            })),

          // Category breakdown
          categoryBreakdown: Object.entries(categoryData)
            .map(([category, data]) => ({
              category,
              amount: data.amount,
              hours: data.seconds / 3600,
              percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
        };
      })
    );

    return clientsWithAnalytics;
  },
});

export const createPersonal = mutation({
  args: {
    name: v.string(),
    note: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
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
      websiteUrl: args.websiteUrl,
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
    websiteUrl: v.optional(v.string()),
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
      ...(args.websiteUrl !== undefined && { websiteUrl: args.websiteUrl }),
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

export const deletePersonal = mutation({
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

    // Check for dependent projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("byClient", (q) => q.eq("clientId", args.id))
      .collect();

    if (projects.length > 0) {
      throw new Error("Cannot delete client with existing projects. Please delete or reassign projects first.");
    }

    // Delete the client
    await ctx.db.delete(args.id);
  },
});
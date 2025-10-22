import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireMembership, maybeMembership, ensureMembershipWithRole, requireMembershipWithRole } from "./orgContext";

export const list = query({
  args: {
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
  },
  handler: async (ctx, args) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return [];
    }

    const { organizationId } = membership;

    let clientsQuery = ctx.db
      .query("clients")
      .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("archived"), false));

    // Apply workspace filter - default to work clients for backward compatibility
    if (args.workspaceType === "work" || !args.workspaceType) {
      clientsQuery = clientsQuery.filter((q) => q.or(
        q.eq(q.field("workspaceType"), undefined),
        q.eq(q.field("workspaceType"), "work")
      ));
    } else if (args.workspaceType === "personal") {
      // For personal clients, we shouldn't see them in work context
      clientsQuery = clientsQuery.filter((q) =>
        q.eq(q.field("workspaceType"), "personal")
      );
    }

    const clients = await clientsQuery.collect();

    // Calculate comprehensive analytics for each client
    const clientsWithAnalytics = await Promise.all(
      clients.map(async (client) => {
        // Get all projects for this client
        const projects = await ctx.db
          .query("projects")
          .withIndex("byClient", (q) => q.eq("clientId", client._id))
          .filter((q) => q.eq(q.field("archived"), false))
          .collect();

        const archivedProjects = await ctx.db
          .query("projects")
          .withIndex("byClient", (q) => q.eq("clientId", client._id))
          .filter((q) => q.eq(q.field("archived"), true))
          .collect();

        // Calculate comprehensive stats
        let totalAmount = 0;
        let totalSeconds = 0;
        let lastActivity = 0;
        const monthlyData: { [key: string]: { amount: number; seconds: number } } = {};
        const categoryData: { [key: string]: { amount: number; seconds: number } } = {};
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
          completedProjectsCount: archivedProjects.length,
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

export const getClientAnalytics = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return null;
    }

    const { organizationId } = membership;

    const client = await ctx.db.get(args.clientId);
    if (!client || client.organizationId !== organizationId) {
      return null;
    }

    // Get all projects for this client (both active and archived)
    const projects = await ctx.db
      .query("projects")
      .withIndex("byClient", (q) => q.eq("clientId", args.clientId))
      .collect();

    const activeProjects = projects.filter(p => !p.archived);
    const archivedProjects = projects.filter(p => p.archived);

    // Get all time entries across all projects for this client
    const allTimeEntries = [];
    for (const project of projects) {
      const entries = await ctx.db
        .query("timeEntries")
        .withIndex("byProject", (q) => q.eq("projectId", project._id))
        .filter((q) => q.neq(q.field("stoppedAt"), undefined))
        .collect();
      
      allTimeEntries.push(...entries.map(entry => ({ ...entry, project, hourlyRate: project.hourlyRate })));
    }

    // Calculate detailed analytics
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
    
    let totalRevenue = 0;
    let totalHours = 0;
    let recentRevenue = 0; // Last 30 days
    let recentHours = 0;
    const weeklyData: { [key: string]: { revenue: number; hours: number } } = {};
    const projectStats: { [key: string]: { revenue: number; hours: number; name: string } } = {};
    const categoryStats: { [key: string]: { revenue: number; hours: number } } = {};

    allTimeEntries.forEach(entry => {
      if (entry.seconds && entry.stoppedAt) {
        const hours = entry.seconds / 3600;
        const revenue = hours * entry.hourlyRate;
        
        totalRevenue += revenue;
        totalHours += hours;

        // Recent activity (30 days)
        if (entry.stoppedAt >= thirtyDaysAgo) {
          recentRevenue += revenue;
          recentHours += hours;
        }

        // Weekly breakdown (last 12 weeks)
        const weekStart = new Date(entry.stoppedAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
        const weekKey = weekStart.toISOString().substring(0, 10);
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { revenue: 0, hours: 0 };
        }
        weeklyData[weekKey].revenue += revenue;
        weeklyData[weekKey].hours += hours;

        // Project breakdown
        if (!projectStats[entry.project._id]) {
          projectStats[entry.project._id] = { revenue: 0, hours: 0, name: entry.project.name };
        }
        projectStats[entry.project._id].revenue += revenue;
        projectStats[entry.project._id].hours += hours;

        // Category breakdown
        const category = entry.category || 'Uncategorized';
        if (!categoryStats[category]) {
          categoryStats[category] = { revenue: 0, hours: 0 };
        }
        categoryStats[category].revenue += revenue;
        categoryStats[category].hours += hours;
      }
    });

    // Calculate trends and insights
    const averageHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0;
    const lastActivity = Math.max(...allTimeEntries.map(e => e.stoppedAt || 0));
    const daysSinceLastActivity = lastActivity ? (now - lastActivity) / (1000 * 60 * 60 * 24) : Infinity;
    
    // Growth calculation (compare last 30 days to previous 30 days)
    const previousPeriodRevenue = allTimeEntries
      .filter(e => e.stoppedAt && e.stoppedAt >= ninetyDaysAgo && e.stoppedAt < thirtyDaysAgo)
      .reduce((sum, e) => sum + (e.seconds! / 3600) * e.hourlyRate, 0);
    
    const revenueGrowth = previousPeriodRevenue > 0 
      ? ((recentRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
      : recentRevenue > 0 ? 100 : 0;

    return {
      client,
      overview: {
        totalRevenue,
        totalHours,
        recentRevenue,
        recentHours,
        averageHourlyRate,
        revenueGrowth,
        activeProjectsCount: activeProjects.length,
        completedProjectsCount: archivedProjects.length,
        lastActivity,
        daysSinceLastActivity: lastActivity ? daysSinceLastActivity : null,
        status: daysSinceLastActivity < 7 ? 'active' : daysSinceLastActivity < 30 ? 'at-risk' : 'inactive'
      },
      trends: {
        weeklyData: Object.entries(weeklyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([week, data]) => ({
            week,
            revenue: data.revenue,
            hours: data.hours
          })),
      },
      breakdowns: {
        projects: Object.entries(projectStats)
          .map(([id, data]) => ({
            projectId: id,
            name: data.name,
            revenue: data.revenue,
            hours: data.hours,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
          }))
          .sort((a, b) => b.revenue - a.revenue),
        
        categories: Object.entries(categoryStats)
          .map(([category, data]) => ({
            category,
            revenue: data.revenue,
            hours: data.hours,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
          }))
          .sort((a, b) => b.revenue - a.revenue),
      }
    };
  },
});

export const create = mutation({
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
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
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
      websiteUrl: args.websiteUrl,
      address: args.address,
      color: args.color,
      archived: false,
      workspaceType: args.workspaceType || "work",
    });
  },
});

export const update = mutation({
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
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const client = await ctx.db.get(args.id);
    if (!client || client.organizationId !== organizationId) {
      throw new Error("Client not found");
    }

    // If changing workspace type, check for dependent projects
    if (args.workspaceType !== undefined && args.workspaceType !== client.workspaceType) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("byClient", (q) => q.eq("clientId", args.id))
        .filter((q) => q.eq(q.field("archived"), false))
        .collect();

      if (projects.length > 0) {
        throw new Error("Cannot change client workspace type while it has active projects");
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.note !== undefined && { note: args.note }),
      ...(args.websiteUrl !== undefined && { websiteUrl: args.websiteUrl }),
      ...(args.address !== undefined && { address: args.address }),
      ...(args.color !== undefined && { color: args.color }),
      ...(args.archived !== undefined && { archived: args.archived }),
      ...(args.workspaceType !== undefined && { workspaceType: args.workspaceType }),
    });
  },
});

export const deleteClient = mutation({
  args: {
    id: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const client = await ctx.db.get(args.id);
    if (!client || client.organizationId !== organizationId) {
      throw new Error("Client not found");
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

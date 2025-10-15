import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireMembership,
  ensureMembershipWithRole,
  requireMembershipWithRole,
  maybeMembership,
} from "./orgContext";

export const listByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return [];
    }
    const { organizationId } = membership;

    const client = await ctx.db.get(args.clientId);
    if (!client || client.organizationId !== organizationId) {
      throw new Error("Client not found");
    }

    return await ctx.db
      .query("projects")
      .withIndex("byClient", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.and(
        q.eq(q.field("organizationId"), organizationId),
        q.eq(q.field("archived"), false)
      ))
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return null;
    }
    const { organizationId } = membership;

    const project = await ctx.db.get(args.id);
    if (!project || project.organizationId !== organizationId) {
      throw new Error("Project not found");
    }

    const client = project.clientId ? await ctx.db.get(project.clientId) : null;
    return {
      ...project,
      client,
    };
  },
});

export const listAll = query({
  args: {
    clientId: v.optional(v.id("clients")),
    searchTerm: v.optional(v.string()),
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return [];
    }
    const { organizationId } = membership;

    let projectsQuery = ctx.db
      .query("projects")
      .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId));

    // Filter by archived status unless includeArchived is true
    if (!args.includeArchived) {
      projectsQuery = projectsQuery.filter((q) => q.eq(q.field("archived"), false));
    }

    // Apply workspace filter - default to work projects for backward compatibility
    if (args.workspaceType === "work" || !args.workspaceType) {
      projectsQuery = projectsQuery.filter((q) => q.or(
        q.eq(q.field("workspaceType"), undefined),
        q.eq(q.field("workspaceType"), "work")
      ));
    } else if (args.workspaceType === "personal") {
      // For personal projects, we shouldn't see them in work context
      projectsQuery = projectsQuery.filter((q) =>
        q.eq(q.field("workspaceType"), "personal")
      );
    }

    // Apply client filter if specified
    if (args.clientId) {
      projectsQuery = projectsQuery.filter((q) => q.eq(q.field("clientId"), args.clientId));
    }

    const projects = await projectsQuery.collect();

    // Get clients and calculate budget remaining for each project
    const projectsWithClientsAndStats = await Promise.all(
      projects.map(async (project) => {
        const client = project.clientId ? await ctx.db.get(project.clientId) : null;
        
        // Calculate budget remaining
        const entries = await ctx.db
          .query("timeEntries")
          .withIndex("byProject", (q) => q.eq("projectId", project._id))
          .filter((q) => q.eq(q.field("isOverrun"), false))
          .collect();

        const totalSeconds = entries.reduce((sum, entry) => {
          const seconds = entry.seconds || (entry.stoppedAt ? entry.stoppedAt - entry.startedAt : 0) / 1000;
          return sum + seconds;
        }, 0);

        const totalAmount = (totalSeconds / 3600) * project.hourlyRate;

        let budgetRemaining = 0;
        let budgetRemainingFormatted = "N/A";

        if (project.budgetType === "hours" && project.budgetHours) {
          const budgetSeconds = project.budgetHours * 3600;
          budgetRemaining = Math.max(0, budgetSeconds - totalSeconds);
          const hoursRemaining = budgetRemaining / 3600;
          budgetRemainingFormatted = `${hoursRemaining.toFixed(1)} hours`;
        } else if (project.budgetType === "amount" && project.budgetAmount) {
          budgetRemaining = Math.max(0, project.budgetAmount - totalAmount);
          budgetRemainingFormatted = `$${budgetRemaining.toFixed(2)}`;
        }

        const totalHours = totalSeconds / 3600;
        const totalHoursFormatted = `${totalHours.toFixed(1)}h`;

        // Find the most recent activity (latest time entry)
        const mostRecentEntry = entries.length > 0 
          ? entries.reduce((latest, entry) => {
              const entryTime = entry.stoppedAt || entry.startedAt || entry._creationTime;
              const latestTime = latest.stoppedAt || latest.startedAt || latest._creationTime;
              return entryTime > latestTime ? entry : latest;
            })
          : null;

        const lastActivityAt = mostRecentEntry 
          ? (mostRecentEntry.stoppedAt || mostRecentEntry.startedAt || mostRecentEntry._creationTime)
          : project._creationTime; // Fall back to project creation time

        return {
          ...project,
          client,
          budgetRemaining,
          budgetRemainingFormatted,
          totalSeconds,
          totalHours,
          totalHoursFormatted,
          lastActivityAt,
        };
      })
    );

    // Apply search filter if specified
    let filteredProjects = projectsWithClientsAndStats;
    if (args.searchTerm && args.searchTerm.trim()) {
      const searchLower = args.searchTerm.toLowerCase().trim();
      filteredProjects = projectsWithClientsAndStats.filter((project) => {
        const projectName = project.name.toLowerCase();
        const clientName = project.client?.name?.toLowerCase() || "";
        return projectName.includes(searchLower) || clientName.includes(searchLower);
      });
    }

    // Sort projects by most recent activity (descending)
    const sortedProjects = filteredProjects.sort((a, b) => 
      b.lastActivityAt - a.lastActivityAt
    );

    return sortedProjects;
  },
});

export const create = mutation({
  args: {
    clientId: v.optional(v.id("clients")),
    name: v.string(),
    hourlyRate: v.number(),
    budgetType: v.union(v.literal("hours"), v.literal("amount")),
    budgetHours: v.optional(v.number()),
    budgetAmount: v.optional(v.number()),
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await ensureMembershipWithRole(ctx, [
      "owner",
      "admin",
    ]);

    let client = null;
    if (args.clientId) {
      client = await ctx.db.get(args.clientId);
      if (!client || client.organizationId !== organizationId) {
        throw new Error("Client not found");
      }

      // Ensure client and project have matching workspace types
      const workspaceType = args.workspaceType || "work";
      if (client.workspaceType && client.workspaceType !== workspaceType) {
        throw new Error("Project workspace type must match client workspace type");
      }
    }

    const workspaceType = args.workspaceType || "work";

    return await ctx.db.insert("projects", {
      organizationId,
      createdBy: userId,
      clientId: args.clientId,
      name: args.name,
      hourlyRate: args.hourlyRate,
      budgetType: args.budgetType,
      budgetHours: args.budgetHours,
      budgetAmount: args.budgetAmount,
      archived: false,
      workspaceType,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    clientId: v.optional(v.id("clients")),
    name: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    budgetType: v.optional(v.union(v.literal("hours"), v.literal("amount"))),
    budgetHours: v.optional(v.number()),
    budgetAmount: v.optional(v.number()),
    archived: v.optional(v.boolean()),
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const project = await ctx.db.get(args.id);
    if (!project || project.organizationId !== organizationId) {
      throw new Error("Project not found");
    }

    // If changing client, validate the new client
    if (args.clientId !== undefined && args.clientId !== null) {
      const client = await ctx.db.get(args.clientId);
      if (!client || client.organizationId !== organizationId) {
        throw new Error("Client not found");
      }
      
      // Ensure client and project have matching workspace types
      const workspaceType = args.workspaceType !== undefined ? args.workspaceType : project.workspaceType;
      if (client.workspaceType && client.workspaceType !== workspaceType) {
        throw new Error("Project workspace type must match client workspace type");
      }
    }

    // If changing workspace type, ensure it matches the client
    const clientId = args.clientId !== undefined ? args.clientId : project.clientId;
    if (args.workspaceType !== undefined && clientId) {
      const client = await ctx.db.get(clientId);
      if (client && client.workspaceType && client.workspaceType !== args.workspaceType) {
        throw new Error("Project workspace type must match client workspace type");
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.clientId !== undefined && { clientId: args.clientId }),
      ...(args.name !== undefined && { name: args.name }),
      ...(args.hourlyRate !== undefined && { hourlyRate: args.hourlyRate }),
      ...(args.budgetType !== undefined && { budgetType: args.budgetType }),
      ...(args.budgetHours !== undefined && { budgetHours: args.budgetHours }),
      ...(args.budgetAmount !== undefined && { budgetAmount: args.budgetAmount }),
      ...(args.archived !== undefined && { archived: args.archived }),
      ...(args.workspaceType !== undefined && { workspaceType: args.workspaceType }),
    });
  },
});

export const getStats = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await requireMembership(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.organizationId !== organizationId) {
      throw new Error("Project not found");
    }

    // Get user settings for warning thresholds
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("isOverrun"), false))
      .collect();

    const totalSeconds = entries.reduce((sum, entry) => {
      const seconds = entry.seconds || (entry.stoppedAt ? entry.stoppedAt - entry.startedAt : 0) / 1000;
      return sum + seconds;
    }, 0);

    const totalAmount = (totalSeconds / 3600) * project.hourlyRate;

    let budgetRemaining = 0;
    let timeRemaining = 0;
    let isNearBudgetLimit = false;
    let warningType: "time" | "amount" | null = null;

    if (project.budgetType === "hours" && project.budgetHours) {
      const budgetSeconds = project.budgetHours * 3600;
      budgetRemaining = Math.max(0, budgetSeconds - totalSeconds);
      timeRemaining = budgetRemaining / 3600;

      // Check if near budget limit for time-based projects
      if (userSettings?.budgetWarningEnabled && userSettings.budgetWarningThresholdHours) {
        if (timeRemaining > 0 && timeRemaining <= userSettings.budgetWarningThresholdHours) {
          isNearBudgetLimit = true;
          warningType = "time";
        }
      }
    } else if (project.budgetType === "amount" && project.budgetAmount) {
      budgetRemaining = Math.max(0, project.budgetAmount - totalAmount);
      timeRemaining = budgetRemaining / project.hourlyRate;

      // Check if near budget limit for amount-based projects
      if (userSettings?.budgetWarningEnabled && userSettings.budgetWarningThresholdAmount) {
        if (budgetRemaining > 0 && budgetRemaining <= userSettings.budgetWarningThresholdAmount) {
          isNearBudgetLimit = true;
          warningType = "amount";
        }
      }
    }

    const mostRecentEntry = await ctx.db
      .query("timeEntries")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.neq(q.field("stoppedAt"), undefined))
      .order("desc")
      .first();

    return {
      totalSeconds,
      totalAmount,
      budgetRemaining,
      timeRemaining,
      isNearBudgetLimit,
      warningType,
      lastTimerSession: mostRecentEntry
        ? { startedAt: mostRecentEntry.startedAt, endedAt: mostRecentEntry.stoppedAt }
        : null,
    };
  },
});

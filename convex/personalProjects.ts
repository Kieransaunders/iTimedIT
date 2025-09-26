import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listPersonal = query({
  args: {
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let projectsQuery = ctx.db
      .query("projects")
      .withIndex("byOwnerPersonal", (q) => 
        q.eq("ownerId", userId).eq("workspaceType", "personal")
      )
      .filter((q) => q.eq(q.field("archived"), false));

    const projects = await projectsQuery.collect();

    const projectsWithClientsAndStats = await Promise.all(
      projects.map(async (project) => {
        let client = null;
        if (project.clientId) {
          client = await ctx.db.get(project.clientId);
        }
        
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

        const mostRecentEntry = entries.length > 0 
          ? entries.reduce((latest, entry) => {
              const entryTime = entry.stoppedAt || entry.startedAt || entry._creationTime;
              const latestTime = latest.stoppedAt || latest.startedAt || latest._creationTime;
              return entryTime > latestTime ? entry : latest;
            })
          : null;

        const lastActivityAt = mostRecentEntry 
          ? (mostRecentEntry.stoppedAt || mostRecentEntry.startedAt || mostRecentEntry._creationTime)
          : project._creationTime;

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

    let filteredProjects = projectsWithClientsAndStats;
    if (args.searchTerm && args.searchTerm.trim()) {
      const searchLower = args.searchTerm.toLowerCase().trim();
      filteredProjects = projectsWithClientsAndStats.filter((project) => {
        const projectName = project.name.toLowerCase();
        const clientName = project.client?.name?.toLowerCase() || "";
        return projectName.includes(searchLower) || clientName.includes(searchLower);
      });
    }

    const sortedProjects = filteredProjects.sort((a, b) => 
      b.lastActivityAt - a.lastActivityAt
    );

    return sortedProjects;
  },
});

export const getPersonal = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.id);
    if (!project || project.ownerId !== userId || project.workspaceType !== "personal") {
      throw new Error("Personal project not found");
    }

    let client = null;
    if (project.clientId) {
      client = await ctx.db.get(project.clientId);
      if (client && client.ownerId !== userId) {
        client = null;
      }
    }

    return {
      ...project,
      client,
    };
  },
});

export const createPersonal = mutation({
  args: {
    clientId: v.optional(v.id("clients")),
    name: v.string(),
    hourlyRate: v.number(),
    budgetType: v.union(v.literal("hours"), v.literal("amount")),
    budgetHours: v.optional(v.number()),
    budgetAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (!client || client.ownerId !== userId || client.workspaceType !== "personal") {
        throw new Error("Personal client not found");
      }
    }

    return await ctx.db.insert("projects", {
      organizationId: undefined,
      createdBy: userId,
      ownerId: userId,
      clientId: args.clientId,
      name: args.name,
      hourlyRate: args.hourlyRate,
      budgetType: args.budgetType,
      budgetHours: args.budgetHours,
      budgetAmount: args.budgetAmount,
      archived: false,
      workspaceType: "personal",
    });
  },
});

export const updatePersonal = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    budgetType: v.optional(v.union(v.literal("hours"), v.literal("amount"))),
    budgetHours: v.optional(v.number()),
    budgetAmount: v.optional(v.number()),
    archived: v.optional(v.boolean()),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.id);
    if (!project || project.ownerId !== userId || project.workspaceType !== "personal") {
      throw new Error("Personal project not found");
    }

    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (!client || client.ownerId !== userId || client.workspaceType !== "personal") {
        throw new Error("Personal client not found");
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.hourlyRate !== undefined && { hourlyRate: args.hourlyRate }),
      ...(args.budgetType !== undefined && { budgetType: args.budgetType }),
      ...(args.budgetHours !== undefined && { budgetHours: args.budgetHours }),
      ...(args.budgetAmount !== undefined && { budgetAmount: args.budgetAmount }),
      ...(args.archived !== undefined && { archived: args.archived }),
      ...(args.clientId !== undefined && { clientId: args.clientId }),
    });
  },
});

export const getStatsPersonal = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== userId || project.workspaceType !== "personal") {
      throw new Error("Personal project not found");
    }

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
      
      if (timeRemaining > 0 && timeRemaining <= 1.0) {
        isNearBudgetLimit = true;
        warningType = "time";
      }
    } else if (project.budgetType === "amount" && project.budgetAmount) {
      budgetRemaining = Math.max(0, project.budgetAmount - totalAmount);
      timeRemaining = budgetRemaining / project.hourlyRate;
      
      if (budgetRemaining > 0 && budgetRemaining <= 50.0) {
        isNearBudgetLimit = true;
        warningType = "amount";
      }
    }

    return {
      totalSeconds,
      totalAmount,
      budgetRemaining,
      timeRemaining,
      isNearBudgetLimit,
      warningType,
    };
  },
});
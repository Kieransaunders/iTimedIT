import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireMembership,
  ensureMembership,
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
    const { organizationId, userId } = await ensureMembership(ctx);

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
    // Allow all members to update projects (owner, admin, member)
    const { organizationId } = await requireMembership(ctx);

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

    const patchData: any = {};

    // Handle optional fields that might be explicitly undefined (to clear them)
    if (args.name !== undefined) patchData.name = args.name;
    if (args.hourlyRate !== undefined) patchData.hourlyRate = args.hourlyRate;
    if (args.budgetType !== undefined) patchData.budgetType = args.budgetType;
    if (args.budgetHours !== undefined) patchData.budgetHours = args.budgetHours;
    if (args.budgetAmount !== undefined) patchData.budgetAmount = args.budgetAmount;
    if (args.archived !== undefined) patchData.archived = args.archived;
    if (args.workspaceType !== undefined) patchData.workspaceType = args.workspaceType;

    // Special handling for clientId - allow clearing by passing undefined
    if ("clientId" in args) patchData.clientId = args.clientId;

    await ctx.db.patch(args.id, patchData);
  },
});

export const deleteProject = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const project = await ctx.db.get(args.id);
    if (!project || project.organizationId !== organizationId) {
      throw new Error("Project not found");
    }

    // Check for time entries
    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("byProject", (q) => q.eq("projectId", args.id))
      .first();

    if (timeEntries) {
      throw new Error("Cannot delete project with existing time entries. Please delete all time entries first or archive the project instead.");
    }

    // Delete the project
    await ctx.db.delete(args.id);
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

// Template management functions

export const createTemplate = mutation({
  args: {
    name: v.string(),
    hourlyRate: v.number(),
    budgetType: v.union(v.literal("hours"), v.literal("amount")),
    budgetHours: v.optional(v.number()),
    budgetAmount: v.optional(v.number()),
    clientId: v.optional(v.id("clients")),
    recurringConfig: v.object({
      enabled: v.boolean(),
      namePattern: v.string(),
      preserveClientId: v.boolean(),
      notifyOnCreation: v.boolean(),
    }),
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await ensureMembership(ctx);

    // Validate client if provided
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (!client || client.organizationId !== organizationId) {
        throw new Error("Client not found");
      }
    }

    // Calculate first creation date (1st of next month at midnight UTC)
    const now = new Date();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
    const nextCreationDate = nextMonth.getTime();

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
      workspaceType: args.workspaceType || "work",
      isTemplate: true,
      recurringConfig: {
        enabled: args.recurringConfig.enabled,
        frequency: "monthly" as const,
        nextCreationDate,
        namePattern: args.recurringConfig.namePattern,
        preserveClientId: args.recurringConfig.preserveClientId,
        notifyOnCreation: args.recurringConfig.notifyOnCreation,
      },
    });
  },
});

export const duplicateFromTemplate = mutation({
  args: {
    templateId: v.id("projects"),
    overrideName: v.optional(v.string()),
    billingPeriodStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await ensureMembership(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || !template.isTemplate || template.organizationId !== organizationId) {
      throw new Error("Template not found");
    }

    if (!template.recurringConfig) {
      throw new Error("Template missing recurring configuration");
    }

    // Calculate billing period (defaults to current month)
    const startDate = args.billingPeriodStart || new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      1, 0, 0, 0
    )).getTime();

    const endOfMonth = new Date(Date.UTC(
      new Date(startDate).getUTCFullYear(),
      new Date(startDate).getUTCMonth() + 1,
      0, 23, 59, 59
    ));
    const endDate = endOfMonth.getTime();

    const periodLabel = new Date(startDate).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    // Generate project name from pattern
    const projectName = args.overrideName || template.recurringConfig.namePattern
      .replace('{month}', new Date(startDate).toLocaleDateString('en-US', { month: 'long' }))
      .replace('{year}', new Date(startDate).getUTCFullYear().toString());

    const newProjectId = await ctx.db.insert("projects", {
      organizationId,
      createdBy: userId,
      clientId: template.recurringConfig.preserveClientId ? template.clientId : undefined,
      name: projectName,
      hourlyRate: template.hourlyRate,
      budgetType: template.budgetType,
      budgetHours: template.budgetHours,
      budgetAmount: template.budgetAmount,
      archived: false,
      workspaceType: template.workspaceType,
      isTemplate: false,
      parentTemplateId: template._id,
      billingPeriod: {
        startDate,
        endDate,
        label: periodLabel,
      },
    });

    return newProjectId;
  },
});

export const listTemplates = query({
  args: {
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
  },
  handler: async (ctx, args) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return [];
    }
    const { organizationId } = membership;

    const allTemplates = await ctx.db
      .query("projects")
      .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isTemplate"), true))
      .collect();

    // Filter by workspace type if specified
    if (args.workspaceType) {
      return allTemplates.filter(t =>
        args.workspaceType === "work"
          ? (t.workspaceType === "work" || t.workspaceType === undefined)
          : t.workspaceType === "personal"
      );
    }

    return allTemplates;
  },
});

export const listByTemplate = query({
  args: {
    templateId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return [];
    }
    const { organizationId } = membership;

    const template = await ctx.db.get(args.templateId);
    if (!template || template.organizationId !== organizationId) {
      throw new Error("Template not found");
    }

    return await ctx.db
      .query("projects")
      .withIndex("byParentTemplate", (q) => q.eq("parentTemplateId", args.templateId))
      .collect();
  },
});

export const updateTemplate = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    budgetType: v.optional(v.union(v.literal("hours"), v.literal("amount"))),
    budgetHours: v.optional(v.number()),
    budgetAmount: v.optional(v.number()),
    clientId: v.optional(v.id("clients")),
    recurringConfig: v.optional(v.object({
      enabled: v.boolean(),
      namePattern: v.string(),
      preserveClientId: v.boolean(),
      notifyOnCreation: v.boolean(),
    })),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);

    const template = await ctx.db.get(args.id);
    if (!template || !template.isTemplate || template.organizationId !== organizationId) {
      throw new Error("Template not found");
    }

    // If changing client, validate it
    if (args.clientId !== undefined && args.clientId !== null) {
      const client = await ctx.db.get(args.clientId);
      if (!client || client.organizationId !== organizationId) {
        throw new Error("Client not found");
      }
    }

    const patchData: any = {};
    if (args.name !== undefined) patchData.name = args.name;
    if (args.hourlyRate !== undefined) patchData.hourlyRate = args.hourlyRate;
    if (args.budgetType !== undefined) patchData.budgetType = args.budgetType;
    if (args.budgetHours !== undefined) patchData.budgetHours = args.budgetHours;
    if (args.budgetAmount !== undefined) patchData.budgetAmount = args.budgetAmount;
    if (args.archived !== undefined) patchData.archived = args.archived;
    if ("clientId" in args) patchData.clientId = args.clientId;

    // Handle recurringConfig update - merge with existing config
    if (args.recurringConfig !== undefined && template.recurringConfig) {
      patchData.recurringConfig = {
        ...template.recurringConfig,
        enabled: args.recurringConfig.enabled,
        namePattern: args.recurringConfig.namePattern,
        preserveClientId: args.recurringConfig.preserveClientId,
        notifyOnCreation: args.recurringConfig.notifyOnCreation,
      };
    }

    await ctx.db.patch(args.id, patchData);
  },
});

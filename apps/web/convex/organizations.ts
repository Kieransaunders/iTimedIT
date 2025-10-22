import { mutation, query, internalMutation, internalQuery, MutationCtx, QueryCtx } from "./_generated/server";
import {
  ensureMembership,
  MembershipContext,
  requireMembership,
  requireMembershipWithRole,
  ensureMembershipWithRole,
  MembershipRole,
} from "./orgContext";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

export const ensurePersonalWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const membership = await ensureMembership(ctx);
    await backfillLegacyData(ctx, membership);
    return membership;
  },
});

export const currentMembership = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    try {
      const membership = await requireMembership(ctx);
      const organization = await ctx.db.get(membership.organizationId);
      return {
        membershipId: membership.membershipId,
        organization,
        role: membership.role,
      };
    } catch (error) {
      return null;
    }
  },
});

export const listMemberships = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("inactiveAt"), undefined))
      .collect();

    const organizations = await Promise.all(
      memberships.map((membership) => ctx.db.get(membership.organizationId))
    );

    return memberships.map((membership, index) => ({
      membership,
      organization: organizations[index],
    }));
  },
});

export const listOrganizationMembers = query({
  args: {},
  handler: async (ctx) => {
    const membership = await safeRequireMembershipWithRole(ctx, ["owner", "admin"]);
    if (!membership) {
      return [];
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("byOrganization", (q) => q.eq("organizationId", membership.organizationId))
      .filter((q) => q.eq(q.field("inactiveAt"), undefined))
      .collect();

    const users = await Promise.all(
      memberships.map((membership) => ctx.db.get(membership.userId))
    );

    return memberships.map((membership, index) => ({
      membership,
      user: users[index],
    }));
  },
});

export const removeMember = mutation({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const actor = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    if (args.membershipId === actor.membershipId) {
      throw new Error("You cannot remove yourself from the organization");
    }

    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== actor.organizationId) {
      throw new Error("Membership not found");
    }

    if (membership.inactiveAt !== undefined) {
      return { success: true };
    }

    if (membership.role === "owner" && actor.role !== "owner") {
      throw new Error("Only owners can remove another owner");
    }

    if (membership.role === "owner") {
      const activeMembers = await ctx.db
        .query("memberships")
        .withIndex("byOrganization", (q) => q.eq("organizationId", actor.organizationId))
        .filter((q) => q.eq(q.field("inactiveAt"), undefined))
        .collect();

      const activeOwners = activeMembers.filter((member) => member.role === "owner");
      if (activeOwners.length <= 1) {
        throw new Error("Cannot remove the last owner");
      }
    }

    await ctx.db.patch(args.membershipId, { inactiveAt: Date.now() });

    return { success: true };
  },
});

export const cleanLegacyOwnerFields = mutation({
  args: {},
  handler: async (ctx) => {
    const { organizationId, userId } = await ensureMembershipWithRole(ctx, ["owner"]);
    await removeLegacyOwnerFieldsForOrganization(ctx, organizationId, userId);
    return { success: true };
  },
});

export const setActiveOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("byOrgUser", (q) => q.eq("organizationId", args.organizationId).eq("userId", userId))
      .filter((q) => q.eq(q.field("inactiveAt"), undefined))
      .unique();

    if (!membership) {
      throw new Error("Membership not found");
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    if (!settings) {
      await ctx.db.insert("userSettings", {
        userId,
        organizationId: args.organizationId,
        interruptEnabled: true,
        interruptInterval: 0.0833 as const,
        gracePeriod: 5 as const,
        budgetWarningEnabled: true,
        budgetWarningThresholdHours: 1.0,
        budgetWarningThresholdAmount: 50.0,
      });
    } else if (settings.organizationId !== args.organizationId) {
      await ctx.db.patch(settings._id, { organizationId: args.organizationId });
    }

    return { success: true };
  },
});

export const renameOrganization = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Organization name cannot be empty");
    }

    if (trimmedName.length > 100) {
      throw new Error("Organization name must be 100 characters or less");
    }

    await ctx.db.patch(organizationId, { name: trimmedName });

    return { success: true };
  },
});

export const updateWorkspaceColor = mutation({
  args: {
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(args.color)) {
      throw new Error("Invalid color format. Please provide a valid hex color (e.g., #8b5cf6)");
    }

    await ctx.db.patch(organizationId, { color: args.color });

    return { success: true };
  },
});

export const updateWorkspaceSettings = mutation({
  args: {
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const updates: Partial<Doc<"organizations">> = {};

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      if (!trimmedName) {
        throw new Error("Organization name cannot be empty");
      }
      if (trimmedName.length > 100) {
        throw new Error("Organization name must be 100 characters or less");
      }
      updates.name = trimmedName;
    }

    if (args.color !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(args.color)) {
        throw new Error("Invalid color format. Please provide a valid hex color (e.g., #8b5cf6)");
      }
      updates.color = args.color;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(organizationId, updates);
    }

    return { success: true };
  },
});

export const createWorkspace = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Workspace name cannot be empty");
    }

    if (trimmedName.length > 100) {
      throw new Error("Workspace name must be 100 characters or less");
    }

    // Create new Work workspace
    const now = Date.now();
    const organizationId = await ctx.db.insert("organizations", {
      name: trimmedName,
      createdBy: userId,
      createdAt: now,
      isPersonalWorkspace: false,
      workspaceType: "work",
      color: args.color || "#8b5cf6", // Default to purple
    });

    // Create membership for creator
    const membershipId = await ctx.db.insert("memberships", {
      organizationId,
      userId,
      role: "owner",
      invitedBy: undefined,
      createdAt: now,
    });

    // Set as active workspace
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    if (settings) {
      await ctx.db.patch(settings._id, { organizationId });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        organizationId,
        interruptEnabled: true,
        interruptInterval: 0.0833 as const,
        gracePeriod: 5 as const,
        budgetWarningEnabled: true,
        budgetWarningThresholdHours: 1.0,
        budgetWarningThresholdAmount: 50.0,
      });
    }

    return {
      organizationId,
      membershipId,
      success: true,
    };
  },
});

export const getPersonalWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Try to find Personal workspace by workspaceType
    const personalOrg = await ctx.db
      .query("organizations")
      .withIndex("byUserType", (q) => q.eq("createdBy", userId).eq("workspaceType", "personal"))
      .first();

    if (personalOrg) {
      return personalOrg;
    }

    // Fallback to legacy flag
    const legacyPersonalOrg = await ctx.db
      .query("organizations")
      .withIndex("byCreator", (q) => q.eq("createdBy", userId))
      .filter((q) => q.eq(q.field("isPersonalWorkspace"), true))
      .first();

    return legacyPersonalOrg ?? null;
  },
});

export const getWorkWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get all user memberships
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("inactiveAt"), undefined))
      .collect();

    // Get all organizations
    const organizations = await Promise.all(
      memberships.map((m) => ctx.db.get(m.organizationId))
    );

    // Filter for Work workspaces
    const workWorkspaces = organizations
      .map((org, index) => ({
        organization: org,
        membership: memberships[index],
      }))
      .filter((item) => {
        if (!item.organization) return false;
        // Check new workspaceType field
        if (item.organization.workspaceType === "work") return true;
        // Fallback: if no workspaceType, check legacy flag (not Personal = Work)
        if (item.organization.workspaceType === undefined && !item.organization.isPersonalWorkspace) {
          return true;
        }
        return false;
      });

    return workWorkspaces;
  },
});

export const findTeamDocuments = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allClients = await ctx.db.query("clients").collect();
    const allProjects = await ctx.db.query("projects").collect();

    const teamClients = allClients.filter(c => (c.workspaceType as any) === "team");
    const teamProjects = allProjects.filter(p => (p.workspaceType as any) === "team");

    return {
      teamClients: teamClients.map(c => ({
        _id: c._id,
        name: c.name,
        workspaceType: c.workspaceType,
        organizationId: c.organizationId
      })),
      teamProjects: teamProjects.map(p => ({
        _id: p._id,
        name: p.name,
        workspaceType: p.workspaceType,
        organizationId: p.organizationId
      })),
      totalTeamClients: teamClients.length,
      totalTeamProjects: teamProjects.length,
    };
  },
});

export const migrateWorkspaceTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    let migratedOrgs = 0;
    let migratedClients = 0;
    let migratedProjects = 0;
    let skippedClients = 0;
    let skippedProjects = 0;

    // Migrate organizations
    const allOrgs = await ctx.db.query("organizations").collect();
    for (const org of allOrgs) {
      if (org.workspaceType === undefined) {
        const workspaceType = org.isPersonalWorkspace ? "personal" : "work";
        await ctx.db.patch(org._id, { workspaceType });
        migratedOrgs++;
      }
    }

    // Migrate clients: "team" -> "work", undefined -> infer from organization
    const allClients = await ctx.db.query("clients").collect();
    for (const client of allClients) {
      const workspaceType = client.workspaceType as any;
      if (workspaceType === "team") {
        await ctx.db.patch(client._id, { workspaceType: "work" });
        migratedClients++;
      } else if (workspaceType === undefined || workspaceType === null) {
        // Infer from organization if possible
        if (client.organizationId) {
          const org = await ctx.db.get(client.organizationId);
          if (org?.workspaceType) {
            await ctx.db.patch(client._id, { workspaceType: org.workspaceType });
            migratedClients++;
          } else {
            skippedClients++;
          }
        } else {
          skippedClients++;
        }
      }
    }

    // Migrate projects: "team" -> "work", undefined -> infer from organization
    const allProjects = await ctx.db.query("projects").collect();
    for (const project of allProjects) {
      const workspaceType = project.workspaceType as any;
      if (workspaceType === "team") {
        await ctx.db.patch(project._id, { workspaceType: "work" });
        migratedProjects++;
      } else if (workspaceType === undefined || workspaceType === null) {
        // Infer from organization if possible
        if (project.organizationId) {
          const org = await ctx.db.get(project.organizationId);
          if (org?.workspaceType) {
            await ctx.db.patch(project._id, { workspaceType: org.workspaceType });
            migratedProjects++;
          } else {
            skippedProjects++;
          }
        } else {
          skippedProjects++;
        }
      }
    }

    return {
      success: true,
      migratedOrgs,
      migratedClients,
      migratedProjects,
      skippedClients,
      skippedProjects,
    };
  },
});

export const deleteAllDevelopmentData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const counts = {
      runningTimers: 0,
      timeEntries: 0,
      categories: 0,
      projects: 0,
      clients: 0,
      invitations: 0,
      memberships: 0,
      organizations: 0,
      userSettings: 0,
      imports: 0,
      pushSubscriptions: 0,
      expoPushTokens: 0,
      notificationPrefs: 0,
    };

    // Delete in order to respect foreign key relationships

    // 1. Delete running timers
    const runningTimers = await ctx.db.query("runningTimers").collect();
    for (const timer of runningTimers) {
      await ctx.db.delete(timer._id);
      counts.runningTimers++;
    }

    // 2. Delete time entries
    const timeEntries = await ctx.db.query("timeEntries").collect();
    for (const entry of timeEntries) {
      await ctx.db.delete(entry._id);
      counts.timeEntries++;
    }

    // 3. Delete categories
    const categories = await ctx.db.query("categories").collect();
    for (const category of categories) {
      await ctx.db.delete(category._id);
      counts.categories++;
    }

    // 4. Delete projects
    const projects = await ctx.db.query("projects").collect();
    for (const project of projects) {
      await ctx.db.delete(project._id);
      counts.projects++;
    }

    // 5. Delete clients
    const clients = await ctx.db.query("clients").collect();
    for (const client of clients) {
      await ctx.db.delete(client._id);
      counts.clients++;
    }

    // 6. Delete invitations
    const invitations = await ctx.db.query("invitations").collect();
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
      counts.invitations++;
    }

    // 7. Delete memberships
    const memberships = await ctx.db.query("memberships").collect();
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
      counts.memberships++;
    }

    // 8. Delete organizations
    const organizations = await ctx.db.query("organizations").collect();
    for (const org of organizations) {
      await ctx.db.delete(org._id);
      counts.organizations++;
    }

    // 9. Delete user settings
    const userSettings = await ctx.db.query("userSettings").collect();
    for (const settings of userSettings) {
      await ctx.db.delete(settings._id);
      counts.userSettings++;
    }

    // 10. Delete imports
    const imports = await ctx.db.query("imports").collect();
    for (const importDoc of imports) {
      await ctx.db.delete(importDoc._id);
      counts.imports++;
    }

    // 11. Delete push subscriptions
    const pushSubscriptions = await ctx.db.query("pushSubscriptions").collect();
    for (const sub of pushSubscriptions) {
      await ctx.db.delete(sub._id);
      counts.pushSubscriptions++;
    }

    // 12. Delete expo push tokens
    const expoPushTokens = await ctx.db.query("expoPushTokens").collect();
    for (const token of expoPushTokens) {
      await ctx.db.delete(token._id);
      counts.expoPushTokens++;
    }

    // 13. Delete notification preferences
    const notificationPrefs = await ctx.db.query("notificationPrefs").collect();
    for (const pref of notificationPrefs) {
      await ctx.db.delete(pref._id);
      counts.notificationPrefs++;
    }

    const totalDeleted = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return {
      success: true,
      totalDeleted,
      counts,
      message: `Successfully deleted all ${totalDeleted} documents from development database`,
    };
  },
});

async function backfillLegacyData(
  ctx: MutationCtx,
  membership: MembershipContext
) {
  const { organizationId, userId } = membership;

  await migrateClients(ctx, organizationId, userId);
  await migrateProjects(ctx, organizationId, userId);
  await migrateTimeEntries(ctx, organizationId, userId);
  await migrateRunningTimers(ctx, organizationId, userId);
  await migrateImports(ctx, organizationId, userId);
}

async function safeRequireMembershipWithRole(
  ctx: QueryCtx | MutationCtx,
  roles: MembershipRole[]
) {
  try {
    return await requireMembershipWithRole(ctx, roles);
  } catch (error) {
    if (error instanceof Error && error.message.includes("No active organization membership")) {
      return null;
    }
    throw error;
  }
}
async function migrateClients(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const clients = await ctx.db.query("clients").collect();

  for (const client of clients) {
    const legacy = client as any;
    const legacyOwnerId = legacy.ownerId as Id<"users"> | undefined;
    const belongsToOrg =
      client.organizationId === organizationId || client.organizationId === undefined;
    const belongsToUser = legacyOwnerId === undefined || legacyOwnerId === userId;

    if (!belongsToOrg || !belongsToUser) {
      continue;
    }

    const needsUpdate =
      legacyOwnerId !== undefined || client.organizationId === undefined || client.createdBy === undefined;
    if (!needsUpdate) {
      continue;
    }

    const sanitized: any = { ...client };
    delete sanitized._id;
    delete sanitized._creationTime;
    delete sanitized.ownerId;
    sanitized.organizationId = sanitized.organizationId ?? organizationId;
    sanitized.createdBy = sanitized.createdBy ?? legacyOwnerId ?? userId;

    await ctx.db.replace(client._id, sanitized);
  }
}

async function migrateProjects(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const projects = await ctx.db.query("projects").collect();

  for (const project of projects) {
    const legacy = project as any;
    const legacyOwnerId = legacy.ownerId as Id<"users"> | undefined;
    const belongsToOrg =
      project.organizationId === organizationId || project.organizationId === undefined;
    const belongsToUser = legacyOwnerId === undefined || legacyOwnerId === userId;

    if (!belongsToOrg || !belongsToUser) {
      continue;
    }

    const needsUpdate =
      legacyOwnerId !== undefined || project.organizationId === undefined || project.createdBy === undefined;
    if (!needsUpdate) {
      continue;
    }

    const sanitized: any = { ...project };
    delete sanitized._id;
    delete sanitized._creationTime;
    delete sanitized.ownerId;
    sanitized.organizationId = sanitized.organizationId ?? organizationId;
    sanitized.createdBy = sanitized.createdBy ?? legacyOwnerId ?? userId;

    await ctx.db.replace(project._id, sanitized);
  }
}

async function migrateTimeEntries(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const entries = await ctx.db.query("timeEntries").collect();

  for (const entry of entries) {
    const legacy = entry as any;
    const legacyOwnerId = legacy.ownerId as Id<"users"> | undefined;
    const belongsToOrg =
      entry.organizationId === organizationId || entry.organizationId === undefined;
    const belongsToUser = legacyOwnerId === undefined || legacyOwnerId === userId;

    if (!belongsToOrg || !belongsToUser) {
      continue;
    }

    const needsUpdate = legacyOwnerId !== undefined || entry.organizationId === undefined || entry.userId === undefined;
    if (!needsUpdate) {
      continue;
    }

    const sanitized: any = { ...entry };
    delete sanitized._id;
    delete sanitized._creationTime;
    delete sanitized.ownerId;
    sanitized.organizationId = sanitized.organizationId ?? organizationId;
    sanitized.userId = sanitized.userId ?? legacyOwnerId ?? userId;

    await ctx.db.replace(entry._id, sanitized);
  }
}

async function migrateRunningTimers(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const timers = await ctx.db.query("runningTimers").collect();

  for (const timer of timers) {
    const legacy = timer as any;
    const legacyOwnerId = legacy.ownerId as Id<"users"> | undefined;
    const belongsToOrg =
      timer.organizationId === organizationId || timer.organizationId === undefined;
    const belongsToUser = legacyOwnerId === undefined || legacyOwnerId === userId;

    if (!belongsToOrg || !belongsToUser) {
      continue;
    }

    const needsUpdate = legacyOwnerId !== undefined || timer.organizationId === undefined || timer.userId === undefined;
    if (!needsUpdate) {
      continue;
    }

    const sanitized: any = { ...timer };
    delete sanitized._id;
    delete sanitized._creationTime;
    delete sanitized.ownerId;
    sanitized.organizationId = sanitized.organizationId ?? organizationId;
    sanitized.userId = sanitized.userId ?? legacyOwnerId ?? userId;

    await ctx.db.replace(timer._id, sanitized);
  }
}

async function migrateImports(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const imports = await ctx.db.query("imports").collect();

  for (const importJob of imports) {
    const legacy = importJob as any;
    const legacyOwnerId = legacy.ownerId as Id<"users"> | undefined;
    const belongsToOrg =
      importJob.organizationId === organizationId || importJob.organizationId === undefined;
    const belongsToUser = legacyOwnerId === undefined || legacyOwnerId === userId;

    if (!belongsToOrg || !belongsToUser) {
      continue;
    }

    const needsUpdate =
      legacyOwnerId !== undefined || importJob.organizationId === undefined || importJob.requestedBy === undefined;
    if (!needsUpdate) {
      continue;
    }

    const sanitized: any = { ...importJob };
    delete sanitized._id;
    delete sanitized._creationTime;
    delete sanitized.ownerId;
    sanitized.organizationId = sanitized.organizationId ?? organizationId;
    sanitized.requestedBy = sanitized.requestedBy ?? legacyOwnerId ?? userId;

    await ctx.db.replace(importJob._id, sanitized);
  }
}

async function removeLegacyOwnerFieldsForOrganization(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  await migrateClients(ctx, organizationId, userId);
  await migrateProjects(ctx, organizationId, userId);
  await migrateTimeEntries(ctx, organizationId, userId);
  await migrateRunningTimers(ctx, organizationId, userId);
  await migrateImports(ctx, organizationId, userId);
}

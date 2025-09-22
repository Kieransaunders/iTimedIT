import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
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

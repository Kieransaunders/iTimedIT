import { mutation, query, MutationCtx } from "./_generated/server";
import { ensureMembership, MembershipContext, requireMembership } from "./orgContext";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

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

  // Clients without organization linkage
  const legacyClients = await ctx.db
    .query("clients")
    .filter((q) => q.eq(q.field("organizationId"), undefined))
    .collect();

  for (const client of legacyClients) {
    const createdBy = (client as any).createdBy ?? (client as any).ownerId ?? userId;
    await ctx.db.patch(client._id, {
      organizationId,
      createdBy,
    });
  }

  // Projects without organization linkage
  const legacyProjects = await ctx.db
    .query("projects")
    .filter((q) => q.eq(q.field("organizationId"), undefined))
    .collect();

  for (const project of legacyProjects) {
    const createdBy = (project as any).createdBy ?? (project as any).ownerId ?? userId;
    await ctx.db.patch(project._id, {
      organizationId,
      createdBy,
    });
  }

  // Time entries without organization or user linkage
  const legacyEntries = await ctx.db
    .query("timeEntries")
    .filter((q) => q.eq(q.field("organizationId"), undefined))
    .collect();

  for (const entry of legacyEntries) {
    const entryUserId = (entry as any).userId ?? (entry as any).ownerId ?? userId;
    await ctx.db.patch(entry._id, {
      organizationId,
      userId: entryUserId,
    });
  }

  // Running timers without organization linkage
  const legacyTimers = await ctx.db
    .query("runningTimers")
    .filter((q) => q.eq(q.field("organizationId"), undefined))
    .collect();

  for (const timer of legacyTimers) {
    const timerUserId = (timer as any).userId ?? (timer as any).ownerId ?? userId;
    await ctx.db.patch(timer._id, {
      organizationId,
      userId: timerUserId,
    });
  }

  // Imports without organization linkage
  const legacyImports = await ctx.db
    .query("imports")
    .filter((q) => q.eq(q.field("organizationId"), undefined))
    .collect();

  for (const importJob of legacyImports) {
    const requestedBy = (importJob as any).requestedBy ?? (importJob as any).ownerId ?? userId;
    await ctx.db.patch(importJob._id, {
      organizationId,
      requestedBy,
    });
  }
}

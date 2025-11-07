import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export type MembershipRole = "owner" | "admin" | "member";

export type MembershipContext = {
  membershipId: Id<"memberships">;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  role: MembershipRole;
};

export async function requireMembership(
  ctx: QueryCtx | MutationCtx
): Promise<MembershipContext> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("inactiveAt"), undefined))
    .collect();

  if (memberships.length === 0) {
    throw new Error("No active organization membership");
  }

  const settings = await ctx.db
    .query("userSettings")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .unique();

  let membership = memberships[0];
  if (settings?.organizationId) {
    const match = memberships.find((m) => m.organizationId === settings.organizationId);
    if (match) {
      membership = match;
    }
  }

  return {
    membershipId: membership._id,
    organizationId: membership.organizationId,
    userId,
    role: membership.role,
  };
}

function isMissingMembershipError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : null;

  if (!message) {
    return false;
  }

  return (
    message === "Not authenticated" ||
    message === "No active organization membership" ||
    message.includes("Not authenticated") ||
    message.includes("No active organization membership")
  );
}

export async function maybeMembership(
  ctx: QueryCtx | MutationCtx
): Promise<MembershipContext | null> {
  try {
    return await requireMembership(ctx);
  } catch (error) {
    if (isMissingMembershipError(error)) {
      return null;
    }
    throw error;
  }
}

export function assertRole(
  membership: MembershipContext,
  roles: MembershipRole[]
): void {
  if (!roles.includes(membership.role)) {
    throw new Error("Insufficient permissions");
  }
}

export async function requireMembershipWithRole(
  ctx: QueryCtx | MutationCtx,
  roles: MembershipRole[]
): Promise<MembershipContext> {
  const membership = await requireMembership(ctx);
  assertRole(membership, roles);
  return membership;
}

export async function ensureMembershipWithRole(
  ctx: MutationCtx,
  roles: MembershipRole[]
): Promise<MembershipContext> {
  const membership = await ensureMembership(ctx);
  assertRole(membership, roles);
  return membership;
}

export async function ensureMembership(
  ctx: MutationCtx
): Promise<MembershipContext> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Check for existing memberships
  const existingMemberships = await ctx.db
    .query("memberships")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("inactiveAt"), undefined))
    .collect();

  if (existingMemberships.length > 0) {
    // User has existing memberships (invited or returning user)
    // Ensure they have a Personal workspace
    await ensurePersonalWorkspaceExists(ctx, userId);

    // Return their active membership based on userSettings
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    let membership = existingMemberships[0];
    if (settings?.organizationId) {
      const match = existingMemberships.find((m) => m.organizationId === settings.organizationId);
      if (match) {
        membership = match;
      }
    }

    await ensureActiveOrganizationSetting(ctx, userId, membership.organizationId);
    return {
      membershipId: membership._id,
      organizationId: membership.organizationId,
      userId,
      role: membership.role,
    };
  }

  // New user with no memberships - organic signup
  // Create both Personal and Work workspaces
  const user = await ctx.db.get(userId);
  const userName = user?.name || user?.email?.split('@')[0] || 'My';
  const now = Date.now();

  // Create Personal workspace
  const personalOrgId = await ctx.db.insert("organizations", {
    name: `${userName}'s Personal`,
    createdBy: userId,
    createdAt: now,
    isPersonalWorkspace: true, // Backward compatibility
    workspaceType: "personal",
  });

  await ctx.db.insert("memberships", {
    organizationId: personalOrgId,
    userId,
    role: "owner",
    invitedBy: undefined,
    createdAt: now,
  });

  // Create default Work workspace
  const workOrgId = await ctx.db.insert("organizations", {
    name: "Work",
    createdBy: userId,
    createdAt: now,
    isPersonalWorkspace: false, // Backward compatibility
    workspaceType: "work",
  });

  const workMembershipId = await ctx.db.insert("memberships", {
    organizationId: workOrgId,
    userId,
    role: "owner",
    invitedBy: undefined,
    createdAt: now,
  });

  // Set Work workspace as active by default
  await ensureActiveOrganizationSetting(ctx, userId, workOrgId);

  return {
    membershipId: workMembershipId,
    organizationId: workOrgId,
    userId,
    role: "owner",
  };
}

// Helper function to ensure user has a Personal workspace
async function ensurePersonalWorkspaceExists(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Id<"organizations">> {
  // Check if user already has a Personal workspace
  const personalOrg = await ctx.db
    .query("organizations")
    .withIndex("byUserType", (q) => q.eq("createdBy", userId).eq("workspaceType", "personal"))
    .first();

  if (personalOrg) {
    return personalOrg._id;
  }

  // Also check using legacy flag for backward compatibility
  const legacyPersonalOrg = await ctx.db
    .query("organizations")
    .withIndex("byCreator", (q) => q.eq("createdBy", userId))
    .filter((q) => q.eq(q.field("isPersonalWorkspace"), true))
    .first();

  if (legacyPersonalOrg) {
    // Update it with new workspaceType field
    await ctx.db.patch(legacyPersonalOrg._id, { workspaceType: "personal" });
    return legacyPersonalOrg._id;
  }

  // Create Personal workspace
  const user = await ctx.db.get(userId);
  const userName = user?.name || user?.email?.split('@')[0] || 'My';
  const now = Date.now();

  const personalOrgId = await ctx.db.insert("organizations", {
    name: `${userName}'s Personal`,
    createdBy: userId,
    createdAt: now,
    isPersonalWorkspace: true,
    workspaceType: "personal",
  });

  await ctx.db.insert("memberships", {
    organizationId: personalOrgId,
    userId,
    role: "owner",
    invitedBy: undefined,
    createdAt: now,
  });

  return personalOrgId;
}

export async function ensureActiveOrganizationSetting(
  ctx: MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">
) {
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .unique();

  if (!settings) {
    await ctx.db.insert("userSettings", {
      userId,
      organizationId,
      interruptEnabled: true,
      interruptInterval: 45,
      gracePeriod: 60,
      budgetWarningEnabled: true,
      budgetWarningThresholdHours: 1.0,
      budgetWarningThresholdAmount: 50.0,
    });
    return;
  }

  if (settings.organizationId !== organizationId) {
    await ctx.db.patch(settings._id, { organizationId });
  }
}

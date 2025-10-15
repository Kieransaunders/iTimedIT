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

  // Check for existing membership
  const existing = await ctx.db
    .query("memberships")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("inactiveAt"), undefined))
    .first();

  if (existing) {
    await ensureActiveOrganizationSetting(ctx, userId, existing.organizationId);
    return {
      membershipId: existing._id,
      organizationId: existing.organizationId,
      userId,
      role: existing.role,
    };
  }

  // Auto-create default workspace for new users (including anonymous)
  // Use user's name to create a personalized workspace name
  const user = await ctx.db.get(userId);
  const userName = user?.name || user?.email?.split('@')[0] || 'My';
  const workspaceName = `${userName}'s Workspace`;

  const now = Date.now();
  const organizationId = await ctx.db.insert("organizations", {
    name: workspaceName,
    createdBy: userId,
    createdAt: now,
    isPersonalWorkspace: true, // Keep flag for backward compatibility
  });

  const membershipId = await ctx.db.insert("memberships", {
    organizationId,
    userId,
    role: "owner",
    invitedBy: undefined,
    createdAt: now,
  });

  await ensureActiveOrganizationSetting(ctx, userId, organizationId);

  return {
    membershipId,
    organizationId,
    userId,
    role: "owner",
  };
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
      interruptInterval: 0.0833 as const,
      gracePeriod: 5 as const,
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

import { v } from "convex/values";
import { httpAction, mutation, query } from "./_generated/server";
import { requireMembershipWithRole, MembershipRole, ensureActiveOrganizationSetting } from "./orgContext";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function ensureNotExistingMember(
  ctx: Parameters<typeof mutation>[0],
  organizationId: Id<"organizations">,
  email: string
) {
  const normalized = normalizeEmail(email);

  const existingInvite = await ctx.db
    .query("invitations")
    .withIndex("byOrg", (q) => q.eq("organizationId", organizationId))
    .filter((q) => q.eq(q.field("email"), normalized))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .first();

  if (existingInvite) {
    throw new Error("A pending invitation already exists for this email");
  }

  const existingUser = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), normalized))
    .first();

  if (!existingUser) {
    return;
  }

  const membership = await ctx.db
    .query("memberships")
    .withIndex("byOrgUser", (q) => q.eq("organizationId", organizationId).eq("userId", existingUser._id))
    .filter((q) => q.eq(q.field("inactiveAt"), undefined))
    .first();

  if (membership) {
    throw new Error("User is already a member of this organization");
  }
}

function computeStatus(invitation: Doc<"invitations">): Doc<"invitations"> & { effectiveStatus: Doc<"invitations">["status"] } {
  const now = Date.now();
  const expired = invitation.status === "pending" && invitation.expiresAt <= now;
  return {
    ...invitation,
    effectiveStatus: expired ? "expired" : invitation.status,
  };
}

export const listForCurrentOrganization = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("byOrg", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();

    return invitations.map((invitation) => ({
      ...invitation,
      email: normalizeEmail(invitation.email),
      effectiveStatus:
        invitation.status === "pending" && invitation.expiresAt <= Date.now()
          ? "expired"
          : invitation.status,
    }));
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);

    const normalizedEmail = normalizeEmail(args.email);

    await ensureNotExistingMember(ctx, organizationId, normalizedEmail);

    const token = await generateToken(ctx);
    const now = Date.now();

    const invitationId = await ctx.db.insert("invitations", {
      organizationId,
      email: normalizedEmail,
      role: args.role,
      token,
      status: "pending",
      invitedBy: userId,
      createdAt: now,
      expiresAt: now + INVITATION_TTL_MS,
      acceptedAt: undefined,
      revokedAt: undefined,
    });

    return { _id: invitationId, token };
  },
});

export const resend = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation || invitation.organizationId !== organizationId) {
      throw new Error("Invitation not found");
    }

    if (invitation.status === "revoked") {
      throw new Error("Cannot resend a revoked invitation");
    }

    const now = Date.now();
    const token = await generateToken(ctx);

    await ctx.db.patch(invitation._id, {
      token,
      status: "pending",
      invitedBy: userId,
      expiresAt: now + INVITATION_TTL_MS,
      revokedAt: undefined,
    });

    return { success: true };
  },
});

export const revoke = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, ["owner", "admin"]);
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation || invitation.organizationId !== organizationId) {
      throw new Error("Invitation not found");
    }

    if (invitation.status === "accepted") {
      throw new Error("Cannot revoke an accepted invitation");
    }

    await ctx.db.patch(invitation._id, {
      status: "revoked",
      revokedAt: Date.now(),
    });

    return { success: true };
  },
});

export const accept = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("byToken", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status === "revoked") {
      throw new Error("Invitation has been revoked");
    }

    const now = Date.now();
    if (invitation.expiresAt < now) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    if (invitation.status === "accepted") {
      return { membershipId: undefined, organizationId: invitation.organizationId };
    }

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("byOrgUser", (q) => q.eq("organizationId", invitation.organizationId).eq("userId", userId))
      .filter((q) => q.eq(q.field("inactiveAt"), undefined))
      .first();

    if (!existingMembership) {
      await ctx.db.insert("memberships", {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        createdAt: now,
        inactiveAt: undefined,
      });
    }

    await ensureActiveOrganizationSetting(ctx, userId, invitation.organizationId);
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: now,
    });

    return { success: true };
  },
});

export const invitationInfo = httpAction(async (ctx, request) => {
  const { token } = request.params as { token: string };
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const invitation = await ctx.runQuery(invitationsByToken, { token });

  if (!invitation) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const effectiveStatus =
    invitation.status === "pending" && invitation.expiresAt <= Date.now()
      ? "expired"
      : invitation.status;

  return new Response(
    JSON.stringify({
      valid: effectiveStatus === "pending",
      status: effectiveStatus,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

const invitationsByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitations")
      .withIndex("byToken", (q) => q.eq("token", args.token))
      .unique();
  },
});

async function generateToken(ctx: Parameters<typeof mutation>[0]) {
  const tokenBytes = await ctx.db.system.get("generateUid");
  if (typeof tokenBytes === "string") {
    return tokenBytes;
  }
  return crypto.randomUUID().replace(/-/g, "");
}

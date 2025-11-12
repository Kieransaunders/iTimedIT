import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  httpAction,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  ensureActiveOrganizationSetting,
  requireMembershipWithRole,
  type MembershipRole,
} from "./orgContext";
import type { Id } from "./_generated/dataModel";
import {
  deriveInvitationStatus,
  InvitationWithDerivedStatus,
  normalizeInvitationEmail,
} from "./invitationsHelpers";
import {
  buildInviteLandingUrl,
  extractInvitePathDetails,
  prefersHtmlInviteResponse,
} from "./invitationsHttp";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function ensureInviteCanBeCreated(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  normalizedEmail: string
) {
  const existingInvite = await ctx.db
    .query("invitations")
    .withIndex("byOrg", (q) => q.eq("organizationId", organizationId))
    .filter((q) => q.eq(q.field("email"), normalizedEmail))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .first();

  if (existingInvite) {
    throw new Error("A pending invitation already exists for this email");
  }

  const existingUser = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), normalizedEmail))
    .first();

  if (!existingUser) {
    return;
  }

  const activeMembership = await ctx.db
    .query("memberships")
    .withIndex("byOrgUser", (q) =>
      q.eq("organizationId", organizationId).eq("userId", existingUser._id)
    )
    .filter((q) => q.eq(q.field("inactiveAt"), undefined))
    .first();

  if (activeMembership) {
    throw new Error("User is already a member of this organization");
  }
}

async function generateToken(): Promise<string> {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "");
    }

    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
  }

  // Fallback: concatenate timestamp with Math.random derived entropy.
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

export const listForCurrentOrganization = query({
  args: {},
  handler: async (ctx) => {
    const membership = await safeRequireMembership(ctx, ["owner", "admin"]);
    if (!membership) {
      return [];
    }

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("byOrg", (q) => q.eq("organizationId", membership.organizationId))
      .collect();

    return invitations.map(deriveInvitationStatus);
  },
});

export const infoForToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("byToken", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      return null;
    }

    const { effectiveStatus } = deriveInvitationStatus(invitation);
    const organization = await ctx.db.get(invitation.organizationId);

    return {
      status: effectiveStatus,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      organizationId: invitation.organizationId,
      organizationName: organization?.name ?? "Workspace",
    };
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await requireMembershipWithRole(ctx, [
      "owner",
      "admin",
    ]);

    const [organization, inviter] = await Promise.all([
      ctx.db.get(organizationId),
      ctx.db.get(userId),
    ]);

    // Prevent invitations to Personal workspaces
    if (organization?.workspaceType === "personal" || organization?.isPersonalWorkspace) {
      throw new Error("Cannot invite members to Personal workspace");
    }

    const normalizedEmail = normalizeInvitationEmail(args.email);
    await ensureInviteCanBeCreated(ctx, organizationId, normalizedEmail);

    const now = Date.now();
    const token = await generateToken();
    const expiresAt = now + INVITATION_TTL_MS;

    const invitationId = await ctx.db.insert("invitations", {
      organizationId,
      email: normalizedEmail,
      role: args.role,
      token,
      status: "pending",
      invitedBy: userId,
      createdAt: now,
      expiresAt,
      acceptedAt: undefined,
      revokedAt: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.sendEmails.sendInvitationEmail, {
      to: normalizedEmail,
      organizationName: organization?.name ?? "Your iTimedIT workspace",
      inviterDisplayName: inviter?.name ?? inviter?.email ?? "A teammate",
      role: args.role,
      token,
      expiresAt,
    });

    return { invitationId, token };
  },
});

export const resend = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await requireMembershipWithRole(ctx, [
      "owner",
      "admin",
    ]);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new Error("Invitation not found");
    }

    if (invitation.status === "revoked") {
      throw new Error("Cannot resend a revoked invitation");
    }

    const now = Date.now();
    const token = await generateToken();
    const expiresAt = now + INVITATION_TTL_MS;

    await ctx.db.patch(invitation._id, {
      token,
      status: "pending",
      invitedBy: userId,
      expiresAt,
      revokedAt: undefined,
    });

    const [organization, inviter] = await Promise.all([
      ctx.db.get(organizationId),
      ctx.db.get(userId),
    ]);

    await ctx.scheduler.runAfter(0, internal.sendEmails.sendInvitationEmail, {
      to: invitation.email,
      organizationName: organization?.name ?? "Your iTimedIT workspace",
      inviterDisplayName: inviter?.name ?? inviter?.email ?? "A teammate",
      role: invitation.role,
      token,
      expiresAt,
    });

    return { success: true };
  },
});

export const revoke = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembershipWithRole(ctx, [
      "owner",
      "admin",
    ]);

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

    const activeMembership = await ctx.db
      .query("memberships")
      .withIndex("byOrgUser", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("inactiveAt"), undefined))
      .first();

    if (!activeMembership) {
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

async function safeRequireMembership(
  ctx: QueryCtx,
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

export const getByToken = internalQuery({
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

export const invitationInfo = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const { basePath, tokenFromPath } = extractInvitePathDetails(url);
  let token = url.searchParams.get("token") ?? "";

  if (!token && tokenFromPath) {
    token = tokenFromPath;
  }

  const shouldRedirectToApp = prefersHtmlInviteResponse(request.headers.get("accept"));

  if (!token) {
    if (shouldRedirectToApp) {
      const redirectUrl = buildInviteLandingUrl(url, basePath, null);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    return new Response("Missing token", { status: 400 });
  }

  if (shouldRedirectToApp) {
    const redirectUrl = buildInviteLandingUrl(url, basePath, token);
    return Response.redirect(redirectUrl.toString(), 302);
  }

  const invitation = await ctx.runQuery(internal.invitations.getByToken, { token });
  if (!invitation) {
    return new Response(
      JSON.stringify({ valid: false, status: "not_found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { effectiveStatus } = deriveInvitationStatus(invitation);
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

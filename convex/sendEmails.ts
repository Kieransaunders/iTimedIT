import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const resend = new Resend(components.resend, {
  testMode: false,
});

function getBaseUrl() {
  const configuredUrl =
    process.env.SITE_URL || process.env.APP_ORIGIN || process.env.VERCEL_URL;
  if (configuredUrl) {
    const trimmed = configuredUrl.startsWith("http")
      ? configuredUrl
      : `https://${configuredUrl}`;
    return trimmed.replace(/\/$/, "");
  }
  return "http://localhost:5173";
}

function buildInvitationEmailHtml(args: {
  organizationName: string;
  inviterDisplayName: string;
  inviteUrl: string;
  role: string;
  expiresAt: number;
}) {
  const expires = new Date(args.expiresAt).toUTCString();
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1 style="font-size: 20px; margin-bottom: 16px;">${args.inviterDisplayName} invited you to join ${args.organizationName}</h1>
      <p style="margin: 0 0 16px;">You're being added as a <strong>${args.role}</strong> in ${args.organizationName} on iTrackIT.</p>
      <p style="margin: 0 0 24px;">
        <a href="${args.inviteUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none;">
          Accept invitation
        </a>
      </p>
      <p style="margin: 0 0 12px;">Or copy this link:</p>
      <p style="word-break: break-all; margin: 0 0 24px;">
        <a href="${args.inviteUrl}" style="color: #2563eb;">${args.inviteUrl}</a>
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">This invitation expires on ${expires}.</p>
    </div>
  `;
}

export const sendInvitationEmail = internalMutation({
  args: {
    to: v.string(),
    organizationName: v.string(),
    inviterDisplayName: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      console.warn("RESEND_FROM_EMAIL not configured; skipping invitation email.");
      return { sent: false, reason: "missing_from_email" } as const;
    }

    const fromName = process.env.RESEND_FROM_NAME?.trim();
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    const baseUrl = getBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${args.token}`;

    const html = buildInvitationEmailHtml({
      organizationName: args.organizationName,
      inviterDisplayName: args.inviterDisplayName,
      inviteUrl,
      role: args.role,
      expiresAt: args.expiresAt,
    });

    const text = [
      `${args.inviterDisplayName} invited you to join ${args.organizationName} as a ${args.role}.`,
      `Accept your invitation: ${inviteUrl}`,
      `This invitation expires on ${new Date(args.expiresAt).toUTCString()}.`,
    ].join("\n\n");

    await resend.sendEmail(ctx, {
      from,
      to: args.to,
      subject: `${args.organizationName} invitation`,
      html,
      text,
    });

    return { sent: true } as const;
  },
});

export const sendTestEmail = internalMutation({
  handler: async (ctx) => {
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error("RESEND_FROM_EMAIL not configured");
    }

    const fromName = process.env.RESEND_FROM_NAME?.trim();
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    await resend.sendEmail(ctx, {
      from,
      to: "delivered@resend.dev",
      subject: "Resend test email",
      html: "This is a test email from Resend.",
      text: "This is a test email from Resend.",
    });
  },
});

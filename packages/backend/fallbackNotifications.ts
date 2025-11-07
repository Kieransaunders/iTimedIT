"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

interface FallbackArgs {
  userId: string;
  title: string;
  body: string;
  alertType: string;
  url?: string;
  projectName?: string;
  clientName?: string;
}

interface DispatchResult {
  channel: "email" | "sms" | "slack";
  success: boolean;
  error?: string;
}

export const dispatchFallbacks = action({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    alertType: v.string(),
    url: v.optional(v.string()),
    projectName: v.optional(v.string()),
    clientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await executeFallbacks(ctx, args);
  },
});

export const escalateIfStillRelevant = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    alertType: v.string(),
    url: v.optional(v.string()),
    projectName: v.optional(v.string()),
    clientName: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    timerId: v.optional(v.id("runningTimers")),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.runQuery(internal.pushNotifications.getNotificationPrefsForUser, {
      userId: args.userId,
    });

    if (!prefs) {
      return { sent: false, reason: "no_prefs" };
    }

    if (prefs.doNotDisturbEnabled) {
      return { sent: false, reason: "dnd_enabled" };
    }

    if (!hasFallbackChannelEnabled(prefs)) {
      return { sent: false, reason: "no_channels" };
    }

    if (!shouldEscalate(ctx, args)) {
      return { sent: false, reason: "no_longer_relevant" };
    }

    return await executeFallbacks(ctx, args);
  },
});

function hasFallbackChannelEnabled(prefs: any): boolean {
  return (
    (prefs.emailEnabled && !!prefs.fallbackEmail) ||
    (prefs.smsEnabled && !!prefs.smsNumber) ||
    (prefs.slackEnabled && !!prefs.slackWebhookUrl)
  );
}

async function shouldEscalate(ctx: any, args: any): Promise<boolean> {
  if (args.alertType === "interrupt" && args.organizationId && args.timerId) {
    const timer = await ctx.runMutation(internal.interrupts.getTimerForInterrupt, {
      organizationId: args.organizationId,
      userId: args.userId,
    });

    if (!timer || !timer.awaitingInterruptAck || timer._id !== args.timerId) {
      return false;
    }
  }

  return true;
}

async function executeFallbacks(ctx: any, args: FallbackArgs) {
  const prefs = await ctx.runQuery(internal.pushNotifications.getNotificationPrefsForUser, {
    userId: args.userId,
  });

  if (!prefs) {
    return { sent: false, reason: "no_prefs" };
  }

  if (!hasFallbackChannelEnabled(prefs)) {
    return { sent: false, reason: "no_channels" };
  }

  const results: DispatchResult[] = [];

  if (prefs.emailEnabled && prefs.fallbackEmail) {
    results.push(await sendEmail(args, prefs.fallbackEmail));
  }

  if (prefs.smsEnabled && prefs.smsNumber) {
    results.push(await sendSms(args, prefs.smsNumber));
  }

  if (prefs.slackEnabled && prefs.slackWebhookUrl) {
    results.push(await sendSlack(args, prefs.slackWebhookUrl));
  }

  const success = results.some((r) => r.success);
  return { sent: success, results };
}

async function sendEmail(args: FallbackArgs, to: string): Promise<DispatchResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not configured; skipping email fallback");
    return { channel: "email", success: false, error: "missing_api_key" };
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: to }],
        subject: `Timer Alert: ${args.title}`,
      },
    ],
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || "alerts@timer-app.com",
      name: "Timer Alerts",
    },
    content: [
      {
        type: "text/plain",
        value: formatEmailBody(args),
      },
      {
        type: "text/html",
        value: formatEmailHtml(args),
      },
    ],
  };

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { channel: "email", success: false, error: text };
    }
    return { channel: "email", success: true };
  } catch (error) {
    return { channel: "email", success: false, error: (error as Error).message };
  }
}

async function sendSms(args: FallbackArgs, to: string): Promise<DispatchResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio configuration missing; skipping SMS fallback");
    return { channel: "sms", success: false, error: "missing_credentials" };
  }

  const body = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: formatSmsBody(args),
  });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      return { channel: "sms", success: false, error: text };
    }
    return { channel: "sms", success: true };
  } catch (error) {
    return { channel: "sms", success: false, error: (error as Error).message };
  }
}

async function sendSlack(args: FallbackArgs, webhookUrl: string): Promise<DispatchResult> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: formatSlackBody(args),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { channel: "slack", success: false, error: text };
    }
    return { channel: "slack", success: true };
  } catch (error) {
    return { channel: "slack", success: false, error: (error as Error).message };
  }
}

function formatEmailBody(args: FallbackArgs): string {
  const lines = [args.body];
  if (args.projectName) {
    lines.push(`Project: ${args.projectName}`);
  }
  if (args.clientName) {
    lines.push(`Client: ${args.clientName}`);
  }
  if (args.url) {
    lines.push(`\nRespond: ${absoluteUrl(args.url)}`);
  }
  return lines.join("\n");
}

function formatEmailHtml(args: FallbackArgs): string {
  return [
    `<p>${args.body}</p>`,
    args.projectName ? `<p><strong>Project:</strong> ${args.projectName}</p>` : "",
    args.clientName ? `<p><strong>Client:</strong> ${args.clientName}</p>` : "",
    args.url
      ? `<p><a href="${absoluteUrl(args.url)}" target="_blank" rel="noopener">Open in timer</a></p>`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

function formatSmsBody(args: FallbackArgs): string {
  const title = args.projectName ? `${args.title} (${args.projectName})` : args.title;
  const parts = [title, args.body];
  if (args.url) {
    parts.push(absoluteUrl(args.url));
  }
  return parts.join("\n");
}

function formatSlackBody(args: FallbackArgs): string {
  const details = [
    `*${args.title}*`,
    args.body,
    args.projectName ? `• Project: ${args.projectName}` : "",
    args.clientName ? `• Client: ${args.clientName}` : "",
    args.url ? `<${absoluteUrl(args.url)}|Open timer>` : "",
  ].filter(Boolean);
  return details.join("\n");
}

function absoluteUrl(pathname?: string): string {
  if (!pathname) {
    return process.env.PUBLIC_APP_URL || "https://timer-app.com";
  }

  const base = process.env.PUBLIC_APP_URL || "https://timer-app.com";
  if (pathname.startsWith("http")) {
    return pathname;
  }
  return new URL(pathname, base).toString();
}

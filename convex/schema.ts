import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  organizations: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("byCreator", ["createdBy"])
    .index("bySlug", ["slug"]),

  memberships: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member")
    ),
    invitedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    inactiveAt: v.optional(v.number()),
  })
    .index("byOrganization", ["organizationId"])
    .index("byUser", ["userId"])
    .index("byOrgUser", ["organizationId", "userId"]),

  invitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member")
    ),
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
      v.literal("expired")
    ),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("byOrg", ["organizationId"])
    .index("byEmail", ["email"])
    .index("byToken", ["token"]),

  clients: defineTable({
    organizationId: v.optional(v.id("organizations")),
    createdBy: v.optional(v.id("users")),
    ownerId: v.optional(v.id("users")),
    name: v.string(),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
    archived: v.boolean(),
  })
    .index("byOrganization", ["organizationId"])
    .index("byOrgName", ["organizationId", "name"])
    .index("byCreator", ["createdBy"]),

  projects: defineTable({
    organizationId: v.optional(v.id("organizations")),
    createdBy: v.optional(v.id("users")),
    ownerId: v.optional(v.id("users")),
    clientId: v.id("clients"),
    name: v.string(),
    hourlyRate: v.number(),
    budgetType: v.union(v.literal("hours"), v.literal("amount")),
    budgetHours: v.optional(v.number()),
    budgetAmount: v.optional(v.number()),
    archived: v.boolean(),
  })
    .index("byClient", ["clientId"])
    .index("byOrganization", ["organizationId"])
    .index("byOrgName", ["organizationId", "name"])
    .index("byCreator", ["createdBy"]),

  timeEntries: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    ownerId: v.optional(v.id("users")),
    projectId: v.id("projects"),
    startedAt: v.number(),
    stoppedAt: v.optional(v.number()),
    seconds: v.optional(v.number()),
    source: v.union(
      v.literal("manual"),
      v.literal("timer"),
      v.literal("autoStop"),
      v.literal("overrun")
    ),
    note: v.optional(v.string()),
    isOverrun: v.boolean(),
  })
    .index("byProject", ["projectId"])
    .index("byOrganization", ["organizationId"])
    .index("byOrgUser", ["organizationId", "userId"])
    .index("byUserStarted", ["userId", "startedAt"]),

  runningTimers: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    ownerId: v.optional(v.id("users")),
    projectId: v.id("projects"),
    startedAt: v.number(),
    lastHeartbeatAt: v.number(),
    awaitingInterruptAck: v.boolean(),
    interruptShownAt: v.optional(v.number()),
    nextInterruptAt: v.optional(v.number()),
    budgetWarningSentAt: v.optional(v.number()),
    budgetWarningType: v.optional(v.union(v.literal("time"), v.literal("amount"))),
    overrunAlertSentAt: v.optional(v.number()),
    lastNudgeSentAt: v.optional(v.number()),
    pomodoroEnabled: v.optional(v.boolean()),
    pomodoroPhase: v.optional(v.union(v.literal("work"), v.literal("break"))),
    pomodoroTransitionAt: v.optional(v.number()),
    pomodoroWorkMinutes: v.optional(v.number()),
    pomodoroBreakMinutes: v.optional(v.number()),
  })
    .index("byOrganization", ["organizationId"])
    .index("byOrgUser", ["organizationId", "userId"])
    .index("byUserProject", ["userId", "projectId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    interruptInterval: v.union(
      v.literal(0.0833), // 5 seconds (5/60 minutes)
      v.literal(5),
      v.literal(15),
      v.literal(30),
      v.literal(45),
      v.literal(60),
      v.literal(120)
    ),
    interruptEnabled: v.boolean(),
    gracePeriod: v.optional(v.union(
      v.literal(5),   // 5 seconds
      v.literal(10),  // 10 seconds
      v.literal(30),  // 30 seconds
      v.literal(60),  // 60 seconds
      v.literal(120)  // 2 minutes
    )),
    budgetWarningEnabled: v.optional(v.boolean()),
    budgetWarningThresholdHours: v.optional(v.number()),
    budgetWarningThresholdAmount: v.optional(v.number()),
    pomodoroEnabled: v.optional(v.boolean()),
    pomodoroWorkMinutes: v.optional(v.number()),
    pomodoroBreakMinutes: v.optional(v.number()),
  }).index("byUser", ["userId"]),

  imports: defineTable({
    organizationId: v.optional(v.id("organizations")),
    requestedBy: v.optional(v.id("users")),
    ownerId: v.optional(v.id("users")),
    provider: v.literal("toggl"),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
    createdAt: v.number(),
    error: v.optional(v.string()),
    meta: v.any(),
  })
    .index("byOrganization", ["organizationId"])
    .index("byRequester", ["requestedBy"])
    .index("byStatus", ["status"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dhKey: v.string(),
    authKey: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("byUser", ["userId"])
    .index("byEndpoint", ["endpoint"])
    .index("byUserActive", ["userId", "isActive"]),

  notificationPrefs: defineTable({
    userId: v.id("users"),
    webPushEnabled: v.boolean(),
    soundEnabled: v.boolean(),
    vibrationEnabled: v.boolean(),
    wakeLockEnabled: v.boolean(),
    emailEnabled: v.boolean(),
    smsEnabled: v.boolean(),
    slackEnabled: v.boolean(),
    fallbackEmail: v.optional(v.string()),
    smsNumber: v.optional(v.string()),
    slackWebhookUrl: v.optional(v.string()),
    quietHoursStart: v.optional(v.string()), // "HH:MM" format
    quietHoursEnd: v.optional(v.string()),   // "HH:MM" format
    escalationDelayMinutes: v.number(), // Default 2 minutes
    timezone: v.optional(v.string()),
    doNotDisturbEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]),
};

export default defineSchema({
  // Use auth tables as-is without modification
  ...authTables,
  // Add our application tables
  ...applicationTables,
});

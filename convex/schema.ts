import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  clients: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
    archived: v.boolean(),
  })
    .index("byOwner", ["ownerId"])
    .index("byOwnerName", ["ownerId", "name"]),

  projects: defineTable({
    ownerId: v.id("users"),
    clientId: v.id("clients"),
    name: v.string(),
    hourlyRate: v.number(),
    budgetType: v.union(v.literal("hours"), v.literal("amount")),
    budgetHours: v.optional(v.number()),
    budgetAmount: v.optional(v.number()),
    archived: v.boolean(),
  })
    .index("byClient", ["clientId"])
    .index("byOwner", ["ownerId"])
    .index("byOwnerName", ["ownerId", "name"]),

  timeEntries: defineTable({
    ownerId: v.id("users"),
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
    .index("byOwner", ["ownerId"])
    .index("byOwnerStarted", ["ownerId", "startedAt"]),

  runningTimers: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    startedAt: v.number(),
    lastHeartbeatAt: v.number(),
    awaitingInterruptAck: v.boolean(),
    interruptShownAt: v.optional(v.number()),
    nextInterruptAt: v.optional(v.number()),
  })
    .index("byOwner", ["ownerId"])
    .index("byOwnerProject", ["ownerId", "projectId"]),

  userSettings: defineTable({
    userId: v.id("users"),
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
  }).index("byUser", ["userId"]),

  imports: defineTable({
    ownerId: v.id("users"),
    provider: v.literal("toggl"),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
    createdAt: v.number(),
    error: v.optional(v.string()),
    meta: v.any(),
  })
    .index("byOwner", ["ownerId"])
    .index("byStatus", ["status"]),
};

// Custom users table to include the gender field that exists in your data
const customAuthTables = {
  ...authTables,
  users: defineTable({
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    gender: v.optional(v.string()), // Added to match existing data
  }),
};

export default defineSchema({
  ...customAuthTables,
  ...applicationTables,
});

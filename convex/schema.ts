import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  clients: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    note: v.optional(v.string()),
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
  })
    .index("byOwner", ["ownerId"])
    .index("byOwnerProject", ["ownerId", "projectId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    interruptInterval: v.union(
      v.literal(5),
      v.literal(15),
      v.literal(30),
      v.literal(60),
      v.literal(120)
    ),
    interruptEnabled: v.boolean(),
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

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

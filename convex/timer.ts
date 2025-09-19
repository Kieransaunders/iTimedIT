import { query, mutation, action, internalMutation, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const getRunningTimer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOwner", (q) => q.eq("ownerId", userId))
      .unique();

    if (!timer) {
      return null;
    }

    const project = await ctx.db.get(timer.projectId);
    const client = project ? await ctx.db.get(project.clientId) : null;

    return {
      ...timer,
      project,
      client,
    };
  },
});

export const start = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== userId) {
      throw new Error("Project not found");
    }

    // Stop any existing timer
    const existingTimer = await ctx.db
      .query("runningTimers")
      .withIndex("byOwner", (q) => q.eq("ownerId", userId))
      .unique();

    if (existingTimer) {
      await stopInternal(ctx, userId, "timer");
    }

    const now = Date.now();

    // Create running timer
    await ctx.db.insert("runningTimers", {
      ownerId: userId,
      projectId: args.projectId,
      startedAt: now,
      lastHeartbeatAt: now,
      awaitingInterruptAck: false,
    });

    // Create time entry
    await ctx.db.insert("timeEntries", {
      ownerId: userId,
      projectId: args.projectId,
      startedAt: now,
      source: "timer",
      isOverrun: false,
    });

    return { success: true };
  },
});

export const stop = mutation({
  args: {
    sourceOverride: v.optional(v.union(v.literal("manual"), v.literal("timer"), v.literal("autoStop"), v.literal("overrun"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await stopInternal(ctx, userId, args.sourceOverride || "timer");
  },
});

async function stopInternal(ctx: MutationCtx, userId: Id<"users">, source: "manual" | "timer" | "autoStop" | "overrun") {
  const timer = await ctx.db
    .query("runningTimers")
    .withIndex("byOwner", (q) => q.eq("ownerId", userId))
    .unique();

  if (!timer) {
    return { success: false, message: "No running timer" };
  }

  const now = Date.now();

  // Find the active time entry
  const activeEntry = await ctx.db
    .query("timeEntries")
    .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
    .filter((q) => q.and(
      q.eq(q.field("ownerId"), userId),
      q.eq(q.field("stoppedAt"), undefined),
      q.eq(q.field("isOverrun"), false)
    ))
    .first();

  if (activeEntry) {
    const seconds = Math.floor((now - activeEntry.startedAt) / 1000);
    await ctx.db.patch(activeEntry._id, {
      stoppedAt: now,
      seconds,
      source,
    });
  }

  // Delete running timer
  await ctx.db.delete(timer._id);

  return { success: true };
}

export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOwner", (q) => q.eq("ownerId", userId))
      .unique();

    if (timer) {
      await ctx.db.patch(timer._id, {
        lastHeartbeatAt: Date.now(),
      });
    }
  },
});

export const requestInterrupt = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOwner", (q) => q.eq("ownerId", userId))
      .unique();

    if (!timer) {
      return { shouldShowInterrupt: false };
    }

    await ctx.db.patch(timer._id, {
      awaitingInterruptAck: true,
      interruptShownAt: Date.now(),
    });

    // Schedule auto-stop after 60 seconds
    await ctx.scheduler.runAfter(60000, internal.timer.autoStopForMissedAck, {
      userId,
    });

    return { shouldShowInterrupt: true };
  },
});

export const ackInterrupt = mutation({
  args: {
    continue: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOwner", (q) => q.eq("ownerId", userId))
      .unique();

    if (!timer || !timer.awaitingInterruptAck) {
      return { success: false };
    }

    if (args.continue) {
      await ctx.db.patch(timer._id, {
        awaitingInterruptAck: false,
        interruptShownAt: undefined,
      });
    } else {
      await stopInternal(ctx, userId, "timer");
    }

    return { success: true };
  },
});

export const autoStopForMissedAck = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOwner", (q) => q.eq("ownerId", args.userId))
      .unique();

    if (!timer || !timer.awaitingInterruptAck || !timer.interruptShownAt) {
      return;
    }

    const now = Date.now();
    const timeSinceInterrupt = now - timer.interruptShownAt;

    // Only auto-stop if more than 60 seconds have passed
    if (timeSinceInterrupt > 60000) {
      // Stop current entry with autoStop source
      await stopInternal(ctx, args.userId, "autoStop");

      // Create overrun placeholder
      await ctx.db.insert("timeEntries", {
        ownerId: args.userId,
        projectId: timer.projectId,
        startedAt: now,
        source: "overrun",
        isOverrun: true,
        note: "Overrun placeholder - merge if you were still working",
      });
    }
  },
});

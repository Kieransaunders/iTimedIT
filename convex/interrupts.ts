import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const check = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timer = await ctx.runMutation(internal.interrupts.getTimerForInterrupt, {
      userId: args.userId,
    });

    if (!timer) {
      return { action: "no_timer", graceJobScheduled: false, graceJobTime: null };
    }

    // Check if timer is already awaiting interrupt acknowledgment
    if (timer.awaitingInterruptAck) {
      return { action: "skipped", graceJobScheduled: false, graceJobTime: null };
    }

    // Check if user has been active (heartbeat within last 5 minutes)
    const now = Date.now();
    const heartbeatStale = now - timer.lastHeartbeatAt > 5 * 60 * 1000; // 5 minutes

    if (heartbeatStale) {
      // Timer is stale, auto-stop it
      await ctx.runMutation(internal.interrupts.autoStopStaleTimer, {
        userId: args.userId,
        timerId: timer._id,
      });
      return { action: "skipped", graceJobScheduled: false, graceJobTime: null };
    }

    // Trigger interruption prompt
    const interruptAt = now;
    await ctx.runMutation(internal.interrupts.setAwaitingInterrupt, {
      userId: args.userId,
      timerId: timer._id,
      interruptAt,
    });

    // Schedule auto-stop if no acknowledgment after 60 seconds
    const graceJobTime = interruptAt + 60000;
    await ctx.scheduler.runAt(graceJobTime, api.interrupts.autoStopIfNoAck, {
      userId: args.userId,
      interruptAt,
    });

    return {
      action: "prompted",
      graceJobScheduled: true,
      graceJobTime,
    };
  },
});

export const autoStopIfNoAck = action({
  args: {
    userId: v.id("users"),
    interruptAt: v.number(),
  },
  handler: async (ctx, args): Promise<{
    action: "auto_stopped" | "already_acked" | "stale_job";
    stoppedEntryId: Id<"timeEntries"> | null;
    overrunEntryId: Id<"timeEntries"> | null;
  }> => {
    const timer = await ctx.runMutation(internal.interrupts.getTimerForInterrupt, {
      userId: args.userId,
    });

    if (!timer) {
      return { action: "stale_job", stoppedEntryId: null, overrunEntryId: null };
    }

    // Check if this is the right interrupt (not already acknowledged)
    if (!timer.awaitingInterruptAck || timer.interruptShownAt !== args.interruptAt) {
      return { action: "already_acked", stoppedEntryId: null, overrunEntryId: null };
    }

    // Auto-stop the timer and create overrun entry
    const result = await ctx.runMutation(internal.interrupts.autoStopAndCreateOverrun, {
      userId: args.userId,
      timerId: timer._id,
      projectId: timer.projectId,
    });

    return {
      action: "auto_stopped",
      stoppedEntryId: result.stoppedEntryId,
      overrunEntryId: result.overrunEntryId,
    };
  },
});

export const sweep = action({
  args: {},
  handler: async (ctx) => {
    const timers = await ctx.runMutation(internal.interrupts.getAllTimersForSweep);
    const now = Date.now();

    let checkedTimers = 0;
    let interruptionsTriggered = 0;
    let autoStoppedTimers = 0;
    let staleTimersStopped = 0;

    for (const timer of timers) {
      checkedTimers++;

      // Check for stale timers (no heartbeat for 5+ minutes)
      const heartbeatStale = now - timer.lastHeartbeatAt > 5 * 60 * 1000;
      if (heartbeatStale) {
        await ctx.runMutation(internal.interrupts.autoStopStaleTimer, {
          userId: timer.ownerId,
          timerId: timer._id,
        });
        staleTimersStopped++;
        continue;
      }

      // Check for timers awaiting interrupt ack for too long (60+ seconds)
      if (timer.awaitingInterruptAck && timer.interruptShownAt) {
        const timeSinceInterrupt = now - timer.interruptShownAt;
        if (timeSinceInterrupt > 60000) {
          await ctx.runMutation(internal.interrupts.autoStopAndCreateOverrun, {
            userId: timer.ownerId,
            timerId: timer._id,
            projectId: timer.projectId,
          });
          autoStoppedTimers++;
          continue;
        }
      }

      // Check for missed interruptions
      if (timer.nextInterruptAt && now >= timer.nextInterruptAt && !timer.awaitingInterruptAck) {
        const interruptAt = now;
        await ctx.runMutation(internal.interrupts.setAwaitingInterrupt, {
          userId: timer.ownerId,
          timerId: timer._id,
          interruptAt,
        });

        // Schedule auto-stop
          await ctx.scheduler.runAt(interruptAt + 60000, api.interrupts.autoStopIfNoAck, {
          userId: timer.ownerId,
          interruptAt,
        });

        interruptionsTriggered++;
      }
    }

    return {
      checkedTimers,
      interruptionsTriggered,
      autoStoppedTimers,
      staleTimersStopped,
    };
  },
});

// Internal queries and mutations

export const getTimerForInterrupt = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("runningTimers")
      .withIndex("byOwner", (q) => q.eq("ownerId", args.userId))
      .unique();
  },
});

export const getAllTimersForSweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("runningTimers").collect();
  },
});

export const setAwaitingInterrupt = internalMutation({
  args: {
    userId: v.id("users"),
    timerId: v.id("runningTimers"),
    interruptAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timerId, {
      awaitingInterruptAck: true,
      interruptShownAt: args.interruptAt,
    });
  },
});

export const autoStopStaleTimer = internalMutation({
  args: {
    userId: v.id("users"),
    timerId: v.id("runningTimers"),
  },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.timerId);
    if (!timer) return;

    const now = Date.now();

    // Find the active time entry
    const activeEntry = await ctx.db
      .query("timeEntries")
      .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
      .filter((q) => q.and(
        q.eq(q.field("ownerId"), args.userId),
        q.eq(q.field("stoppedAt"), undefined),
        q.eq(q.field("isOverrun"), false)
      ))
      .first();

    if (activeEntry) {
      const seconds = Math.floor((now - activeEntry.startedAt) / 1000);
      await ctx.db.patch(activeEntry._id, {
        stoppedAt: now,
        seconds,
        source: "autoStop",
      });
    }

    // Delete running timer
    await ctx.db.delete(args.timerId);
  },
});

export const autoStopAndCreateOverrun = internalMutation({
  args: {
    userId: v.id("users"),
    timerId: v.id("runningTimers"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the active time entry
    const activeEntry = await ctx.db
      .query("timeEntries")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.and(
        q.eq(q.field("ownerId"), args.userId),
        q.eq(q.field("stoppedAt"), undefined),
        q.eq(q.field("isOverrun"), false)
      ))
      .first();

    let stoppedEntryId: Id<"timeEntries"> | null = null;

    if (activeEntry) {
      const seconds = Math.floor((now - activeEntry.startedAt) / 1000);
      await ctx.db.patch(activeEntry._id, {
        stoppedAt: now,
        seconds,
        source: "autoStop",
      });
      stoppedEntryId = activeEntry._id;
    }

    // Create overrun placeholder
    const overrunEntryId = await ctx.db.insert("timeEntries", {
      ownerId: args.userId,
      projectId: args.projectId,
      startedAt: now,
      source: "overrun",
      isOverrun: true,
      note: "Overrun placeholder - merge if you were still working",
    });

    // Delete running timer
    await ctx.db.delete(args.timerId);

    return { stoppedEntryId, overrunEntryId };
  },
});
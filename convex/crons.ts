import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

// Run every minute to check for missed interrupt acknowledgments
crons.interval("check missed interrupts", { minutes: 1 }, internal.crons.checkMissedInterrupts, {});

export const checkMissedInterrupts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleThreshold = 60000; // 60 seconds

    // Find all timers awaiting interrupt acknowledgment that are stale
    const staleTimers = await ctx.db
      .query("runningTimers")
      .filter((q) => q.and(
        q.eq(q.field("awaitingInterruptAck"), true),
        q.lt(q.field("interruptShownAt"), now - staleThreshold)
      ))
      .collect();

    for (const timer of staleTimers) {
      // Auto-stop the timer
      const activeEntry = await ctx.db
        .query("timeEntries")
        .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
        .filter((q) => q.and(
          q.eq(q.field("organizationId"), timer.organizationId),
          q.eq(q.field("userId"), timer.userId),
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
      await ctx.db.delete(timer._id);

      // Create overrun placeholder
      await ctx.db.insert("timeEntries", {
        organizationId: timer.organizationId,
        userId: timer.userId,
        projectId: timer.projectId,
        startedAt: now,
        source: "overrun",
        isOverrun: true,
        note: "Overrun placeholder - merge if you were still working",
      });
    }
  },
});

export default crons;

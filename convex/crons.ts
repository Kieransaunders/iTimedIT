import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

// Run every minute to check for missed interrupt acknowledgments
crons.interval("check missed interrupts", { minutes: 1 }, internal.crons.checkMissedInterrupts, {});
crons.interval("nudge long running timers", { minutes: 5 }, internal.crons.nudgeLongRunningTimers, {});

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

const LONG_RUNNING_THRESHOLD_MS = 90 * 60 * 1000; // 90 minutes
const NUDGE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes between nudges

export const nudgeLongRunningTimers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const timers = await ctx.db.query("runningTimers").collect();

    for (const timer of timers) {
      if (!timer.organizationId || !timer.userId) {
        continue;
      }
      if (timer.awaitingInterruptAck) {
        continue;
      }

      const elapsedMs = now - timer.startedAt;
      if (elapsedMs < LONG_RUNNING_THRESHOLD_MS) {
        continue;
      }

      const lastNudge = timer.lastNudgeSentAt ?? 0;
      if (now - lastNudge < NUDGE_INTERVAL_MS) {
        continue;
      }

      const project = await ctx.db.get(timer.projectId);
      if (!project) {
        continue;
      }

      const client = await ctx.db.get(project.clientId);
      const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
      const minutes = Math.floor((elapsedMs % (60 * 60 * 1000)) / (60 * 1000));
      const durationLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      try {
        const result = await ctx.runAction(api.pushActions.sendTimerAlert, {
          userId: timer.userId,
          title: "Timer still running",
          body: `You've been tracking ${project.name} for ${durationLabel}. Need to adjust?`,
          alertType: "overrun",
          projectName: project.name,
          clientName: client?.name ?? undefined,
          data: {
            projectId: project._id,
            organizationId: timer.organizationId,
            elapsedMs,
          },
        });

        if (result.success) {
          await ctx.db.patch(timer._id, {
            lastNudgeSentAt: now,
          });
        }
      } catch (error) {
        console.error("Failed to send scheduled nudge", error);
      }
    }
  },
});

export default crons;

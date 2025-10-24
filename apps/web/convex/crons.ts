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

    // IMPORTANT: This cron job should NOT interfere with active interrupt acknowledgments.
    // The scheduled interrupt handler (api.interrupts.autoStopIfNoAck) handles the grace period.
    // This job only cleans up truly stale/abandoned timers (no heartbeat for 5+ minutes).

    const staleHeartbeatThreshold = 5 * 60 * 1000; // 5 minutes without heartbeat

    // Find timers that haven't sent a heartbeat in 5+ minutes (likely abandoned/crashed app)
    const staleTimers = await ctx.db
      .query("runningTimers")
      .filter((q) => q.lt(q.field("lastHeartbeatAt"), now - staleHeartbeatThreshold))
      .collect();

    console.log(`🧹 Cron: Found ${staleTimers.length} stale timers (no heartbeat for 5+ min)`);

    for (const timer of staleTimers) {
      console.log(`🧹 Cron: Auto-stopping stale timer ${timer._id} (last heartbeat: ${new Date(timer.lastHeartbeatAt).toISOString()})`);

      // Auto-stop the timer
      const activeEntry = await ctx.db
        .query("timeEntries")
        .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
        .filter((q) => {
          if (timer.organizationId) {
            return q.and(
              q.eq(q.field("organizationId"), timer.organizationId),
              q.eq(q.field("userId"), timer.userId),
              q.eq(q.field("stoppedAt"), undefined),
              q.eq(q.field("isOverrun"), false)
            );
          } else {
            return q.and(
              q.eq(q.field("userId"), timer.userId),
              q.eq(q.field("organizationId"), undefined),
              q.eq(q.field("stoppedAt"), undefined),
              q.eq(q.field("isOverrun"), false)
            );
          }
        })
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

      console.log(`✅ Cron: Stale timer ${timer._id} stopped successfully`);
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
      // Skip break timers - they don't track billable time
      if (timer.isBreakTimer) {
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

      const client = project.clientId ? await ctx.db.get(project.clientId) : null;
      const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
      const minutes = Math.floor((elapsedMs % (60 * 60 * 1000)) / (60 * 1000));
      const durationLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      try {
        await ctx.scheduler.runAfter(0, api.pushActions.sendTimerAlert, {
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

        await ctx.db.patch(timer._id, {
          lastNudgeSentAt: now,
        });
      } catch (error) {
        console.error("Failed to send scheduled nudge", error);
      }
    }
  },
});

export default crons;

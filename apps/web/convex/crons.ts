import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

// Run every minute to check for missed interrupt acknowledgments
crons.interval("check missed interrupts", { minutes: 1 }, internal.crons.checkMissedInterrupts, {});
crons.interval("nudge long running timers", { minutes: 5 }, internal.crons.nudgeLongRunningTimers, {});
// Run daily to create recurring projects
crons.daily("create recurring projects", { hourUTC: 0, minuteUTC: 0 }, internal.crons.createRecurringProjects, {});

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

export const createRecurringProjects = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all templates with auto-creation enabled that are due
    const allProjects = await ctx.db.query("projects").collect();
    const dueTemplates = allProjects.filter(p =>
      p.isTemplate &&
      p.recurringConfig?.enabled &&
      p.recurringConfig.nextCreationDate <= now
    );

    console.log(`🔄 Recurring Projects Cron: Found ${dueTemplates.length} templates ready for project creation`);

    for (const template of dueTemplates) {
      try {
        if (!template.recurringConfig) {
          console.error(`❌ Template ${template._id} missing recurring config`);
          continue;
        }

        // Calculate billing period for new project
        const nextCreationDate = template.recurringConfig.nextCreationDate;
        const startDate = new Date(nextCreationDate);
        const endDate = new Date(Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth() + 1,
          0, 23, 59, 59
        ));

        const periodLabel = startDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });

        // Generate project name
        const projectName = template.recurringConfig.namePattern
          .replace('{month}', startDate.toLocaleDateString('en-US', { month: 'long' }))
          .replace('{year}', startDate.getUTCFullYear().toString());

        // Create new project
        const newProjectId = await ctx.db.insert("projects", {
          organizationId: template.organizationId,
          createdBy: template.createdBy,
          ownerId: template.ownerId,
          clientId: template.recurringConfig.preserveClientId ? template.clientId : undefined,
          name: projectName,
          hourlyRate: template.hourlyRate,
          budgetType: template.budgetType,
          budgetHours: template.budgetHours,
          budgetAmount: template.budgetAmount,
          archived: false,
          workspaceType: template.workspaceType,
          isTemplate: false,
          parentTemplateId: template._id,
          billingPeriod: {
            startDate: startDate.getTime(),
            endDate: endDate.getTime(),
            label: periodLabel,
          },
        });

        console.log(`✅ Created recurring project: ${projectName} (${newProjectId})`);

        // Update template's next creation date (advance to next month)
        const nextMonth = new Date(Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth() + 1,
          1, 0, 0, 0
        ));

        await ctx.db.patch(template._id, {
          recurringConfig: {
            ...template.recurringConfig,
            nextCreationDate: nextMonth.getTime(),
          },
        });

        console.log(`📅 Updated template next creation date to ${nextMonth.toISOString()}`);

        // Send notification if enabled
        if (template.recurringConfig.notifyOnCreation && template.createdBy) {
          try {
            await ctx.scheduler.runAfter(0, api.pushActions.sendTimerAlert, {
              userId: template.createdBy,
              title: "New recurring project created",
              body: `${projectName} is ready for time tracking`,
              alertType: "budget_warning",
              projectName,
              data: {
                projectId: newProjectId,
                organizationId: template.organizationId,
              },
            });
            console.log(`🔔 Notification scheduled for user ${template.createdBy}`);
          } catch (notifError) {
            console.error(`⚠️ Failed to send notification:`, notifError);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to create project from template ${template._id}:`, error);
      }
    }

    console.log(`🔄 Recurring Projects Cron: Complete`);
  },
});

export default crons;

import { query, mutation, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ensureMembership, requireMembership } from "./orgContext";

export const getRunningTimer = query({
  args: {},
  handler: async (ctx) => {
    const membership = await requireMembership(ctx);

    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q) =>
        q.eq("organizationId", membership.organizationId).eq("userId", membership.userId)
      )
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
    const membership = await ensureMembership(ctx);
    const { organizationId, userId } = membership;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.organizationId !== organizationId) {
      throw new Error("Project not found");
    }

    // Get user settings for interrupt interval
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    const interruptInterval = settings?.interruptInterval ?? 60; // default 60 minutes
    const interruptEnabled = settings?.interruptEnabled ?? true;

    // Stop any existing timer
    const existingTimer = await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q) =>
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .unique();

    if (existingTimer) {
      await stopInternal(ctx, organizationId, userId, "timer");
    }

    const now = Date.now();
    const nextInterruptAt = interruptEnabled ? now + (interruptInterval * 60 * 1000) : undefined;

    // Create running timer
    const timerId = await ctx.db.insert("runningTimers", {
      organizationId,
      userId,
      projectId: args.projectId,
      startedAt: now,
      lastHeartbeatAt: now,
      awaitingInterruptAck: false,
      nextInterruptAt,
    });

    // Schedule interrupt check if enabled
    if (nextInterruptAt) {
      await ctx.scheduler.runAt(nextInterruptAt, api.interrupts.check, {
        organizationId,
        userId,
      });
    }

    // Create time entry
    await ctx.db.insert("timeEntries", {
      organizationId,
      userId,
      projectId: args.projectId,
      startedAt: now,
      source: "timer",
      isOverrun: false,
    });

    return {
      success: true,
      timerId,
      nextInterruptAt,
    };
  },
});

export const stop = mutation({
  args: {
    sourceOverride: v.optional(v.union(v.literal("manual"), v.literal("timer"), v.literal("autoStop"), v.literal("overrun"))),
  },
  handler: async (ctx, args) => {
    const membership = await ensureMembership(ctx);
    return await stopInternal(
      ctx,
      membership.organizationId,
      membership.userId,
      args.sourceOverride || "timer"
    );
  },
});

async function stopInternal(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  source: "manual" | "timer" | "autoStop" | "overrun"
) {
  const timer = await ctx.db
    .query("runningTimers")
    .withIndex("byOrgUser", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
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
      q.eq(q.field("organizationId"), organizationId),
      q.eq(q.field("userId"), userId),
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
    const membership = await ensureMembership(ctx);

    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q) =>
        q.eq("organizationId", membership.organizationId).eq("userId", membership.userId)
      )
      .unique();

  if (timer) {
    const now = Date.now();
    await ctx.db.patch(timer._id, {
      lastHeartbeatAt: now,
    });

    await maybeSendBudgetAlerts(ctx, timer);
  }
  },
});

export const requestInterrupt = mutation({
  args: {},
  handler: async (ctx) => {
    const membership = await ensureMembership(ctx);

    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q) =>
        q.eq("organizationId", membership.organizationId).eq("userId", membership.userId)
      )
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
      organizationId: membership.organizationId,
      userId: membership.userId,
    });

    return { shouldShowInterrupt: true };
  },
});

export const ackInterrupt = mutation({
  args: {
    continue: v.boolean(),
  },
  handler: async (ctx, args) => {
    const membership = await ensureMembership(ctx);
    const { organizationId, userId } = membership;

    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q) =>
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .unique();

    if (!timer || !timer.awaitingInterruptAck) {
      return { success: false, action: "already_acked", nextInterruptAt: null };
    }

    if (args.continue) {
      // Get user settings for next interrupt scheduling
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("byUser", (q) => q.eq("userId", userId))
        .unique();

      const interruptInterval = settings?.interruptInterval ?? 60; // default 60 minutes
      const interruptEnabled = settings?.interruptEnabled ?? true;

      const now = Date.now();
      const nextInterruptAt = interruptEnabled ? now + (interruptInterval * 60 * 1000) : undefined;

      await ctx.db.patch(timer._id, {
        awaitingInterruptAck: false,
        interruptShownAt: undefined,
        nextInterruptAt,
      });

      // Schedule next interrupt check if enabled
      if (nextInterruptAt) {
        await ctx.scheduler.runAt(nextInterruptAt, api.interrupts.check, {
          organizationId,
          userId,
        });
      }

      return { success: true, action: "continued", nextInterruptAt };
    } else {
      const projectId = timer.projectId;
      await stopInternal(
        ctx,
        organizationId,
        userId,
        "timer"
      );

      try {
        const projectData = await ctx.runMutation(internal.interrupts.getProjectAndClientInfo, {
          projectId,
        });

        await ctx.scheduler.runAfter(0, api.pushActions.sendTimerAlert, {
          userId,
          title: "Break time",
          body: `Take a short break before jumping back into ${projectData?.projectName || 'your next task'}.`,
          alertType: "break_reminder",
          projectName: projectData?.projectName,
          clientName: projectData?.clientName,
          data: { projectId },
        });
      } catch (error) {
        console.error("Failed to send break reminder notification:", error);
      }
      return { success: true, action: "stopped", nextInterruptAt: null };
    }
  },
});

// COMMENTED OUT: Overrun merge functionality
// export const mergeOverrun = mutation({
//   args: {
//     overrunId: v.id("timeEntries"),
//     targetId: v.id("timeEntries"),
//   },
//   handler: async (ctx, args) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) {
//       throw new Error("Not authenticated");
//     }

//     const overrunEntry = await ctx.db.get(args.overrunId);
//     const targetEntry = await ctx.db.get(args.targetId);

//     if (!overrunEntry || !targetEntry) {
//       throw new Error("Entry not found");
//     }

//     if (overrunEntry.ownerId !== userId || targetEntry.ownerId !== userId) {
//       throw new Error("Unauthorized");
//     }

//     if (!overrunEntry.isOverrun || overrunEntry.source !== "overrun") {
//       throw new Error("Source entry is not an overrun");
//     }

//     if (targetEntry.isOverrun) {
//       throw new Error("Cannot merge into an overrun entry");
//     }

//     if (!targetEntry.stoppedAt || !targetEntry.seconds) {
//       throw new Error("Target entry is not completed");
//     }

//     // Calculate overrun duration (from overrun start to now)
//     const now = Date.now();
//     const overrunSeconds = Math.floor((now - overrunEntry.startedAt) / 1000);
//     const mergedSeconds = targetEntry.seconds + overrunSeconds;

//     // Update target entry with merged time
//     await ctx.db.patch(args.targetId, {
//       stoppedAt: now,
//       seconds: mergedSeconds,
//       note: targetEntry.note
//         ? `${targetEntry.note} (merged with ${overrunSeconds}s overrun)`
//         : `Merged with ${overrunSeconds}s overrun`,
//     });

//     // Delete the overrun entry
//     await ctx.db.delete(args.overrunId);

//     return {
//       mergedSeconds: overrunSeconds,
//       totalSeconds: mergedSeconds,
//     };
//   },
// });

export const autoStopForMissedAck = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timer = await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .unique();

    if (!timer || !timer.awaitingInterruptAck || !timer.interruptShownAt) {
      return;
    }

    if (!timer.organizationId || !timer.userId) {
      return;
    }

    const now = Date.now();
    const timeSinceInterrupt = now - timer.interruptShownAt;

    // Only auto-stop if more than 60 seconds have passed
    if (timeSinceInterrupt > 60000) {
      // Stop current entry with autoStop source
      await stopInternal(ctx, args.organizationId, args.userId, "autoStop");

      // COMMENTED OUT: Create overrun placeholder
      // await ctx.db.insert("timeEntries", {
      //   organizationId: args.organizationId,
      //   userId: args.userId,
      //   projectId: timer.projectId,
      //   startedAt: now,
      //   source: "overrun",
      //   isOverrun: true,
      //   note: "Overrun placeholder - merge if you were still working",
      // });
    }
  },
});

const BUDGET_WARNING_RESEND_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const BUDGET_OVERRUN_RESEND_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

async function maybeSendBudgetAlerts(ctx: MutationCtx, timer: Doc<"runningTimers">) {
  if (!timer.organizationId || !timer.userId) {
    return;
  }

  const project = await ctx.db.get(timer.projectId);
  if (!project || project.organizationId !== timer.organizationId) {
    return;
  }

  const userSettings = await ctx.db
    .query("userSettings")
    .withIndex("byUser", (q) => q.eq("userId", timer.userId!))
    .unique();

  const now = Date.now();

  const entries = await ctx.db
    .query("timeEntries")
    .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
    .filter((q) => q.eq(q.field("isOverrun"), false))
    .collect();

  const totalSecondsFromEntries = entries.reduce((sum, entry) => {
    const seconds = entry.seconds ?? (entry.stoppedAt ? Math.floor((entry.stoppedAt - entry.startedAt) / 1000) : 0);
    return sum + seconds;
  }, 0);

  const runningSeconds = Math.max(0, Math.floor((now - timer.startedAt) / 1000));
  const totalSeconds = totalSecondsFromEntries + runningSeconds;
  const totalAmount = (totalSeconds / 3600) * project.hourlyRate;

  const client = await ctx.db.get(project.clientId);

  let overBudget = false;
  let overrunBody = "";
  let warningType: "time" | "amount" | null = null;
  let warningBody = "";

  if (project.budgetType === "hours" && project.budgetHours) {
    const budgetSeconds = project.budgetHours * 3600;
    const remainingSeconds = budgetSeconds - totalSeconds;
    if (remainingSeconds <= 0) {
      overBudget = true;
      overrunBody = `You've exceeded the ${project.budgetHours}h time budget for ${project.name}.`;
    } else if ((userSettings?.budgetWarningEnabled ?? true) && userSettings?.budgetWarningThresholdHours) {
      const hoursRemaining = remainingSeconds / 3600;
      if (hoursRemaining <= userSettings.budgetWarningThresholdHours) {
        warningType = "time";
        warningBody = `${project.name} has less than ${userSettings.budgetWarningThresholdHours} hours remaining.`;
      }
    }
  } else if (project.budgetType === "amount" && project.budgetAmount) {
    const remainingAmount = project.budgetAmount - totalAmount;
    if (remainingAmount <= 0) {
      overBudget = true;
      overrunBody = `You've exceeded the $${project.budgetAmount.toFixed(2)} budget for ${project.name}.`;
    } else if ((userSettings?.budgetWarningEnabled ?? true) && userSettings?.budgetWarningThresholdAmount) {
      if (remainingAmount <= userSettings.budgetWarningThresholdAmount) {
        warningType = "amount";
        warningBody = `${project.name} has less than $${userSettings.budgetWarningThresholdAmount.toFixed(2)} remaining.`;
      }
    }
  }

  const update: Partial<Doc<"runningTimers">> = {};

  if (overBudget) {
    const lastOverrun = timer.overrunAlertSentAt ?? 0;
    if (now - lastOverrun > BUDGET_OVERRUN_RESEND_INTERVAL_MS) {
      try {
        await ctx.scheduler.runAfter(0, api.pushActions.sendTimerAlert, {
          userId: timer.userId!,
          title: "Budget exceeded",
          body: overrunBody || `The timer for ${project.name} is over its planned limits.`,
          alertType: "overrun",
          projectName: project.name,
          clientName: client?.name ?? undefined,
          data: {
            projectId: project._id,
            organizationId: timer.organizationId,
          },
        });
        update.overrunAlertSentAt = now;
      } catch (error) {
        console.error("Failed to send budget overrun notification:", error);
      }
    }

    if (Object.keys(update).length > 0) {
      try {
        await ctx.db.patch(timer._id, update);
      } catch (error) {
        console.error("Failed to persist timer overrun metadata:", error);
      }
    }
    return;
  }

  if (warningType) {
    const lastWarning = timer.budgetWarningSentAt ?? 0;
    const previousType = timer.budgetWarningType;
    if (previousType !== warningType || now - lastWarning > BUDGET_WARNING_RESEND_INTERVAL_MS) {
      try {
        await ctx.scheduler.runAfter(0, api.pushActions.sendTimerAlert, {
          userId: timer.userId!,
          title: "Budget warning",
          body: warningBody || `The timer for ${project.name} is approaching its limits.`,
          alertType: "budget_warning",
          projectName: project.name,
          clientName: client?.name ?? undefined,
          data: {
            projectId: project._id,
            organizationId: timer.organizationId,
            warningType,
          },
        });
        update.budgetWarningSentAt = now;
        update.budgetWarningType = warningType;
      } catch (error) {
        console.error("Failed to send budget warning notification:", error);
      }
    }
  }

  if (Object.keys(update).length > 0) {
    try {
      await ctx.db.patch(timer._id, update);
    } catch (error) {
      console.error("Failed to persist timer warning metadata:", error);
    }
  }
}

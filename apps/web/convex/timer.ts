import { query, mutation, internalMutation, action, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ensureMembership, requireMembership, maybeMembership } from "./orgContext";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to detect if project is personal workspace
function isPersonalProject(project: Doc<"projects"> | null): boolean {
  return project?.workspaceType === "personal" || project?.organizationId === undefined;
}

// Helper to get running timer for both personal and work workspaces
async function getRunningTimerForUser(
  ctx: { db: any },
  userId: Id<"users">,
  organizationId?: Id<"organizations">
): Promise<Doc<"runningTimers"> | null> {
  if (organizationId) {
    // Work workspace - use byOrgUser index
    return await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q: any) =>
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .unique();
  } else {
    // Personal workspace - use byUserProject index or filter
    return await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q: any) =>
        q.eq("organizationId", undefined).eq("userId", userId)
      )
      .unique();
  }
}

export const getRunningTimer = query({
  args: {
    workspaceType: v.optional(v.union(v.literal("personal"), v.literal("work"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Determine organizationId based on workspace type
    let organizationId: Id<"organizations"> | undefined;

    if (args.workspaceType === "personal") {
      // Force personal workspace (no organization)
      organizationId = undefined;
    } else {
      // Default to work workspace if available
      const membership = await maybeMembership(ctx);
      organizationId = membership?.organizationId;
    }

    // Get timer for current workspace context
    const timer = await getRunningTimerForUser(ctx, userId, organizationId);

    if (!timer) {
      return null;
    }

    const project = await ctx.db.get(timer.projectId);
    const client = project?.clientId ? await ctx.db.get(project.clientId) : null;

    // Calculate totalSeconds for the project (needed for budget calculations)
    let projectWithStats = null;
    if (project) {
      const entries = await ctx.db
        .query("timeEntries")
        .withIndex("byProject", (q) => q.eq("projectId", project._id))
        .filter((q) => q.eq(q.field("isOverrun"), false))
        .collect();

      const totalSeconds = entries.reduce((sum, entry) => {
        const seconds = entry.seconds || (entry.stoppedAt ? (entry.stoppedAt - entry.startedAt) / 1000 : 0);
        return sum + seconds;
      }, 0);

      const totalHours = totalSeconds / 3600;
      const totalAmount = totalHours * project.hourlyRate;

      let budgetRemaining = 0;
      let budgetRemainingFormatted = "N/A";

      if (project.budgetType === "hours" && project.budgetHours) {
        const budgetSeconds = project.budgetHours * 3600;
        budgetRemaining = Math.max(0, budgetSeconds - totalSeconds);
        const hoursRemaining = budgetRemaining / 3600;
        budgetRemainingFormatted = `${hoursRemaining.toFixed(1)} hours`;
      } else if (project.budgetType === "amount" && project.budgetAmount) {
        budgetRemaining = Math.max(0, project.budgetAmount - totalAmount);
        budgetRemainingFormatted = `$${budgetRemaining.toFixed(2)}`;
      }

      projectWithStats = {
        ...project,
        client,
        totalSeconds,
        totalHours,
        totalHoursFormatted: `${totalHours.toFixed(1)}h`,
        budgetRemaining,
        budgetRemainingFormatted,
      };
    }

    return {
      ...timer,
      project: projectWithStats,
    };
  },
});

/**
 * Start a timer for a project
 *
 * IMPORTANT: Timer Interrupts vs Pomodoro Mode
 * ============================================
 * The timer has TWO MUTUALLY EXCLUSIVE interruption systems:
 *
 * 1. **Standard Timer Interrupts** (default):
 *    - Prompts user at configured interval (e.g., 45 minutes)
 *    - Uses `settings.interruptInterval` and `settings.interruptEnabled`
 *    - Scheduled via `ctx.scheduler.runAt(nextInterruptAt, api.interrupts.check)`
 *    - User can choose to continue or stop when interrupted
 *
 * 2. **Pomodoro Mode**:
 *    - Work/break cycle system (default: 25 min work, 5 min break)
 *    - Uses `settings.pomodoroWorkMinutes` and `settings.pomodoroBreakMinutes`
 *    - Scheduled via `ctx.scheduler.runAt(pomodoroTransitionAt, api.timer.handlePomodoroTransition)`
 *    - Timer auto-transitions between work and break phases
 *
 * These systems CANNOT run simultaneously. If `pomodoroEnabled` is true,
 * standard interrupts are DISABLED (nextInterruptAt = undefined).
 */
export const start = mutation({
  args: {
    projectId: v.id("projects"),
    category: v.optional(v.string()),
    pomodoroEnabled: v.optional(v.boolean()),
    startedFrom: v.optional(v.union(v.literal("web"), v.literal("mobile"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to start a timer");
    }

    // Validate project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found. It may have been deleted. Please refresh and select a valid project.");
    }

    // Check if project is archived
    if (project.archived) {
      throw new Error("Cannot start timer for an archived project. Please unarchive the project first or select a different project.");
    }

    // Detect workspace type
    const isPersonal = isPersonalProject(project);
    let organizationId: Id<"organizations"> | undefined;

    if (isPersonal) {
      // Personal workspace - verify user owns the project
      if (project.ownerId !== userId) {
        throw new Error("You don't have permission to use this project. Please select one of your own projects.");
      }
      organizationId = undefined;
    } else {
      // Work workspace - verify organization membership
      const membership = await ensureMembership(ctx);
      if (project.organizationId !== membership.organizationId) {
        throw new Error("Project not found in your current workspace. Please switch workspaces or select a different project.");
      }
      organizationId = membership.organizationId;
    }

    // Get user settings for interrupt interval
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();

    const interruptInterval = settings?.interruptInterval ?? 60; // default 60 minutes
    const interruptEnabled = settings?.interruptEnabled ?? true;
    const pomodoroEnabledSetting = args.pomodoroEnabled ?? settings?.pomodoroEnabled ?? false;
    const pomodoroWorkMinutes = settings?.pomodoroWorkMinutes ?? 25;
    const pomodoroBreakMinutes = settings?.pomodoroBreakMinutes ?? 5;

    console.log(`⏱️ Timer Start - Settings loaded:`, {
      userId,
      projectId: args.projectId,
      interruptInterval,
      interruptEnabled,
      pomodoroEnabled: pomodoroEnabledSetting,
      pomodoroWorkMinutes,
      startedFrom: args.startedFrom || "unknown"
    });

    // Stop ALL existing timers for this user (both personal and work workspaces)
    // This ensures only one timer runs globally
    const existingTimer = await getRunningTimerForUser(ctx, userId, organizationId);
    if (existingTimer) {
      await stopInternal(ctx, organizationId, userId, "timer");
    }

    // Also check for timers in other workspaces
    const allUserTimers = await ctx.db
      .query("runningTimers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    for (const timer of allUserTimers) {
      if (timer._id !== existingTimer?._id) {
        await stopInternal(ctx, timer.organizationId, userId, "timer");
      }
    }

    const now = Date.now();
    // Don't schedule interrupts for Pomodoro timers - they have their own work/break transitions
    const nextInterruptAt = (interruptEnabled && !pomodoroEnabledSetting) ? now + (interruptInterval * 60 * 1000) : undefined;
    const pomodoroTransitionAt = pomodoroEnabledSetting ? now + pomodoroWorkMinutes * 60 * 1000 : undefined;

    if (pomodoroEnabledSetting) {
      console.log(`🍅 Pomodoro Mode - Interrupts DISABLED, using Pomodoro transitions instead`);
      console.log(`🍅 Next Pomodoro transition: ${new Date(pomodoroTransitionAt!).toISOString()} (in ${pomodoroWorkMinutes} minutes)`);
    } else if (interruptEnabled) {
      console.log(`⏰ Standard Mode - Interrupt scheduled at: ${new Date(nextInterruptAt!).toISOString()} (in ${interruptInterval} minutes)`);
    } else {
      console.log(`❌ Interrupts DISABLED - No interrupts will be scheduled`);
    }

    // Create running timer
    const timerId = await ctx.db.insert("runningTimers", {
      organizationId,
      userId,
      projectId: args.projectId,
      startedAt: now,
      lastHeartbeatAt: now,
      awaitingInterruptAck: false,
      nextInterruptAt,
      pomodoroEnabled: pomodoroEnabledSetting,
      pomodoroPhase: pomodoroEnabledSetting ? "work" : undefined,
      pomodoroTransitionAt,
      pomodoroWorkMinutes: pomodoroEnabledSetting ? pomodoroWorkMinutes : undefined,
      pomodoroBreakMinutes: pomodoroEnabledSetting ? pomodoroBreakMinutes : undefined,
      pomodoroCurrentCycle: pomodoroEnabledSetting ? 1 : undefined,
      pomodoroCompletedCycles: pomodoroEnabledSetting ? 0 : undefined,
      pomodoroSessionStartedAt: pomodoroEnabledSetting ? now : undefined,
      category: args.category,
      startedFrom: args.startedFrom,
    });

    // Schedule interrupt check if enabled
    if (nextInterruptAt) {
      console.log(`⏰ Scheduling interrupt at ${new Date(nextInterruptAt).toISOString()} (in ${interruptInterval} minutes)`);
      await ctx.scheduler.runAt(nextInterruptAt, api.interrupts.check, {
        organizationId,
        userId,
      });
    } else {
      console.log(`❌ No interrupt scheduled - interruptEnabled: ${interruptEnabled}`);
    }

    if (pomodoroEnabledSetting && pomodoroTransitionAt) {
      await ctx.scheduler.runAt(pomodoroTransitionAt, api.timer.handlePomodoroTransition, {
        timerId,
      });
    }

    // Create time entry
    await ctx.db.insert("timeEntries", {
      organizationId,
      userId,
      ownerId: isPersonal ? userId : undefined,
      projectId: args.projectId,
      startedAt: now,
      source: "timer",
      category: args.category,
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
    sourceOverride: v.optional(v.union(v.literal("manual"), v.literal("timer"), v.literal("autoStop"), v.literal("overrun"), v.literal("pomodoroBreak"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Try to find any running timer for this user (work or personal workspace)
    const membership = await maybeMembership(ctx);
    let organizationId = membership?.organizationId;
    let timer = await getRunningTimerForUser(ctx, userId, organizationId);

    // If no timer found in work workspace, try personal workspace
    if (!timer && organizationId !== undefined) {
      timer = await getRunningTimerForUser(ctx, userId, undefined);
      if (timer) {
        organizationId = undefined; // Use personal workspace
      }
    }

    if (!timer) {
      return { success: false, message: "No running timer" };
    }

    return await stopInternal(
      ctx,
      organizationId,
      userId,
      args.sourceOverride || "timer"
    );
  },
});

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Try to find any running timer for this user (work or personal workspace)
    const membership = await maybeMembership(ctx);
    let organizationId = membership?.organizationId;
    let timer = await getRunningTimerForUser(ctx, userId, organizationId);

    // If no timer found in work workspace, try personal workspace
    if (!timer && organizationId !== undefined) {
      timer = await getRunningTimerForUser(ctx, userId, undefined);
      if (timer) {
        organizationId = undefined; // Use personal workspace
      }
    }

    if (!timer) {
      return { success: false, message: "No running timer" };
    }

    // Find the active time entry - need to handle both personal and work workspaces
    const activeEntry = await ctx.db
      .query("timeEntries")
      .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
      .filter((q) => {
        if (organizationId) {
          // Work workspace
          return q.and(
            q.eq(q.field("organizationId"), organizationId),
            q.eq(q.field("userId"), userId),
            q.eq(q.field("stoppedAt"), undefined),
            q.eq(q.field("isOverrun"), false)
          );
        } else {
          // Personal workspace
          return q.and(
            q.eq(q.field("userId"), userId),
            q.eq(q.field("organizationId"), undefined),
            q.eq(q.field("stoppedAt"), undefined),
            q.eq(q.field("isOverrun"), false)
          );
        }
      })
      .first();

    // Delete the active time entry (don't save it)
    if (activeEntry) {
      await ctx.db.delete(activeEntry._id);
    }

    // Delete running timer
    await ctx.db.delete(timer._id);

    return { success: true };
  },
});

async function stopInternal(
  ctx: MutationCtx,
  organizationId: Id<"organizations"> | undefined,
  userId: Id<"users">,
  source: "manual" | "timer" | "autoStop" | "overrun" | "pomodoroBreak"
) {
  const timer = await getRunningTimerForUser(ctx, userId, organizationId);

  if (!timer) {
    return { success: false, message: "No running timer" };
  }

  const now = Date.now();

  // Find the active time entry - need to handle both personal and work workspaces
  const activeEntry = await ctx.db
    .query("timeEntries")
    .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
    .filter((q) => {
      if (organizationId) {
        // Work workspace
        return q.and(
          q.eq(q.field("organizationId"), organizationId),
          q.eq(q.field("userId"), userId),
          q.eq(q.field("stoppedAt"), undefined),
          q.eq(q.field("isOverrun"), false)
        );
      } else {
        // Personal workspace
        return q.and(
          q.eq(q.field("userId"), userId),
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
      source,
    });
  }

  // Patch the running timer with the endedAt timestamp
  await ctx.db.patch(timer._id, { endedAt: now });

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

    // Try to find any running timer for this user (work or personal workspace)
    const membership = await maybeMembership(ctx);
    let organizationId = membership?.organizationId;
    let timer = await getRunningTimerForUser(ctx, userId, organizationId);

    // If no timer found in work workspace, try personal workspace
    if (!timer && organizationId !== undefined) {
      timer = await getRunningTimerForUser(ctx, userId, undefined);
      if (timer) {
        organizationId = undefined; // Use personal workspace
      }
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Try to find any running timer for this user (work or personal workspace)
    const membership = await maybeMembership(ctx);
    let organizationId = membership?.organizationId;
    let timer = await getRunningTimerForUser(ctx, userId, organizationId);

    // If no timer found in work workspace, try personal workspace
    if (!timer && organizationId !== undefined) {
      timer = await getRunningTimerForUser(ctx, userId, undefined);
      if (timer) {
        organizationId = undefined; // Use personal workspace
      }
    }

    if (!timer) {
      return { shouldShowInterrupt: false };
    }

    await ctx.db.patch(timer._id, {
      awaitingInterruptAck: true,
      interruptShownAt: Date.now(),
    });

    // Schedule auto-stop after 60 seconds
    await ctx.scheduler.runAfter(60000, internal.timer.autoStopForMissedAck, {
      organizationId: organizationId,
      userId: userId,
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

    // Try to find timer in work workspace first
    const membership = await maybeMembership(ctx);
    let organizationId = membership?.organizationId;
    let timer = await getRunningTimerForUser(ctx, userId, organizationId);

    // If not found or not awaiting ack, try personal workspace
    if (!timer || !timer.awaitingInterruptAck) {
      const personalTimer = await getRunningTimerForUser(ctx, userId, undefined);
      if (personalTimer && personalTimer.awaitingInterruptAck) {
        timer = personalTimer;
        organizationId = undefined;
      }
    }

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

      console.log(`✅ Interrupt Acknowledged - User chose to CONTINUE`);
      console.log(`⏰ Rescheduling next interrupt at: ${nextInterruptAt ? new Date(nextInterruptAt).toISOString() : 'none'} (in ${interruptInterval} minutes)`);

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
      console.log(`🛑 Interrupt Acknowledged - User chose to STOP`);

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
          data: { projectId, organizationId },
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
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timer = await getRunningTimerForUser(ctx, args.userId, args.organizationId);

    if (!timer || !timer.awaitingInterruptAck || !timer.interruptShownAt) {
      return;
    }

    if (!timer.userId) {
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

export const handlePomodoroTransition = action({
  args: {
    timerId: v.id("runningTimers"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.timer.processPomodoroTransition, {
      timerId: args.timerId,
    });
  },
});

export const processPomodoroTransition = internalMutation({
  args: {
    timerId: v.id("runningTimers"),
  },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.timerId);
    if (!timer || !timer.pomodoroEnabled) {
      return;
    }

    if (!timer.userId) {
      return;
    }

    const organizationId = timer.organizationId;

    const project = await ctx.db.get(timer.projectId);
    const client = project?.clientId ? await ctx.db.get(project.clientId) : null;

    const now = Date.now();
    const workMinutes = timer.pomodoroWorkMinutes ?? 25;
    const breakMinutes = timer.pomodoroBreakMinutes ?? 5;

    let nextPhase: "work" | "break" = timer.pomodoroPhase === "break" ? "work" : "break";
    let nextTransitionAt: number | undefined = undefined;

    if (timer.pomodoroPhase === "break") {
      // Break finished - increment completed cycles
      const completedCycles = (timer.pomodoroCompletedCycles ?? 0) + 1;
      const isFullCycleComplete = completedCycles % 4 === 0; // Full Pomodoro cycle = 4 work sessions
      
      // Send appropriate notification
      await ctx.scheduler.runAfter(0, api.pushActions.sendTimerAlert, {
        userId: timer.userId,
        title: isFullCycleComplete ? "Pomodoro cycle complete! 🎉" : "Break complete",
        body: isFullCycleComplete 
          ? `Congratulations! You've completed ${completedCycles / 4} full Pomodoro cycle${completedCycles / 4 > 1 ? 's' : ''}. Ready for the next cycle?`
          : `Ready to get back to ${project?.name || 'work'}? Click to resume tracking.`,
        alertType: "break_complete",
        projectName: project?.name,
        clientName: client?.name,
        data: {
          projectId: project?._id,
          organizationId: timer.organizationId,
          pomodoroPhase: "work",
          timerId: timer._id,
          completedCycles,
          isFullCycleComplete,
        },
      });

      // Delete the break timer - user must manually restart
      await ctx.db.delete(timer._id);
    } else {
      // Work session finished - stop the work timer and start break timer
      
      // 1. Stop the current time entry
      const activeEntry = await ctx.db
        .query("timeEntries")
        .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
        .filter((q) => {
          if (organizationId) {
            // Work workspace
            return q.and(
              q.eq(q.field("organizationId"), organizationId),
              q.eq(q.field("userId"), timer.userId),
              q.eq(q.field("stoppedAt"), undefined),
              q.eq(q.field("isOverrun"), false)
            );
          } else {
            // Personal workspace
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
          source: "pomodoroBreak",
        });
      }

      // 2. Convert current timer to break timer  
      const currentCycle = timer.pomodoroCurrentCycle ?? 1;
      const isLongBreak = currentCycle % 4 === 0; // Every 4th work session gets a longer break
      const actualBreakMinutes = isLongBreak ? breakMinutes * 3 : breakMinutes; // 15min vs 5min
      const breakEndsAt = now + actualBreakMinutes * 60 * 1000;
      
      await ctx.db.patch(timer._id, {
        pomodoroPhase: "break",
        isBreakTimer: true,
        breakStartedAt: now,
        breakEndsAt,
        pomodoroTransitionAt: breakEndsAt,
        pomodoroCurrentCycle: currentCycle,
        // Store the actual break duration for this break
        pomodoroBreakMinutes: actualBreakMinutes,
        // Don't increment completed cycles until break is actually finished
      });

      // 3. Send break notification with contextual messaging
      
      await ctx.scheduler.runAfter(0, api.pushActions.sendTimerAlert, {
        userId: timer.userId,
        title: isLongBreak ? "🎉 Long break time!" : "☕ Break time!",
        body: isLongBreak 
          ? `Excellent work! You've completed ${currentCycle} work sessions. Take ${actualBreakMinutes} minutes for a well-deserved long break.`
          : `Great focus! Take ${breakMinutes} minutes to recharge. Step away from your screen, stretch, or grab some water.`,
        alertType: "break_start",
        projectName: project?.name,
        clientName: client?.name,
        data: {
          projectId: project?._id,
          organizationId: timer.organizationId,
          pomodoroPhase: "break",
          timerId: timer._id,
          breakMinutes: actualBreakMinutes,
          currentCycle,
          isLongBreak,
        },
      });

      // 4. Schedule break completion
      await ctx.scheduler.runAt(breakEndsAt, api.timer.handlePomodoroTransition, {
        timerId: timer._id,
      });
    }
  },
});

export const createManualEntry = mutation({
  args: {
    projectId: v.id("projects"),
    startedAt: v.number(),
    stoppedAt: v.number(),
    note: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Detect workspace type
    const isPersonal = isPersonalProject(project);
    let organizationId: Id<"organizations"> | undefined;

    if (isPersonal) {
      // Personal workspace - verify user owns the project
      if (project.ownerId !== userId) {
        throw new Error("Personal project not found");
      }
      organizationId = undefined;
    } else {
      // Work workspace - verify organization membership
      const membership = await ensureMembership(ctx);
      if (project.organizationId !== membership.organizationId) {
        throw new Error("Project not found");
      }
      organizationId = membership.organizationId;
    }

    // Validate time range
    if (args.stoppedAt <= args.startedAt) {
      throw new Error("End time must be after start time");
    }

    const seconds = Math.floor((args.stoppedAt - args.startedAt) / 1000);

    // Create time entry
    const entryId = await ctx.db.insert("timeEntries", {
      organizationId,
      userId,
      ownerId: isPersonal ? userId : undefined,
      projectId: args.projectId,
      startedAt: args.startedAt,
      stoppedAt: args.stoppedAt,
      seconds,
      source: "manual",
      note: args.note,
      category: args.category,
      isOverrun: false,
    });

    return { success: true, entryId, seconds };
  },
});

const BUDGET_WARNING_RESEND_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const BUDGET_OVERRUN_RESEND_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

async function maybeSendBudgetAlerts(ctx: MutationCtx, timer: Doc<"runningTimers">) {
  if (!timer.userId) {
    return;
  }

  const project = await ctx.db.get(timer.projectId);
  if (!project) {
    return;
  }

  // Verify workspace type matches
  const isPersonal = isPersonalProject(project);
  if (isPersonal && timer.organizationId !== undefined) {
    return; // Mismatch: personal project but work timer
  }
  if (!isPersonal && project.organizationId !== timer.organizationId) {
    return; // Mismatch: work project but wrong organization
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

  const client = project.clientId ? await ctx.db.get(project.clientId) : null;

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

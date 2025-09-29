import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const check = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log(`🔍 Checking interrupt for user ${args.userId} at ${new Date().toISOString()}`);
    const timer = await ctx.runMutation(internal.interrupts.getTimerForInterrupt, {
      organizationId: args.organizationId,
      userId: args.userId,
    });

    if (!timer) {
      console.log(`❌ No timer found for interrupt check`);
      return { action: "no_timer", graceJobScheduled: false, graceJobTime: null };
    }

    if (!timer.organizationId || !timer.userId) {
      // Legacy timer without organization linkage; skip until backfilled
      return { action: "legacy_timer", graceJobScheduled: false, graceJobTime: null };
    }

    // Check if timer is already awaiting interrupt acknowledgment
    if (timer.awaitingInterruptAck) {
      return { action: "skipped", graceJobScheduled: false, graceJobTime: null };
    }

    // Get user's grace period setting
    const userSettings = await ctx.runMutation(internal.interrupts.getUserSettings, {
      userId: args.userId,
    });
    const gracePeriodMs: number = (userSettings?.gracePeriod ?? 5) * 1000;

    // Check if user has been active (heartbeat within last 5 minutes)
    const now = Date.now();
    const heartbeatStale = now - timer.lastHeartbeatAt > 5 * 60 * 1000; // 5 minutes

    if (heartbeatStale) {
      // Timer is stale, auto-stop it
      await ctx.runMutation(internal.interrupts.autoStopStaleTimer, {
        organizationId: args.organizationId,
        userId: args.userId,
        timerId: timer._id,
      });
      return { action: "skipped", graceJobScheduled: false, graceJobTime: null };
    }

    // Trigger interruption prompt
    const interruptAt = now;
    console.log(`✅ Triggering interrupt - setting awaitingInterruptAck=true for timer ${timer._id}`);
    await ctx.runMutation(internal.interrupts.setAwaitingInterrupt, {
      organizationId: args.organizationId,
      userId: args.userId,
      timerId: timer._id,
      interruptAt,
    });

    // Send push notification for interrupt - IMMEDIATELY at interrupt time
    try {
      console.log(`🔔 Sending push notification for interrupt at ${new Date().toISOString()}`);
      
      // Get project and client info for notification
      const projectData = await ctx.runMutation(internal.interrupts.getProjectAndClientInfo, {
        projectId: timer.projectId,
      });
      
      const pushResult = await ctx.runAction(api.pushActions.sendTimerAlert, {
        userId: args.userId,
        title: "Timer Interruption",
        body: `Are you still working on ${projectData?.projectName || 'this project'}?`,
        alertType: "interrupt",
        projectName: projectData?.projectName,
        clientName: projectData?.clientName,
        data: { timerId: timer._id, projectId: timer.projectId, organizationId: timer.organizationId }
      });
      
      console.log(`📱 Push notification result:`, pushResult);
    } catch (error) {
      console.error("Failed to send interrupt push notification:", error);
      // Continue without failing the interrupt
    }

    // Schedule auto-stop if no acknowledgment after grace period
    const graceJobTime: number = interruptAt + gracePeriodMs;
    await ctx.scheduler.runAt(graceJobTime, api.interrupts.autoStopIfNoAck, {
      organizationId: timer.organizationId,
      userId: timer.userId,
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
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    interruptAt: v.number(),
  },
  handler: async (ctx, args): Promise<{
    action: "auto_stopped" | "already_acked" | "stale_job" | "legacy_timer";
    stoppedEntryId: Id<"timeEntries"> | null;
    overrunEntryId: Id<"timeEntries"> | null;
  }> => {
    const timer = await ctx.runMutation(internal.interrupts.getTimerForInterrupt, {
      organizationId: args.organizationId,
      userId: args.userId,
    });

    if (!timer) {
      return { action: "stale_job", stoppedEntryId: null, overrunEntryId: null };
    }

    if (!timer.organizationId || !timer.userId) {
      return { action: "legacy_timer", stoppedEntryId: null, overrunEntryId: null };
    }

    // Check if this is the right interrupt (not already acknowledged)
    if (!timer.awaitingInterruptAck || timer.interruptShownAt !== args.interruptAt) {
      return { action: "already_acked", stoppedEntryId: null, overrunEntryId: null };
    }

    // COMMENTED OUT: Auto-stop the timer and create overrun entry
    // const result = await ctx.runMutation(internal.interrupts.autoStopAndCreateOverrun, {
    //   userId: args.userId,
    //   timerId: timer._id,
    //   projectId: timer.projectId,
    // });

    // Just auto-stop the timer without creating overrun
    await ctx.runMutation(internal.interrupts.autoStopStaleTimer, {
      organizationId: args.organizationId,
      userId: args.userId,
      timerId: timer._id,
    });

    return {
      action: "auto_stopped",
      stoppedEntryId: null,
      overrunEntryId: null,
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

      if (!timer.organizationId || !timer.userId) {
        continue;
      }

      // Skip break timers - they don't need interruption checks
      if (timer.isBreakTimer) {
        continue;
      }

      // Check for stale timers (no heartbeat for 5+ minutes)
      const heartbeatStale = now - timer.lastHeartbeatAt > 5 * 60 * 1000;
      if (heartbeatStale) {
        await ctx.runMutation(internal.interrupts.autoStopStaleTimer, {
          organizationId: timer.organizationId,
          userId: timer.userId,
          timerId: timer._id,
        });
        staleTimersStopped++;
        continue;
      }

      // Check for timers awaiting interrupt ack for too long
      if (timer.awaitingInterruptAck && timer.interruptShownAt) {
        const userSettings = await ctx.runMutation(internal.interrupts.getUserSettings, {
          userId: timer.userId,
        });
        const gracePeriodMs: number = (userSettings?.gracePeriod ?? 5) * 1000;
        const timeSinceInterrupt = now - timer.interruptShownAt;
        if (timeSinceInterrupt > gracePeriodMs) {
          // COMMENTED OUT: Create overrun entry
          // await ctx.runMutation(internal.interrupts.autoStopAndCreateOverrun, {
          //   organizationId: timer.organizationId,
          //   userId: timer.userId,
          //   timerId: timer._id,
          //   projectId: timer.projectId,
          // });
          await ctx.runMutation(internal.interrupts.autoStopStaleTimer, {
            organizationId: timer.organizationId,
            userId: timer.userId,
            timerId: timer._id,
          });
          autoStoppedTimers++;
          continue;
        }
      }

      // Check for missed interruptions
      if (timer.nextInterruptAt && now >= timer.nextInterruptAt && !timer.awaitingInterruptAck) {
        const interruptAt = now;
        await ctx.runMutation(internal.interrupts.setAwaitingInterrupt, {
          organizationId: timer.organizationId,
          userId: timer.userId,
          timerId: timer._id,
          interruptAt,
        });

        // Send push notification for missed interrupt
        try {
          const projectData = await ctx.runMutation(internal.interrupts.getProjectAndClientInfo, {
            projectId: timer.projectId,
          });
          
          await ctx.runAction(api.pushActions.sendTimerAlert, {
            userId: timer.userId,
            title: "Timer Interruption",
            body: `Are you still working on ${projectData?.projectName || 'this project'}?`,
            alertType: "interrupt",
            projectName: projectData?.projectName,
            clientName: projectData?.clientName,
            data: { timerId: timer._id, projectId: timer.projectId, organizationId: timer.organizationId }
          });
        } catch (error) {
          console.error("Failed to send missed interrupt push notification:", error);
        }

        // Get user's grace period setting
        const userSettings = await ctx.runMutation(internal.interrupts.getUserSettings, {
          userId: timer.userId,
        });
        const gracePeriodMs: number = (userSettings?.gracePeriod ?? 5) * 1000;

        // Schedule auto-stop
        await ctx.scheduler.runAt(interruptAt + gracePeriodMs, api.interrupts.autoStopIfNoAck, {
          organizationId: timer.organizationId,
          userId: timer.userId,
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
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("runningTimers")
      .withIndex("byOrgUser", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
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
    organizationId: v.id("organizations"),
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
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    timerId: v.id("runningTimers"),
  },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.timerId);
    if (!timer) return;

    if (!timer.organizationId || !timer.userId) {
      return;
    }

    const now = Date.now();

    // Find the active time entry
    const activeEntry = await ctx.db
      .query("timeEntries")
      .withIndex("byProject", (q) => q.eq("projectId", timer.projectId))
      .filter((q) => q.and(
        q.eq(q.field("organizationId"), args.organizationId),
        q.eq(q.field("userId"), args.userId),
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

// COMMENTED OUT: Auto-stop and create overrun functionality
// export const autoStopAndCreateOverrun = internalMutation({
//   args: {
//     userId: v.id("users"),
//     timerId: v.id("runningTimers"),
//     projectId: v.id("projects"),
//   },
//   handler: async (ctx, args) => {
//     const now = Date.now();

//     // Find the active time entry
//     const activeEntry = await ctx.db
//       .query("timeEntries")
//       .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
//       .filter((q) => q.and(
//         q.eq(q.field("ownerId"), args.userId),
//         q.eq(q.field("stoppedAt"), undefined),
//         q.eq(q.field("isOverrun"), false)
//       ))
//       .first();

//     let stoppedEntryId: Id<"timeEntries"> | null = null;

//     if (activeEntry) {
//       const seconds = Math.floor((now - activeEntry.startedAt) / 1000);
//       await ctx.db.patch(activeEntry._id, {
//         stoppedAt: now,
//         seconds,
//         source: "autoStop",
//       });
//       stoppedEntryId = activeEntry._id;
//     }

//     // Create overrun placeholder
//     const overrunEntryId = await ctx.db.insert("timeEntries", {
//       ownerId: args.userId,
//       projectId: args.projectId,
//       startedAt: now,
//       source: "overrun",
//       isOverrun: true,
//       note: "Overrun placeholder - merge if you were still working",
//     });

//     // Delete running timer
//     await ctx.db.delete(args.timerId);

//     return { stoppedEntryId, overrunEntryId };
//   },
// });

export const getUserSettings = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getProjectAndClientInfo = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    const client = project.clientId ? await ctx.db.get(project.clientId) : null;
    
    return {
      projectName: project.name,
      clientName: client?.name,
    };
  },
});

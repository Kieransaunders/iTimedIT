import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { ensureMembership, maybeMembership } from "./orgContext";

export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    try {
      const membership = await maybeMembership(ctx);
      if (!membership) {
        return { page: [], isDone: true, continueCursor: "" };
      }
      const { organizationId, userId } = membership;

      // Defensive check: ensure we have valid IDs
      if (!organizationId || !userId) {
        return { page: [], isDone: true, continueCursor: "" };
      }

      let entriesQuery;

      const projectId = args.projectId;

      if (projectId) {
        const project = await ctx.db.get(projectId);
        if (!project || project.organizationId !== organizationId) {
          // Project not found or doesn't belong to current organization
          // Return empty result instead of throwing error (handles workspace switching gracefully)
          return { page: [], isDone: true, continueCursor: "" };
        }

        entriesQuery = ctx.db
          .query("timeEntries")
          .withIndex("byProject", (q) => q.eq("projectId", projectId))
          .filter((q) => q.eq(q.field("userId"), userId));
      } else {
        entriesQuery = ctx.db
          .query("timeEntries")
          .withIndex("byUserStarted", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("organizationId"), organizationId));
      }

      const result = await entriesQuery
        .order("desc")
        .paginate(args.paginationOpts);

      const entriesWithProjects = await Promise.all(
        result.page.map(async (entry) => {
          try {
            const project = await ctx.db.get(entry.projectId);
            const client = project?.clientId ? await ctx.db.get(project.clientId) : null;
            return {
              ...entry,
              project,
              client,
            };
          } catch (error) {
            // If fetching project/client fails, return entry without them
            console.error("Error fetching project/client for entry:", entry._id, error);
            return {
              ...entry,
              project: null,
              client: null,
            };
          }
        })
      );

      return {
        ...result,
        page: entriesWithProjects,
      };
    } catch (error: any) {
      // Catch-all for any unexpected errors during workspace transitions
      // InvalidCursor errors are expected when switching workspaces - handle gracefully
      if (error?.data?.paginationError === 'InvalidCursor') {
        // This is normal during workspace switches - return empty result silently
        return { page: [], isDone: true, continueCursor: "" };
      }
      // Log other unexpected errors for debugging
      console.error("Error in entries.list query:", error);
      return { page: [], isDone: true, continueCursor: "" };
    }
  },
});

export const edit = mutation({
  args: {
    id: v.id("timeEntries"),
    startedAt: v.optional(v.number()),
    stoppedAt: v.optional(v.number()),
    seconds: v.optional(v.number()),
    note: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await ensureMembership(ctx);

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.organizationId !== organizationId || entry.userId !== userId) {
      throw new Error("Entry not found");
    }

    const updates: any = {};

    if (args.startedAt !== undefined) {
      updates.startedAt = args.startedAt;
    }
    if (args.stoppedAt !== undefined) {
      updates.stoppedAt = args.stoppedAt;
    }
    if (args.note !== undefined) {
      updates.note = args.note;
    }
    if (args.category !== undefined) {
      updates.category = args.category;
    }

    // Recompute seconds if times changed
    if (args.startedAt !== undefined || args.stoppedAt !== undefined) {
      const startedAt = args.startedAt ?? entry.startedAt;
      const stoppedAt = args.stoppedAt ?? entry.stoppedAt;
      
      if (stoppedAt) {
        updates.seconds = Math.floor((stoppedAt - startedAt) / 1000);
      }
    } else if (args.seconds !== undefined) {
      updates.seconds = args.seconds;
    }

    await ctx.db.patch(args.id, updates);
  },
});

// COMMENTED OUT: Overrun merge functionality
// export const mergeOverrun = mutation({
//   args: {
//     overrunId: v.id("timeEntries"),
//     intoEntryId: v.id("timeEntries"),
//   },
//   handler: async (ctx, args) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) {
//       throw new Error("Not authenticated");
//     }

//     const overrunEntry = await ctx.db.get(args.overrunId);
//     const targetEntry = await ctx.db.get(args.intoEntryId);

//     if (!overrunEntry || !targetEntry || 
//         overrunEntry.ownerId !== userId || 
//         targetEntry.ownerId !== userId) {
//       throw new Error("Entries not found");
//     }

//     if (!overrunEntry.isOverrun) {
//       throw new Error("Source entry is not an overrun");
//     }

//     // Calculate overrun seconds (from creation to now if still running)
//     const overrunSeconds = overrunEntry.stoppedAt 
//       ? (overrunEntry.stoppedAt - overrunEntry.startedAt) / 1000
//       : (Date.now() - overrunEntry.startedAt) / 1000;

//     // Add to target entry
//     const currentSeconds = targetEntry.seconds || 0;
//     await ctx.db.patch(args.intoEntryId, {
//       seconds: currentSeconds + Math.floor(overrunSeconds),
//     });

//     // Delete overrun entry
//     await ctx.db.delete(args.overrunId);
//   },
// });

export const deleteEntry = mutation({
  args: {
    id: v.id("timeEntries"),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await ensureMembership(ctx);

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.organizationId !== organizationId || entry.userId !== userId) {
      throw new Error("Entry not found");
    }

    await ctx.db.delete(args.id);
  },
});

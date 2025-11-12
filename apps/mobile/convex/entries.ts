import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { ensureMembership, maybeMembership } from "./orgContext";
import type { Id } from "./_generated/dataModel";

export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
    paginationOpts: paginationOptsValidator,
    viewMode: v.optional(v.union(v.literal("personal"), v.literal("team"))),
    filterUserId: v.optional(v.id("users")),
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

      const viewMode = args.viewMode || "personal";
      const isTeamView = viewMode === "team";

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
          .withIndex("byProject", (q) => q.eq("projectId", projectId));

        // Apply user filter based on view mode
        if (isTeamView && args.filterUserId) {
          entriesQuery = entriesQuery.filter((q) => q.eq(q.field("userId"), args.filterUserId));
        } else if (!isTeamView) {
          entriesQuery = entriesQuery.filter((q) => q.eq(q.field("userId"), userId));
        }
      } else {
        if (isTeamView) {
          // Team view: fetch all org entries, optionally filtered by user
          entriesQuery = ctx.db
            .query("timeEntries")
            .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId));

          if (args.filterUserId) {
            entriesQuery = entriesQuery.filter((q) => q.eq(q.field("userId"), args.filterUserId));
          }
        } else {
          // Personal view: only current user's entries
          entriesQuery = ctx.db
            .query("timeEntries")
            .withIndex("byUserStarted", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("organizationId"), organizationId));
        }
      }

      const result = await entriesQuery
        .order("desc")
        .paginate(args.paginationOpts);

      const entriesWithProjects = await Promise.all(
        result.page.map(async (entry) => {
          try {
            const project = await ctx.db.get(entry.projectId);
            const client = project?.clientId ? await ctx.db.get(project.clientId) : null;
            const user = entry.userId ? await ctx.db.get(entry.userId) : null;
            return {
              ...entry,
              project,
              client,
              user: user ? { _id: user._id, name: user.name, email: user.email } : null,
            };
          } catch (error) {
            // If fetching project/client/user fails, return entry without them
            console.error("Error fetching project/client/user for entry:", entry._id, error);
            return {
              ...entry,
              project: null,
              client: null,
              user: null,
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

export const getMostActiveMembers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await maybeMembership(ctx);
    if (!membership) {
      return [];
    }
    const { organizationId } = membership;

    const limit = args.limit || 3;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Fetch all entries from the last 7 days for this organization
    const recentEntries = await ctx.db
      .query("timeEntries")
      .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.gte(q.field("startedAt"), sevenDaysAgo))
      .collect();

    // Aggregate seconds by userId
    const userTotals = new Map<Id<"users">, number>();
    for (const entry of recentEntries) {
      if (entry.userId && entry.seconds) {
        const current = userTotals.get(entry.userId) || 0;
        userTotals.set(entry.userId, current + entry.seconds);
      }
    }

    // Convert to array and sort by total seconds descending
    const sortedUsers = Array.from(userTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    // Fetch user details
    const result = await Promise.all(
      sortedUsers.map(async ([userId, totalSeconds]) => {
        const user = await ctx.db.get(userId);
        return {
          userId,
          name: user?.name || "Unknown",
          email: user?.email,
          totalSeconds,
        };
      })
    );

    return result;
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

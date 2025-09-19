import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let query;
    
    if (args.projectId) {
      const projectId = args.projectId;
      query = ctx.db
        .query("timeEntries")
        .withIndex("byProject", (q) => q.eq("projectId", projectId))
        .filter((q) => q.eq(q.field("ownerId"), userId));
    } else {
      query = ctx.db
        .query("timeEntries")
        .withIndex("byOwnerStarted", (q) => q.eq("ownerId", userId));
    }

    const result = await query
      .order("desc")
      .paginate(args.paginationOpts);

    const entriesWithProjects = await Promise.all(
      result.page.map(async (entry) => {
        const project = await ctx.db.get(entry.projectId);
        const client = project ? await ctx.db.get(project.clientId) : null;
        return {
          ...entry,
          project,
          client,
        };
      })
    );

    return {
      ...result,
      page: entriesWithProjects,
    };
  },
});

export const edit = mutation({
  args: {
    id: v.id("timeEntries"),
    startedAt: v.optional(v.number()),
    stoppedAt: v.optional(v.number()),
    seconds: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.ownerId !== userId) {
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

export const mergeOverrun = mutation({
  args: {
    overrunId: v.id("timeEntries"),
    intoEntryId: v.id("timeEntries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const overrunEntry = await ctx.db.get(args.overrunId);
    const targetEntry = await ctx.db.get(args.intoEntryId);

    if (!overrunEntry || !targetEntry || 
        overrunEntry.ownerId !== userId || 
        targetEntry.ownerId !== userId) {
      throw new Error("Entries not found");
    }

    if (!overrunEntry.isOverrun) {
      throw new Error("Source entry is not an overrun");
    }

    // Calculate overrun seconds (from creation to now if still running)
    const overrunSeconds = overrunEntry.stoppedAt 
      ? (overrunEntry.stoppedAt - overrunEntry.startedAt) / 1000
      : (Date.now() - overrunEntry.startedAt) / 1000;

    // Add to target entry
    const currentSeconds = targetEntry.seconds || 0;
    await ctx.db.patch(args.intoEntryId, {
      seconds: currentSeconds + Math.floor(overrunSeconds),
    });

    // Delete overrun entry
    await ctx.db.delete(args.overrunId);
  },
});

export const deleteEntry = mutation({
  args: {
    id: v.id("timeEntries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.ownerId !== userId) {
      throw new Error("Entry not found");
    }

    await ctx.db.delete(args.id);
  },
});

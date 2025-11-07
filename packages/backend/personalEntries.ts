import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listPersonal = query({
  args: {
    projectId: v.optional(v.id("projects")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let entriesQuery;

    const projectId = args.projectId;

    if (projectId) {
      const project = await ctx.db.get(projectId);
      if (!project || project.ownerId !== userId || project.workspaceType !== "personal") {
        throw new Error("Personal project not found");
      }

      entriesQuery = ctx.db
        .query("timeEntries")
        .withIndex("byProject", (q) => q.eq("projectId", projectId))
        .filter((q) => q.eq(q.field("userId"), userId));
    } else {
      entriesQuery = ctx.db
        .query("timeEntries")
        .withIndex("byUserStarted", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("organizationId"), undefined));
    }

    const result = await entriesQuery
      .order("desc")
      .paginate(args.paginationOpts);

    const entriesWithProjects = await Promise.all(
      result.page.map(async (entry) => {
        const project = await ctx.db.get(entry.projectId);
        const client = project?.clientId ? await ctx.db.get(project.clientId) : null;
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

export const editPersonal = mutation({
  args: {
    id: v.id("timeEntries"),
    startedAt: v.optional(v.number()),
    stoppedAt: v.optional(v.number()),
    seconds: v.optional(v.number()),
    note: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.organizationId !== undefined || entry.userId !== userId) {
      throw new Error("Personal entry not found");
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

export const deletePersonalEntry = mutation({
  args: {
    id: v.id("timeEntries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.organizationId !== undefined || entry.userId !== userId) {
      throw new Error("Personal entry not found");
    }

    await ctx.db.delete(args.id);
  },
});

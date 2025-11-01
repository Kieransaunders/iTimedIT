import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ensureMembership, maybeMembership } from "./orgContext";

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const membership = await maybeMembership(ctx);
    
    if (!membership) {
      return [];
    }
    
    const categories = await ctx.db
      .query("categories")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", membership.organizationId)
      )
      .collect();
    
    return categories.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const membership = await ensureMembership(ctx);
    const { organizationId, userId } = membership;
    const now = Date.now();

    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("categories")
        .withIndex("byOrganization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      for (const category of existingDefaults) {
        await ctx.db.patch(category._id, { isDefault: false, updatedAt: now });
      }
    }

    const categoryId = await ctx.db.insert("categories", {
      organizationId,
      userId,
      name: args.name,
      color: args.color,
      isDefault: args.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return categoryId;
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const membership = await ensureMembership(ctx);
    const { organizationId } = membership;
    const now = Date.now();

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.organizationId !== organizationId) {
      throw new Error("Category not found");
    }

    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("categories")
        .withIndex("byOrganization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      for (const cat of existingDefaults) {
        await ctx.db.patch(cat._id, { isDefault: false, updatedAt: now });
      }
    }

    const updates: any = { updatedAt: now };
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;
    if (args.isDefault !== undefined) updates.isDefault = args.isDefault;

    await ctx.db.patch(args.categoryId, updates);
  },
});

export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const membership = await ensureMembership(ctx);
    const { organizationId } = membership;

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.organizationId !== organizationId) {
      throw new Error("Category not found");
    }

    // Check if category is in use by any time entries
    const entriesUsingCategory = await ctx.db
      .query("timeEntries")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .filter((q) => q.eq(q.field("category"), category.name))
      .collect();

    if (entriesUsingCategory.length > 0) {
      throw new Error(
        `Cannot delete category "${category.name}" because it is used by ${entriesUsingCategory.length} time ${entriesUsingCategory.length === 1 ? "entry" : "entries"}.`
      );
    }

    await ctx.db.delete(args.categoryId);
  },
});

export const initializeDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const membership = await ensureMembership(ctx);
    const { organizationId, userId } = membership;
    
    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    if (existingCategories.length === 0) {
      const now = Date.now();

      // Only create the General category by default
      await ctx.db.insert("categories", {
        organizationId,
        userId,
        name: "General",
        color: "#8b5cf6",
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
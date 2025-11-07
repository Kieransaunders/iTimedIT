import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Backfill color field for existing organizations
 * Run this once after deploying the new schema
 */
export const backfillOrganizationColors = internalMutation({
  args: {},
  handler: async (ctx) => {
    const organizations = await ctx.db.query("organizations").collect();

    let updated = 0;
    const defaultColor = "#8b5cf6"; // Lavender purple

    for (const org of organizations) {
      if (!org.color) {
        await ctx.db.patch(org._id, { color: defaultColor });
        updated++;
      }
    }

    return {
      success: true,
      totalOrganizations: organizations.length,
      updated,
      message: `Added default color to ${updated} organizations`,
    };
  },
});

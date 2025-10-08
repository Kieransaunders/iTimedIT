import { internalMutation } from "./_generated/server";
import type { TableNames } from "./_generated/dataModel";

const TABLES_TO_WIPE: TableNames[] = [
  "organizations",
  "memberships",
  "invitations",
  "clients",
  "projects",
  "timeEntries",
  "runningTimers",
  "userSettings",
  "imports",
  "users",
  "authSessions",
  "authAccounts",
  "authRefreshTokens",
  "authVerificationCodes",
  "authVerifiers",
  "authRateLimits",
];

export const wipeTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const deletedCounts: Record<string, number> = {};

    for (const table of TABLES_TO_WIPE) {
      const documents = await ctx.db.query(table).collect();
      for (const doc of documents) {
        await ctx.db.delete(doc._id);
      }
      if (documents.length > 0) {
        deletedCounts[table] = documents.length;
      }
    }

    return { deletedCounts };
  },
});

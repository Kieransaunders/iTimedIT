import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log("loggedInUser query - userId:", userId);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    console.log("loggedInUser query - user:", user);
    if (!user) {
      return null;
    }
    return user;
  },
});

export const debugAuth = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return {
      userId,
      hasUser: userId ? !!(await ctx.db.get(userId)) : false,
      timestamp: Date.now()
    };
  },
});

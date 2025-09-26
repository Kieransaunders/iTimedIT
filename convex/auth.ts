import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";
import { query } from "./_generated/server";
import { v } from "convex/values";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const providers = [
  Password,
  Anonymous,
  ...(googleClientId && googleClientSecret
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : []),
];

if (!googleClientId || !googleClientSecret) {
  console.warn("Google OAuth environment variables are not set; Google sign-in is disabled.");
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});

export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
      isAnonymous: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

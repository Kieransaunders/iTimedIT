import {
  convexAuth,
  getAuthUserId,
  type AuthProviderMaterializedConfig,
} from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";
import { query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : undefined;

type UserPatch = Partial<Omit<Doc<"users">, "_id" | "_creationTime">>;

const passwordProvider = Password({
  profile: (params) => {
    const normalizedEmail = normalizeEmail(params.email);
    if (!normalizedEmail) {
      throw new Error("Email is required");
    }
    return { email: normalizedEmail };
  },
});

const resolveEmailVerified = (
  provider: AuthProviderMaterializedConfig,
  type: "oauth" | "credentials" | "email" | "phone" | "verification",
  profile: { emailVerified?: unknown }
) => {
  if (profile.emailVerified === true) {
    return true;
  }

  if (profile.emailVerified === false) {
    return false;
  }

  return (
    type === "oauth" &&
    provider.type === "oauth" &&
    provider.allowDangerousEmailAccountLinking !== false
  );
};

const extractUserPatch = (
  provider: AuthProviderMaterializedConfig,
  type: "oauth" | "credentials" | "email" | "phone" | "verification",
  profile: Record<string, unknown>
): UserPatch => {
  const email = normalizeEmail(profile.email);
  const patch: UserPatch = {};

  if (typeof profile.name === "string" && profile.name.trim().length > 0) {
    patch.name = profile.name;
  }

  if (email) {
    patch.email = email;
  }

  if (typeof profile.image === "string" && profile.image.trim().length > 0) {
    patch.image = profile.image;
  }

  if (typeof profile.phone === "string" && profile.phone.trim().length > 0) {
    patch.phone = profile.phone;
  }

  if (email && resolveEmailVerified(provider, type, profile)) {
    patch.emailVerificationTime = Date.now();
  }

  return patch;
};

const findExistingUserIdByEmail = async (
  ctx: MutationCtx,
  email: string
): Promise<Id<"users"> | null> => {
  const existingUser = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();

  if (existingUser) {
    return existingUser._id;
  }

  const passwordAccount = await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", "password").eq("providerAccountId", email)
    )
    .unique();

  return passwordAccount ? (passwordAccount.userId as Id<"users">) : null;
};

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

const providers = [
  passwordProvider,
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
  callbacks: {
    createOrUpdateUser: async (ctx, args) => {
      const patch = extractUserPatch(args.provider, args.type, args.profile);

      let userId = args.existingUserId as Id<"users"> | null;
      if (userId === null) {
        const email = patch.email;
        if (email) {
          userId = await findExistingUserIdByEmail(ctx, email);
        }
      }

      if (userId !== null) {
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(userId, patch);
        }
        return userId;
      }

      return await ctx.db.insert("users", patch);
    },
  },
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
      emailVerificationTime: v.optional(v.number()),
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

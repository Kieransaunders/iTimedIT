import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { MembershipRole } from "../../convex/orgContext";
import type { Id } from "../../convex/_generated/dataModel";
import * as OrgContext from "../../convex/orgContext";
import * as Auth from "@convex-dev/auth/server";

type MockQueryResult = {
  collect: () => Promise<any[]>;
  first: () => Promise<any | null>;
  unique: () => Promise<any | null>;
};

const userId = "user_1" as Id<"users">;
const organizationId = "organization_1" as Id<"organizations">;

const buildMembershipDoc = (role: MembershipRole) => ({
  _id: "membership_1" as Id<"memberships">,
  organizationId,
  userId,
  role,
  invitedBy: undefined,
  createdAt: 0,
  inactiveAt: undefined,
});

const userSettingsDoc = {
  _id: "settings_1" as Id<"userSettings">,
  userId,
  organizationId,
  interruptEnabled: true,
  interruptInterval: 60,
  gracePeriod: 5,
  budgetWarningEnabled: true,
  budgetWarningThresholdHours: 1,
  budgetWarningThresholdAmount: 50,
};

const buildCtx = (role: MembershipRole) => {
  const membershipDoc = buildMembershipDoc(role);

  const membershipQuery = {
    collect: async () => [membershipDoc],
    first: async () => membershipDoc,
    unique: async () => null,
  } satisfies MockQueryResult;

  const userSettingsQuery = {
    collect: async () => [],
    first: async () => null,
    unique: async () => userSettingsDoc,
  } satisfies MockQueryResult;

  const query = jest.fn((table: string) => {
    if (table === "memberships") {
      return {
        withIndex: () => ({
          filter: () => membershipQuery,
        }),
      };
    }
    if (table === "userSettings") {
      return {
        withIndex: () => ({
          unique: userSettingsQuery.unique,
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    db: {
      query,
      insert: jest.fn(),
      patch: jest.fn(),
    },
  } as any;
};

describe("orgContext role helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("requireMembershipWithRole", () => {
    it("returns membership when role is allowed", async () => {
      jest.spyOn(Auth, "getAuthUserId").mockResolvedValue(userId);
      const ctx = buildCtx("admin");

      const result = await OrgContext.requireMembershipWithRole(ctx, ["owner", "admin"]);

      expect(result.role).toBe("admin");
      expect(Auth.getAuthUserId).toHaveBeenCalledTimes(1);
    });

    it("throws when membership role is not permitted", async () => {
      jest.spyOn(Auth, "getAuthUserId").mockResolvedValue(userId);
      const ctx = buildCtx("member");

      await expect(
        OrgContext.requireMembershipWithRole(ctx, ["owner"])
      ).rejects.toThrow("Insufficient permissions");
    });
  });

  describe("ensureMembershipWithRole", () => {
    it("returns membership when ensureMembership succeeds and role is allowed", async () => {
      jest.spyOn(Auth, "getAuthUserId").mockResolvedValue(userId);
      const ctx = buildCtx("owner");

      const result = await OrgContext.ensureMembershipWithRole(ctx, ["owner", "admin"]);

      expect(result.role).toBe("owner");
      expect(ctx.db.insert).not.toHaveBeenCalled();
    });

    it("throws when ensureMembership returns disallowed role", async () => {
      jest.spyOn(Auth, "getAuthUserId").mockResolvedValue(userId);
      const ctx = buildCtx("member");

      await expect(
        OrgContext.ensureMembershipWithRole(ctx, ["owner"])
      ).rejects.toThrow("Insufficient permissions");
    });
  });
});

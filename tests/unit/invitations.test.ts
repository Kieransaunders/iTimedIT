import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  deriveInvitationStatus,
  normalizeInvitationEmail,
} from "../../convex/invitationsHelpers";
import type { Doc, Id } from "../../convex/_generated/dataModel";

describe("invitation helpers", () => {
  const baseInvitation: Doc<"invitations"> = {
    _id: "inv_1" as Id<"invitations">,
    _creationTime: Date.now(),
    organizationId: "org_1" as Id<"organizations">,
    email: "Test@Example.com",
    role: "member",
    token: "token",
    status: "pending",
    invitedBy: "user_1" as Id<"users">,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
  };

  describe("normalizeEmail", () => {
    it("lowercases and trims whitespace", () => {
      expect(normalizeInvitationEmail("  Hello@Example.COM  ")).toBe("hello@example.com");
    });
  });

  describe("deriveStatus", () => {
    const nowSpy = jest.spyOn(Date, "now");

    beforeEach(() => {
      nowSpy.mockReturnValue(1_000_000);
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    it("returns pending when invite has not expired", () => {
      const result = deriveInvitationStatus({
        ...baseInvitation,
        expiresAt: 1_000_000 + 60_000,
      });

      expect(result.effectiveStatus).toBe("pending");
    });

    it("returns expired when invite is past expiry", () => {
      const result = deriveInvitationStatus({
        ...baseInvitation,
        expiresAt: 900_000,
      });

      expect(result.effectiveStatus).toBe("expired");
    });

    it("preserves non-pending statuses", () => {
      const accepted = deriveInvitationStatus({
        ...baseInvitation,
        status: "accepted",
      });

      expect(accepted.effectiveStatus).toBe("accepted");
    });
  });
});

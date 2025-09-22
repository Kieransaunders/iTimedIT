import type { Doc } from "./_generated/dataModel";

export type InvitationStatus = Doc<"invitations">["status"];
export type InvitationWithDerivedStatus = Doc<"invitations"> & {
  effectiveStatus: InvitationStatus;
};

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function deriveInvitationStatus(
  invitation: Doc<"invitations">
): InvitationWithDerivedStatus {
  const expired =
    invitation.status === "pending" && invitation.expiresAt <= Date.now();

  return {
    ...invitation,
    effectiveStatus: expired ? "expired" : invitation.status,
  };
}

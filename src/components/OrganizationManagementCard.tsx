import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { notifyMutationError } from "../lib/notifyMutationError";
import { useOrganization } from "../lib/organization-context";
import { buildAppPath } from "../lib/basePath";

type MembershipRole = Doc<"memberships">["role"];

type MemberRow = {
  membership: Doc<"memberships">;
  user: Doc<"users"> | null;
};

type InvitationRow = Doc<"invitations"> & {
  effectiveStatus: Doc<"invitations">["status"];
};

const ROLE_OPTIONS: { value: MembershipRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

export function OrganizationManagementCard() {
  const { activeOrganization, activeRole, activeMembershipId } = useOrganization();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("member");
  const [isSending, setIsSending] = useState(false);
  const [invitationInProgress, setInvitationInProgress] = useState<Id<"invitations"> | null>(null);
  const [memberInProgress, setMemberInProgress] = useState<Id<"memberships"> | null>(null);

  const canManage = activeRole === "owner" || activeRole === "admin";
  const hasOrganization = Boolean(activeOrganization);
  const shouldLoadData = canManage && hasOrganization;

  const members = useQuery(
    api.organizations.listOrganizationMembers,
    shouldLoadData ? {} : "skip"
  ) as MemberRow[] | undefined;

  const invitations = useQuery(
    api.invitations.listForCurrentOrganization,
    shouldLoadData ? {} : "skip"
  ) as InvitationRow[] | undefined;

  const createInvitation = useMutation(api.invitations.create);
  const resendInvitation = useMutation(api.invitations.resend);
  const revokeInvitation = useMutation(api.invitations.revoke);
  const removeMember = useMutation(api.organizations.removeMember);

  const sortedMembers = useMemo(() => {
    if (!members) {
      return [] as MemberRow[];
    }

    const rank: Record<MembershipRole, number> = {
      owner: 0,
      admin: 1,
      member: 2,
    };

    return [...members].sort((a, b) => {
      const delta = rank[a.membership.role] - rank[b.membership.role];
      if (delta !== 0) {
        return delta;
      }
      const nameA = (a.user?.name ?? a.user?.email ?? "").toLowerCase();
      const nameB = (b.user?.name ?? b.user?.email ?? "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [members]);

  const sortedInvitations = useMemo(() => {
    if (!invitations) {
      return [] as InvitationRow[];
    }

    return [...invitations].sort((a, b) => b.createdAt - a.createdAt);
  }, [invitations]);

  if (!hasOrganization) {
    return null;
  }

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Team Management</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Only organization owners and admins can manage members and invitations.
        </p>
      </div>
    );
  }

  const isMembersLoading = members === undefined;
  const isInvitationsLoading = invitations === undefined;

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email address to send an invitation.");
      return;
    }

    try {
      setIsSending(true);
      await createInvitation({ email, role });
      setEmail("");
      setRole("member");
      toast.success("Invitation sent", {
        description: `${email} will receive an invitation to join ${activeOrganization?.name ?? "this organization"}.`,
      });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to send invitation. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (invitationId: Id<"invitations">) => {
    try {
      setInvitationInProgress(invitationId);
      await resendInvitation({ invitationId });
      toast.success("Invitation refreshed", {
        description: "A new invitation link has been generated.",
      });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to resend the invitation.",
      });
    } finally {
      setInvitationInProgress(null);
    }
  };

  const handleRevoke = async (invitationId: Id<"invitations">) => {
    try {
      setInvitationInProgress(invitationId);
      await revokeInvitation({ invitationId });
      toast.success("Invitation revoked");
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to revoke the invitation.",
      });
    } finally {
      setInvitationInProgress(null);
    }
  };

  const handleRemoveMember = async (
    membershipId: Id<"memberships">,
    displayName: string
  ) => {
    const confirmation = window.confirm(
      `Remove ${displayName} from ${activeOrganization?.name ?? "this organization"}?`
    );

    if (!confirmation) {
      return;
    }

    try {
      setMemberInProgress(membershipId);
      await removeMember({ membershipId });
      toast.success("Member removed", {
        description: `${displayName} no longer has access to ${activeOrganization?.name ?? "this organization"}.`,
      });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to remove the member. Please try again.",
      });
    } finally {
      setMemberInProgress(null);
    }
  };

  const copyInviteLink = async (token: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard is not available in this environment.");
      return;
    }

    const origin = window.location.origin;
    const path = buildAppPath(`/invite/${token}`);
    const link = new URL(path, origin).toString();

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invitation link copied to clipboard");
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to copy link to clipboard.",
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Team Members</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Manage who can access <strong>{activeOrganization?.name}</strong> and control their roles.
        </p>
        {isMembersLoading ? (
          <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded" />
        ) : sortedMembers.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No active members yet. Send an invitation to add your teammates.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedMembers.map(({ membership, user }) => {
              const displayName = user?.name ?? user?.email ?? "Member";
              const canRemove =
                membership._id !== activeMembershipId &&
                (membership.role !== "owner" || activeRole === "owner");

              return (
                <li key={membership._id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email ?? "Pending user setup"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100">
                      {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                    </span>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(membership._id, displayName)}
                        disabled={memberInProgress === membership._id}
                        className="text-red-600 hover:underline disabled:text-gray-400"
                      >
                        {memberInProgress === membership._id ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={handleInvite} className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-lg font-medium">Invite a teammate</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Send an invitation to collaborate on projects and track time together.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
              placeholder="teammate@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as MembershipRole)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSending}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSending ? "Sending..." : "Send Invitation"}
          </button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium mb-3">Pending invitations</h3>
        {isInvitationsLoading ? (
          <div className="animate-pulse h-20 bg-gray-100 dark:bg-gray-800 rounded" />
        ) : sortedInvitations.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            There are no outstanding invitations right now.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedInvitations.map((invitation) => {
                  const expiration = new Date(invitation.expiresAt);
                  const isActioning = invitationInProgress === invitation._id;
                  const isPending = invitation.effectiveStatus === "pending";
                  const isExpired = invitation.effectiveStatus === "expired";

                  return (
                    <tr key={invitation._id}>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">
                        {invitation.email}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300 capitalize">
                        {invitation.role}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " +
                            (isPending
                              ? "bg-green-100 text-green-800"
                              : isExpired
                              ? "bg-yellow-100 text-yellow-800"
                              : invitation.effectiveStatus === "revoked"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-blue-100 text-blue-800")
                          }
                        >
                          {invitation.effectiveStatus.charAt(0).toUpperCase() +
                            invitation.effectiveStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {expiration.toLocaleDateString()} {expiration.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap flex gap-2 justify-end text-sm">
                        <button
                          type="button"
                          onClick={() => copyInviteLink(invitation.token)}
                          className="text-primary hover:underline disabled:text-gray-400"
                          disabled={!isPending}
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResend(invitation._id)}
                          disabled={isActioning}
                          className="text-primary hover:underline disabled:text-gray-400"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(invitation._id)}
                          disabled={isActioning || !isPending}
                          className="text-red-600 hover:underline disabled:text-gray-400"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

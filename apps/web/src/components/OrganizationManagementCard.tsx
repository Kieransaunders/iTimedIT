import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { notifyMutationError } from "../lib/notifyMutationError";
import { useOrganization } from "../lib/organization-context";
import { buildAppPath } from "../lib/basePath";
import { ColorPicker } from "./ui/ColorPicker";
import { Crown, Shield, User, Mail, Calendar, Copy, RefreshCw, Trash2 } from "lucide-react";

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

function getRoleIcon(role: MembershipRole) {
  switch (role) {
    case "owner":
      return Crown;
    case "admin":
      return Shield;
    case "member":
      return User;
  }
}

function getRoleBadgeColors(role: MembershipRole) {
  switch (role) {
    case "owner":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "admin":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "member":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  }
}

function getUserInitials(user: Doc<"users"> | null): string {
  if (!user) return "?";
  if (user.name) {
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return "?";
}

export function OrganizationManagementCard() {
  const { activeOrganization, activeRole, activeMembershipId } = useOrganization();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("member");
  const [isSending, setIsSending] = useState(false);
  const [invitationInProgress, setInvitationInProgress] = useState<Id<"invitations"> | null>(null);
  const [memberInProgress, setMemberInProgress] = useState<Id<"memberships"> | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#8b5cf6");

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
  const updateWorkspaceSettings = useMutation(api.organizations.updateWorkspaceSettings);

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
        <h2 className="text-xl font-semibold mb-2">Work Management</h2>
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
    const path = buildAppPath(`/?token=${token}`);
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

  const handleUpdateSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Workspace name cannot be empty");
      return;
    }

    try {
      await updateWorkspaceSettings({ name: trimmed, color: newColor });
      toast.success("Workspace settings updated successfully");
      setIsEditingSettings(false);
      setNewName("");
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to update workspace settings. Please try again.",
      });
    }
  };

  const startEditSettings = () => {
    setNewName(activeOrganization?.name ?? "");
    setNewColor(activeOrganization?.color ?? "#8b5cf6");
    setIsEditingSettings(true);
  };

  const cancelEditSettings = () => {
    setIsEditingSettings(false);
    setNewName("");
    setNewColor("#8b5cf6");
  };

  const isPersonalWorkspace = activeOrganization?.isPersonalWorkspace === true;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6">
      {/* Workspace Settings Section */}
      <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold">Workspace Settings</h2>
        </div>
        {isEditingSettings ? (
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Workspace name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                placeholder="My Workspace"
                autoFocus
                maxLength={100}
              />
            </div>
            <ColorPicker
              value={newColor}
              onChange={setNewColor}
              label="Workspace color"
              helpText="Pick a color to help identify your workspace"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={cancelEditSettings}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: activeOrganization?.color ?? "#8b5cf6" }}
                title="Workspace color"
              />
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {activeOrganization?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={startEditSettings}
              className="text-sm text-primary hover:underline"
            >
              Edit workspace settings
            </button>
          </div>
        )}
      </div>

      {/* Work Members Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Work Members</h2>
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
              const initials = getUserInitials(user);
              const RoleIcon = getRoleIcon(membership.role);
              const roleBadgeColors = getRoleBadgeColors(membership.role);
              const canRemove =
                membership._id !== activeMembershipId &&
                (membership.role !== "owner" || activeRole === "owner");

              return (
                <li key={membership._id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {initials}
                    </div>

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email ?? "Pending user setup"}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge and Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeColors}`}>
                      <RoleIcon className="h-3 w-3" />
                      {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                    </span>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(membership._id, displayName)}
                        disabled={memberInProgress === membership._id}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                        title="Remove member"
                      >
                        {memberInProgress === membership._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Invitation Form - Hidden for Personal Workspaces */}
      {!isPersonalWorkspace && (
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
      )}

      {/* Pending Invitations - Hidden for Personal Workspaces */}
      {!isPersonalWorkspace && (
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
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => copyInviteLink(invitation.token)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                            disabled={!isPending}
                            title="Copy invitation link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResend(invitation._id)}
                            disabled={isActioning}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                            title="Resend invitation"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(invitation._id)}
                            disabled={isActioning || !isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                            title="Revoke invitation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

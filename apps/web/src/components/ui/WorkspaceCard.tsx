import type { Doc } from "../../../convex/_generated/dataModel";
import { Building2, Users, FolderKanban, Crown } from "lucide-react";

interface WorkspaceCardProps {
  organization: Doc<"organizations">;
  membership: Doc<"memberships">;
  isActive: boolean;
  projectCount?: number;
  memberCount?: number;
  onSwitch: () => void;
}

export function WorkspaceCard({
  organization,
  membership,
  isActive,
  projectCount = 0,
  memberCount = 1,
  onSwitch,
}: WorkspaceCardProps) {
  const workspaceColor = organization.color ?? "#8b5cf6";
  const isOwner = membership.role === "owner";
  const joinedAt = membership.createdAt
    ? new Date(membership.createdAt).toLocaleDateString()
    : null;

  return (
    <div
      className={`group relative bg-white dark:bg-gray-900/70 border rounded-xl shadow-sm overflow-hidden transition-all duration-200 ${
        isActive
          ? 'border-gray-400 dark:border-gray-600 ring-2 ring-primary ring-opacity-50'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
      }`}
    >
      {/* Color accent bar */}
      <div
        className="h-2"
        style={{ backgroundColor: workspaceColor }}
      />

      {/* Card content */}
      <div className="p-5">
        {/* Header with workspace name and role badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {organization.name}
              </h3>
            </div>
            {organization.isPersonalWorkspace && (
              <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                Personal Workspace
              </span>
            )}
          </div>
          {isOwner && (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <Crown className="h-3 w-3" />
                Owner
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <FolderKanban className="h-4 w-4" />
            <span>{projectCount} {projectCount === 1 ? 'project' : 'projects'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
          </div>
        </div>

        {/* Role and joined date */}
        {joinedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)} · Joined {joinedAt}
          </p>
        )}

        {/* Action button */}
        <div>
          {isActive ? (
            <div className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
              ✓ Active Workspace
            </div>
          ) : (
            <button
              type="button"
              onClick={onSwitch}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Switch to workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface CreateWorkspaceCardProps {
  onClick: () => void;
}

export function CreateWorkspaceCard({ onClick }: CreateWorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative bg-white dark:bg-gray-900/70 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-200 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-md h-full min-h-[240px] flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
        Create New Workspace
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-[200px]">
        Organize your projects and collaborate with your team
      </p>
    </button>
  );
}

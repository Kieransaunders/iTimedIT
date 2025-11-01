import type { Doc } from "../../convex/_generated/dataModel";
import { getUserDisplayName, getUserEmail, getUserInitials, isAnonymousUser } from "../lib/user-utils";
import { useOrganization } from "../lib/organization-context";
import { SignOutButton } from "../SignOutButton";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ColorPicker } from "./ui/ColorPicker";
import { DEFAULT_WORKSPACE_COLOR } from "../lib/workspace-colors";
import { WorkspaceCard, CreateWorkspaceCard } from "./ui/WorkspaceCard";
import { useQuery } from "convex/react";
import { Settings, LayoutDashboard, Calendar, Mail, User as UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

export type AppPage =
  | "timer"
  | "clients"
  | "projects"
  | "entries"
  | "categories"
  | "settings"
  | "profile"
  | "testEmail";

export function ProfilePage({
  user,
  onNavigate,
}: {
  user: Doc<"users">;
  onNavigate?: (page: AppPage, options?: { settingsTab?: "timer" | "notifications" | "budget" | "team" }) => void;
}) {
  const displayName = getUserDisplayName(user);
  const email = getUserEmail(user);
  const initials = getUserInitials(user);
  const anonymous = isAnonymousUser(user);
  const memberSince = new Date(user._creationTime).toLocaleDateString();
  const { memberships, activeMembershipId, switchOrganization } = useOrganization();

  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceColor, setWorkspaceColor] = useState(DEFAULT_WORKSPACE_COLOR);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const createWorkspace = useMutation(api.organizations.createWorkspace);

  // Get project counts for each workspace
  const allProjects = useQuery(api.projects.listAll, { includeArchived: false }) ?? [];

  // Reset form when dialog closes
  useEffect(() => {
    if (!showCreateForm) {
      setWorkspaceName("");
      setWorkspaceColor(DEFAULT_WORKSPACE_COLOR);
    }
  }, [showCreateForm]);

  const handleCreateWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = workspaceName.trim();
    if (!trimmedName) {
      toast.error("Workspace name cannot be empty");
      return;
    }

    try {
      setIsCreating(true);
      const result = await createWorkspace({ name: trimmedName, color: workspaceColor });

      if (result.organizationId) {
        // Switch to the newly created workspace
        await switchOrganization(result.organizationId);
        toast.success("Workspace created successfully!", {
          description: `${trimmedName} is now your active workspace.`,
        });
        setWorkspaceName("");
        setShowCreateForm(false);
        // Navigate to projects page to start adding projects
        onNavigate?.("projects");
      }
    } catch (error) {
      toast.error("Failed to create workspace", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <section className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          {/* User Info */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-semibold bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg ring-4 ring-gray-100 dark:ring-gray-800">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                {!anonymous && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    Verified
                  </span>
                )}
              </div>
              {email ? (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <Mail className="h-4 w-4" />
                  <span>{email}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <UserIcon className="h-4 w-4" />
                  <span>Signed in anonymously</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent bg-primary text-white shadow-md hover:bg-primary/90 hover:shadow-lg transition-all"
              onClick={() => onNavigate?.("settings")}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
              onClick={() => onNavigate?.("dashboard")}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </button>
            <SignOutButton />
          </div>
        </div>

        {/* Anonymous Account Warning */}
        {anonymous && (
          <div className="mt-6 rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  Anonymous Account
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Upgrade to a full account to unlock invitations and organization features. Add an email address by
                  signing up with email and password.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Workspaces Section with Grid Layout */}
      <section className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 sm:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Workspaces</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Workspaces you own or have been invited to.
            </p>
          </div>
        </header>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberships.map(({ membership, organization }) => {
            if (!organization) return null;
            const isActive = membership._id === activeMembershipId;
            const projectCount = allProjects.filter(
              (p) => p.organizationId === organization._id && !p.archived
            ).length;

            return (
              <WorkspaceCard
                key={membership._id}
                organization={organization}
                membership={membership}
                isActive={isActive}
                projectCount={projectCount}
                memberCount={1} // TODO: Get actual member count
                onSwitch={() => {
                  void switchOrganization(organization._id);
                }}
              />
            );
          })}

          {/* Create Workspace Card */}
          <CreateWorkspaceCard onClick={() => setShowCreateForm(!showCreateForm)} />
        </div>

        {/* Empty state */}
        {memberships.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No workspaces yet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Create your first workspace to organize projects and collaborate with your team.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow transition-colors"
            >
              Create Workspace
            </button>
          </div>
        )}
      </section>

      {/* Create Workspace Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your projects and collaborate with your team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Workspace name
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="e.g., Acme Corporation, Freelance Projects, Marketing Team"
                maxLength={100}
                autoFocus
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Choose a descriptive name for your workspace (max 100 characters)
              </p>
            </div>

            <ColorPicker
              value={workspaceColor}
              onChange={setWorkspaceColor}
              label="Workspace color"
              helpText="Pick a color to help identify your workspace"
            />

            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !workspaceName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <span>Create Workspace</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Management Link Section */}
      <section className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Team Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage team members, send invitations, and view organization settings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.("settings", { settingsTab: "team" })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent bg-primary text-white shadow-md hover:bg-primary/90 hover:shadow-lg transition-all"
          >
            Manage team
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Team management has been moved to the settings page for better organization.
        </p>
      </section>
    </div>
  );
}

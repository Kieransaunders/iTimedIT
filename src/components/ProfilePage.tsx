import type { Doc } from "../../convex/_generated/dataModel";
import { getUserDisplayName, getUserEmail, getUserInitials, isAnonymousUser } from "../lib/user-utils";
import { useOrganization } from "../lib/organization-context";
import { OrganizationManagementCard } from "./OrganizationManagementCard";

export type AppPage =
  | "dashboard"
  | "modern"
  | "clients"
  | "projects"
  | "settings"
  | "profile"
  | "testEmail";

export function ProfilePage({
  user,
  onNavigate,
}: {
  user: Doc<"users">;
  onNavigate?: (page: AppPage) => void;
}) {
  const displayName = getUserDisplayName(user);
  const email = getUserEmail(user);
  const initials = getUserInitials(user);
  const anonymous = isAnonymousUser(user);
  const memberSince = new Date(user._creationTime).toLocaleDateString();
  const { memberships, activeMembershipId, switchOrganization } = useOrganization();

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-semibold bg-gradient-to-br from-primary to-purple-600 text-white shadow">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{displayName}</h1>
              {email ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">{email}</p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">Signed in anonymously</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Member since {memberSince}</p>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-transparent bg-primary text-white shadow hover:bg-primary/90 transition"
              onClick={() => onNavigate?.("settings")}
            >
              Open settings
            </button>
            <button
              type="button"
              className="text-sm text-secondary hover:text-primary hover:underline"
              onClick={() => onNavigate?.("dashboard")}
            >
              Go to dashboard
            </button>
          </div>
        </div>
        {anonymous && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm p-4">
            <p className="font-medium">Anonymous account</p>
            <p className="mt-1">
              Upgrade to a full account to unlock invitations and organization features. Add an email address by
              signing up with email and password.
            </p>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 sm:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Organization memberships</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You currently belong to {memberships.length} organization{memberships.length === 1 ? "" : "s"}.
            </p>
          </div>
        </header>
        <div className="space-y-4">
          {memberships.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-sm text-gray-600 dark:text-gray-400">
              You're not a member of any organizations yet. Accept an invite to get started.
            </div>
          ) : (
            memberships.map(({ membership, organization }) => {
              const joinedAt = membership.createdAt
                ? new Date(membership.createdAt).toLocaleDateString()
                : null;
              const isActive = membership._id === activeMembershipId;
              return (
                <div
                  key={membership._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-4 py-3"
                >
                  <div>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {organization?.name ?? "Workspace"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Role: <span className="capitalize">{membership.role}</span>
                      {joinedAt ? ` · Joined ${joinedAt}` : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isActive ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold">
                        Active workspace
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() => {
                          if (!organization?._id) {
                            return;
                          }
                          void switchOrganization(organization._id).then(() => {
                            onNavigate?.("projects");
                          });
                        }}
                      >
                        View workspace
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <OrganizationManagementCard />
    </div>
  );
}

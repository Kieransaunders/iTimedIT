import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { ModernDashboard } from "./components/ModernDashboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { Settings } from "./components/Settings";
import { ClientsPage } from "./components/ClientsPage";
import { ProjectsPage } from "./components/ProjectsPage";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { ThemeProvider } from "./lib/theme";
import { ThemeToggle } from "./components/ThemeToggle";
import { OrganizationProvider, useOrganization } from "./lib/organization-context";
import { useAuthActions } from "@convex-dev/auth/react";
import { InvitePage } from "./components/InvitePage";
import { ProfilePage, type AppPage } from "./components/ProfilePage";
import { ProfileAvatar } from "./components/ProfileAvatar";
import {
  ensurePushSubscription,
  isPushSupported,
  setupPushMessageListener,
} from "./lib/push";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const [inviteToken, clearInviteToken] = useInviteToken();


  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-gradient">
      {inviteToken ? (
        <InviteRoute token={inviteToken} onComplete={clearInviteToken} />
      ) : (
        <>
          <Authenticated>
            <AuthenticatedAppWrapper />
          </Authenticated>
          <Unauthenticated>
            <UnauthenticatedViewWrapper />
          </Unauthenticated>
        </>
      )}
      <Toaster />
    </div>
  );
}

function AuthenticatedAppWrapper() {
  return <AuthenticatedApp />;
}

function UnauthenticatedViewWrapper() {
  return <UnauthenticatedView />;
}

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<AppPage>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pushSwitchRequest, setPushSwitchRequest] = useState<any | null>(null);

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const { signOut } = useAuthActions();
  const stopTimerMutation = useMutation(api.timer.stop);
  const ackInterrupt = useMutation(api.timer.ackInterrupt);
  const savePushSubscription = useMutation(api.pushNotifications.savePushSubscription);
  const pushListenerCleanup = useRef<(() => void) | null>(null);
  const hasAnnouncedAuth = useRef<boolean>(false);

  // Do not auto sign out if query returns null; allow session to establish post sign-in.
  // The <Authenticated>/<Unauthenticated> gates already handle rendering.

  // One-time welcome toast after successful sign-in
  useEffect(() => {
    if (!hasAnnouncedAuth.current && loggedInUser) {
      hasAnnouncedAuth.current = true;
      toast.success("Welcome to iTrackIT", {
        description: `Signed in as ${loggedInUser.email}`,
      });
      // Navigate to dashboard after successful sign-in
      setCurrentPage("dashboard");
    }
  }, [loggedInUser]);

  useEffect(() => {
    if (!loggedInUser) {
      return () => {};
    }

    if (!isPushSupported()) {
      return () => {};
    }

    let active = true;

    const cleanup = setupPushMessageListener(async (action, data) => {
      if (!active) return;

      try {
        switch (action) {
          case "stop":
            await stopTimerMutation({ sourceOverride: "manual" });
            break;
          case "snooze":
          case "continue":
            await ackInterrupt({ continue: true });
            break;
          case "switch":
            await stopTimerMutation({ sourceOverride: "manual" });
            setCurrentPage("modern");
            setPushSwitchRequest(data || { from: "notification" });
            toast.info("Select a project to switch to", {
              description: "Project picker opened from push notification",
            });
            break;
          default:
            console.log("Unhandled push action", action, data);
        }
      } catch (error) {
        console.error("Failed to handle push action", action, error);
        toast.error("We couldn't complete the requested timer action.");
      }
    });

    pushListenerCleanup.current = cleanup;

    void (async () => {
      try {
        const subscription = await ensurePushSubscription({ requestPermission: false });
        if (!subscription) {
          return;
        }

        await savePushSubscription({
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          userAgent: navigator.userAgent,
        });
      } catch (error) {
        console.error("Failed to ensure push subscription", error);
      }
    })();

    return () => {
      active = false;
      cleanup();
      pushListenerCleanup.current = null;
    };
  }, [loggedInUser?._id, stopTimerMutation, ackInterrupt, savePushSubscription]);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loggedInUser) {
    return null;
  }

  return (
    <OrganizationProvider userId={loggedInUser._id}>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 shadow-sm px-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-primary dark:text-white">iTrackIT</h2>
            <OrganizationSwitcher />
            <nav className="flex gap-4">
              <NavButton label="Dashboard" isActive={currentPage === "dashboard"} onClick={() => setCurrentPage("dashboard")} />
              <NavButton label="Modern" isActive={currentPage === "modern"} onClick={() => setCurrentPage("modern")} />
              <NavButton label="Clients" isActive={currentPage === "clients"} onClick={() => setCurrentPage("clients")} />
              <NavButton label="Projects" isActive={currentPage === "projects"} onClick={() => setCurrentPage("projects")} />
              <NavButton label="Settings" isActive={currentPage === "settings"} onClick={() => setCurrentPage("settings")} />
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileAvatar
              user={loggedInUser}
              onOpenProfile={() => setCurrentPage("profile")}
              isActive={currentPage === "profile"}
            />
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {currentPage === "dashboard" && <Dashboard />}
            {currentPage === "modern" && (
              <ModernDashboard
                pushSwitchRequest={pushSwitchRequest}
                onPushSwitchHandled={() => setPushSwitchRequest(null)}
              />
            )}
            {currentPage === "clients" && <ClientsPage />}
            {currentPage === "projects" && (
              selectedProjectId ? (
                <ProjectDetailPage
                  projectId={selectedProjectId}
                  onBackToProjects={() => {
                    setSelectedProjectId(null);
                  }}
                />
              ) : (
                <ProjectsPage
                  onProjectSelect={(projectId: string) => {
                    setSelectedProjectId(projectId);
                  }}
                />
              )
            )}
            {currentPage === "settings" && <Settings onNavigate={setCurrentPage} />}
            {currentPage === "profile" && <ProfilePage user={loggedInUser} onNavigate={setCurrentPage} />}
          </div>
        </main>
      </div>
    </OrganizationProvider>
  );
}

function UnauthenticatedView() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const debugAuth = useQuery(api.auth.debugAuth);
  const { signOut } = useAuthActions();
  
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">iTrackIT</h1>
          <p className="text-xl text-secondary">Track time, manage budgets, stay focused</p>
        </div>
        
        {/* Debug info */}
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Debug Info:</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            User: {loggedInUser === undefined ? 'Loading...' : loggedInUser === null ? 'Not logged in' : `${loggedInUser.email || 'Anonymous'} (${loggedInUser._id})`}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Port: {window.location.port} | SITE_URL updated to match
          </p>
          <div className="mt-2 space-y-1">
            <button
              onClick={() => {
                // Clear all localStorage
                localStorage.clear();
                window.location.reload();
              }}
              className="block w-full text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Clear Storage & Refresh
            </button>
            <button
              onClick={() => window.location.reload()}
              className="block w-full text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
            <button
              onClick={() => signOut()}
              className="block w-full text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Force Sign Out
            </button>
          </div>
        </div>
        
        <SignInForm />
      </div>
    </div>
  );
}

function NavButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded ${
        isActive
          ? "bg-blue-100 text-blue-700 dark:bg-purple-600 dark:text-white"
          : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function InviteRoute({ token, onComplete }: { token: string; onComplete: () => void }) {
  return <InvitePage token={token} onComplete={onComplete} />;
}

function useInviteToken(): [string | null, () => void] {
  const [token, setToken] = useState<string | null>(() => getInviteTokenFromLocation());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = () => setToken(getInviteTokenFromLocation());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const clearToken = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.history.replaceState({}, "", "/");
    setToken(null);
  }, []);

  return [token, clearToken];
}

function getInviteTokenFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const { pathname, search } = window.location;

  if (pathname.startsWith("/invite/")) {
    const parts = pathname.split("/").filter(Boolean);
    const inferred = parts[1] ?? null;
    if (inferred) {
      return inferred;
    }
  }

  const params = new URLSearchParams(search);
  return params.get("token");
}

function OrganizationSwitcher() {
  const { memberships, activeMembershipId, activeOrganization, switchOrganization, isReady } =
    useOrganization();

  if (!isReady || memberships.length <= 1) {
    return activeOrganization ? (
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {activeOrganization.name}
      </span>
    ) : null;
  }

  return (
    <select
      className="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200"
      value={activeMembershipId ?? ""}
      onChange={(event) => {
        const membershipId = event.target.value;
        const match = memberships.find((item) => item.membership._id === membershipId);
        if (match?.organization?._id) {
          void switchOrganization(match.organization._id);
        }
      }}
    >
      {memberships.map(({ membership, organization }) => (
        <option key={membership._id} value={membership._id}>
          {organization?.name ?? "Workspace"}
        </option>
      ))}
    </select>
  );
}

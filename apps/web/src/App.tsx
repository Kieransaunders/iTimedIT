import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
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
import { TestEmailPage } from "./components/TestEmailPage";
import {
  ensurePushSubscription,
  isPushSupported,
  setupPushMessageListener,
} from "./lib/push";
import { buildAppPath, stripBasePath } from "./lib/basePath";

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
  const startTimerMutation = useMutation(api.timer.start);
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
      toast.success("Welcome to iTimedIT", {
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
        {/* Desktop Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 shadow-sm px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="/iconnectit.png" 
                alt="iConnectIT" 
                className="h-6 w-6 sm:h-8 sm:w-8"
              />
              <h2 className="text-lg sm:text-xl font-semibold text-[#F85E00]">iTimedIT</h2>
            </div>
            <div className="hidden sm:block">
              <OrganizationSwitcher />
            </div>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-4">
              <NavButton icon={<DashboardIcon />} label="Dashboard" isActive={currentPage === "dashboard"} onClick={() => setCurrentPage("dashboard")} />
              <NavButton icon={<ClientsIcon />} label="Clients" isActive={currentPage === "clients"} onClick={() => setCurrentPage("clients")} />
              <NavButton icon={<ProjectsIcon />} label="Projects" isActive={currentPage === "projects"} onClick={() => setCurrentPage("projects")} />
              <NavButton icon={<SettingsIcon />} label="Settings" isActive={currentPage === "settings"} onClick={() => setCurrentPage("settings")} />
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <ProfileAvatar
                user={loggedInUser}
                onOpenProfile={() => setCurrentPage("profile")}
                isActive={currentPage === "profile"}
              />
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {currentPage === "dashboard" && (
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
                  onStartTimer={async (projectId: string) => {
                    try {
                      await startTimerMutation({ 
                        projectId: projectId as Id<"projects">, 
                        category: undefined,
                        pomodoroEnabled: false
                      });
                      setCurrentPage("dashboard");
                      toast.success("Timer started! Switched to dashboard.");
                    } catch (error) {
                      toast.error("Failed to start timer");
                    }
                  }}
                />
              )
            )}
            {currentPage === "settings" && <Settings onNavigate={setCurrentPage} />}
            {currentPage === "profile" && <ProfilePage user={loggedInUser} onNavigate={setCurrentPage} />}
            {currentPage === "testEmail" && <TestEmailPage onNavigate={setCurrentPage} />}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-around py-2">
            <BottomNavButton 
              icon={<DashboardIcon />} 
              label="Dashboard" 
              isActive={currentPage === "dashboard"} 
              onClick={() => setCurrentPage("dashboard")} 
            />
            <BottomNavButton 
              icon={<ClientsIcon />} 
              label="Clients" 
              isActive={currentPage === "clients"} 
              onClick={() => setCurrentPage("clients")} 
            />
            <BottomNavButton 
              icon={<ProjectsIcon />} 
              label="Projects" 
              isActive={currentPage === "projects"} 
              onClick={() => setCurrentPage("projects")} 
            />
            <BottomNavButton 
              icon={<SettingsIcon />} 
              label="Settings" 
              isActive={currentPage === "settings"} 
              onClick={() => setCurrentPage("settings")} 
            />
            <BottomNavButton 
              icon={<ProfileIcon />} 
              label="Profile" 
              isActive={currentPage === "profile"} 
              onClick={() => setCurrentPage("profile")} 
            />
          </div>
        </nav>
      </div>
    </OrganizationProvider>
  );
}

function UnauthenticatedView() {
  return (
    <div className="min-h-screen landing-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left side - Hero Content */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <img 
                  src="/iconnectit.png" 
                  alt="iConnectIT" 
                  className="h-12 w-12"
                />
                <h1 className="text-4xl lg:text-5xl font-bold hero-text">
                  iTimedIT
                </h1>
              </div>
              
              <h2 className="text-2xl lg:text-3xl font-semibold hero-text leading-tight">
                Professional Time Tracking
                <br />
                <span className="hero-subtitle">Made Simple</span>
              </h2>
              
              <p className="text-lg hero-subtitle max-w-lg leading-relaxed">
                Track time efficiently, manage project budgets, and stay focused on what matters most to your business.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium">Real-time tracking</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium">Budget management</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium">Team collaboration</span>
              </div>
            </div>
          </div>

          {/* Right side - Auth Form */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <div className="auth-card">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-semibold hero-text mb-2">Get Started</h3>
                  <p className="hero-subtitle">Create an account to get started</p>
                </div>
                <SignInForm defaultFlow="signUp" />
              </div>
            </div>
          </div>

        </div>
        
        {/* Bottom section */}
        <div className="mt-16 text-center">
          <p className="text-sm hero-subtitle">
            Trusted by professionals worldwide • Secure • Reliable • Efficient
          </p>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded ${
        isActive
          ? "bg-[#F85E00]/10 text-[#F85E00] dark:bg-[#F85E00] dark:text-white"
          : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      }`}
    >
      {icon && (
        <div className="w-4 h-4">
          {icon}
        </div>
      )}
      {label}
    </button>
  );
}

function BottomNavButton({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 min-w-0 flex-1 ${
        isActive
          ? "text-[#F85E00]"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      <div className="w-6 h-6 mb-1">
        {icon}
      </div>
      <span className="text-xs font-medium truncate">{label}</span>
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
    const targetPath = buildAppPath("/");
    window.history.replaceState({}, "", targetPath);
    setToken(null);
  }, []);

  return [token, clearToken];
}

function getInviteTokenFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const { pathname, search } = window.location;
  const relativePath = stripBasePath(pathname);

  if (relativePath.startsWith("/invite/")) {
    const parts = relativePath.split("/").filter(Boolean);
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

// Icon components
function DashboardIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
    </svg>
  );
}

function ClientsIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

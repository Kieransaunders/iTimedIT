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
import { CategoriesPage } from "./components/CategoriesPage";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { ThemeProvider } from "./lib/theme";
import { ThemeToggle } from "./components/ThemeToggle";
import { OrganizationProvider, useOrganization } from "./lib/organization-context";
import { useAuthActions } from "@convex-dev/auth/react";
import { InvitePage } from "./components/InvitePage";
import { ProfilePage, type AppPage } from "./components/ProfilePage";
import { ProfileAvatar } from "./components/ProfileAvatar";
import { TestEmailPage } from "./components/TestEmailPage";
import { EntriesPage } from "./components/EntriesPage";
import { InterruptWatcher } from "./components/InterruptWatcher";
import {
  ensurePushSubscription,
  isPushSupported,
  setupPushMessageListener,
} from "./lib/push";
import { clearAppBadge } from "./lib/badgeApi";
import { buildAppPath, stripBasePath } from "./lib/basePath";
import {
  type MarketingPageSlug,
  AboutPage,
  FeaturesPage,
  FaqPage,
  PricingPage,
  PrivacyPolicyPage,
  SupportPage,
  TermsPage,
  marketingPageToPath,
} from "./components/MarketingPages";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { MobileLandingPage } from "./components/MobileLandingPage";
import { MobileSignIn } from "./components/MobileSignIn";
import { MobileSignUp } from "./components/MobileSignUp";

// Mobile detection utility
function isMobileDevice(): boolean {
  return window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Mobile auth page type
type MobileAuthPage = "landing" | "sign-in" | "sign-up";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
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
      <PWAInstallPrompt />
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
  const [currentPage, setCurrentPage] = useState<AppPage>("timer");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pushSwitchRequest, setPushSwitchRequest] = useState<any | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<"personal" | "work">("work");
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"timer" | "notifications" | "budget" | "team" | undefined>(undefined);

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const { signOut } = useAuthActions();
  const stopTimerMutation = useMutation(api.timer.stop);
  const startTimerMutation = useMutation(api.timer.start);
  const ackInterrupt = useMutation(api.timer.ackInterrupt);
  const savePushSubscription = useMutation(api.pushNotifications.savePushSubscription);
  const ensureWorkspace = useMutation(api.organizations.ensurePersonalWorkspace);
  const pushListenerCleanup = useRef<(() => void) | null>(null);
  const hasAnnouncedAuth = useRef<boolean>(false);
  const workspaceInitializedRef = useRef<boolean>(false);

  // Navigation handler that supports settings tab
  const handleNavigate = useCallback((page: AppPage, options?: { settingsTab?: "timer" | "notifications" | "budget" | "team" }) => {
    setCurrentPage(page);
    if (page === "settings" && options?.settingsTab) {
      setSettingsTab(options.settingsTab);
    } else {
      setSettingsTab(undefined);
    }
  }, []);

  // Do not auto sign out if query returns null; allow session to establish post sign-in.
  // The <Authenticated>/<Unauthenticated> gates already handle rendering.

  // Ensure workspace exists for authenticated users (especially new OAuth users)
  useEffect(() => {
    if (!loggedInUser || workspaceInitializedRef.current) {
      return;
    }

    // Mark as initialized to prevent duplicate calls
    workspaceInitializedRef.current = true;

    const initializeWorkspace = async () => {
      try {
        await ensureWorkspace();
        setWorkspaceInitialized(true);
      } catch (error) {
        console.error("Failed to initialize workspace:", error);
        // Reset flag so we can retry
        workspaceInitializedRef.current = false;

        toast.error("Workspace initialization failed", {
          description: "Please refresh the page. If the problem persists, contact support.",
        });
      }
    };

    void initializeWorkspace();
  }, [loggedInUser, ensureWorkspace]);

  // One-time welcome toast after successful sign-in
  useEffect(() => {
    if (!hasAnnouncedAuth.current && loggedInUser && workspaceInitialized) {
      hasAnnouncedAuth.current = true;
      toast.success("Welcome to iTimedIT", {
        description: `Signed in as ${loggedInUser.email}`,
      });
      // Navigate to timer after successful sign-in
      setCurrentPage("timer");
    }
  }, [loggedInUser, workspaceInitialized]);

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
            setCurrentPage("timer");
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
      // Clear badge when component unmounts
      clearAppBadge();
    };
  }, [loggedInUser?._id, stopTimerMutation, ackInterrupt, savePushSubscription]);

  // Show loading while user data or workspace is being set up
  if (loggedInUser === undefined || (loggedInUser && !workspaceInitialized)) {
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
      {/* Global interrupt watcher - monitors interrupts on all screens */}
      <InterruptWatcher />

      <div className="flex flex-col min-h-screen">
        {/* Desktop Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 shadow-sm px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src="/icon.png"
                alt="iTimedIT"
                className="h-6 w-6 sm:h-8 sm:w-8"
              />
              <h2 className="text-lg sm:text-xl font-semibold text-[#F85E00]">iTimedIT</h2>
            </div>
            <div className="hidden sm:flex sm:items-center sm:gap-4">
              <WorkspaceIndicator
                currentWorkspace={currentWorkspace}
                onWorkspaceChange={setCurrentWorkspace}
                onManageWorkspaces={() => setCurrentPage("profile")}
              />
            </div>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-4">
              <NavButton icon={<TimerIcon />} label="Timer" isActive={currentPage === "timer"} onClick={() => setCurrentPage("timer")} />
              <NavButton icon={<ClientsIcon />} label="Clients" isActive={currentPage === "clients"} onClick={() => setCurrentPage("clients")} />
              <NavButton icon={<ProjectsIcon />} label="Projects" isActive={currentPage === "projects"} onClick={() => setCurrentPage("projects")} />
              <NavButton icon={<EntriesIcon />} label="Entries" isActive={currentPage === "entries"} onClick={() => setCurrentPage("entries")} />
              <NavButton icon={<CategoriesIcon />} label="Categories" isActive={currentPage === "categories"} onClick={() => setCurrentPage("categories")} />
              <NavButton icon={<SettingsIcon />} label="Settings" isActive={currentPage === "settings"} onClick={() => setCurrentPage("settings")} />
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <ProfileAvatar
              user={loggedInUser}
              onOpenProfile={() => setCurrentPage("profile")}
              isActive={currentPage === "profile"}
            />
            <div className="hidden sm:block">
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {currentPage === "timer" && (
              <ModernDashboard
                pushSwitchRequest={pushSwitchRequest}
                onPushSwitchHandled={() => setPushSwitchRequest(null)}
                workspaceType={currentWorkspace}
                onWorkspaceChange={setCurrentWorkspace}
              />
            )}
            {currentPage === "clients" && (
              <ClientsPage
                workspaceType={currentWorkspace}
                onWorkspaceChange={setCurrentWorkspace}
                onViewProjects={(clientId) => {
                  setClientFilter(clientId);
                  setCurrentPage("projects");
                }}
              />
            )}
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
                  workspaceType={currentWorkspace}
                  onWorkspaceChange={setCurrentWorkspace}
                  clientFilter={clientFilter}
                  onClearClientFilter={() => setClientFilter(null)}
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
                      setCurrentPage("timer");
                      toast.success("Timer started! Switched to timer.");
                    } catch (error) {
                      toast.error("Failed to start timer");
                    }
                  }}
                />
              )
            )}
            {currentPage === "entries" && <EntriesPage />}
            {currentPage === "categories" && <CategoriesPage />}
            {currentPage === "settings" && <Settings onNavigate={handleNavigate} initialTab={settingsTab} />}
            {currentPage === "profile" && <ProfilePage user={loggedInUser} onNavigate={handleNavigate} />}
            {currentPage === "testEmail" && <TestEmailPage onNavigate={handleNavigate} />}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-around py-2">
            <BottomNavButton
              icon={<TimerIcon />}
              label="Timer"
              isActive={currentPage === "timer"}
              onClick={() => setCurrentPage("timer")}
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
              icon={<EntriesIcon />}
              label="Entries"
              isActive={currentPage === "entries"}
              onClick={() => setCurrentPage("entries")}
            />
            <BottomNavButton
              icon={<CategoriesIcon />}
              label="Categories"
              isActive={currentPage === "categories"}
              onClick={() => setCurrentPage("categories")}
            />
            <BottomNavButton
              icon={<SettingsIcon />}
              label="Settings"
              isActive={currentPage === "settings"}
              onClick={() => setCurrentPage("settings")}
            />
          </div>
        </nav>
      </div>
    </OrganizationProvider>
  );
}

function UnauthenticatedView() {
  const { page, navigate } = useMarketingPage();
  const [isMobile, setIsMobile] = useState(isMobileDevice());
  const [mobileAuthPage, setMobileAuthPage] = useState<MobileAuthPage>("landing");
  const { signIn } = useAuthActions();

  // Update mobile detection on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle guest mode sign-in
  const handleGuestMode = async () => {
    try {
      await signIn("anonymous");
    } catch (error) {
      console.error("Guest sign-in failed:", error);
      toast.error("Failed to start guest session. Please try again.");
    }
  };

  // If mobile, show mobile-specific pages
  if (isMobile) {
    switch (mobileAuthPage) {
      case "sign-in":
        return (
          <MobileSignIn
            onBack={() => setMobileAuthPage("landing")}
            onSignUpLink={() => setMobileAuthPage("sign-up")}
          />
        );
      case "sign-up":
        return (
          <MobileSignUp
            onBack={() => setMobileAuthPage("landing")}
            onSignInLink={() => setMobileAuthPage("sign-in")}
          />
        );
      default:
        return (
          <MobileLandingPage
            onSignIn={() => setMobileAuthPage("sign-in")}
            onSignUp={() => setMobileAuthPage("sign-up")}
            onGuestMode={handleGuestMode}
          />
        );
    }
  }

  // Desktop view - existing functionality
  switch (page) {
    case "features":
      return <FeaturesPage onNavigate={navigate} />;
    case "pricing":
      return <PricingPage onNavigate={navigate} />;
    case "faq":
      return <FaqPage onNavigate={navigate} />;
    case "about":
      return <AboutPage onNavigate={navigate} />;
    case "privacy":
      return <PrivacyPolicyPage onNavigate={navigate} />;
    case "support":
      return <SupportPage onNavigate={navigate} />;
    case "terms":
      return <TermsPage onNavigate={navigate} />;
    default:
      return <LandingPage onNavigate={navigate} />;
  }
}

function LandingPage({ onNavigate }: { onNavigate: (page: MarketingPageSlug) => void }) {
  return (
    <div className="min-h-screen landing-gradient flex flex-col">
      <header className="px-6 pt-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="iTimedIT" className="h-12 w-12" />
            <div>
              <p className="text-2xl font-semibold text-slate-800">iTimedIT</p>
              <p className="text-sm text-slate-500">Professional time tracking made simple</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-600">
            <LandingNavLink page="features" onNavigate={onNavigate}>
              Features
            </LandingNavLink>
            <LandingNavLink page="pricing" onNavigate={onNavigate}>
              Pricing
            </LandingNavLink>
            <LandingNavLink page="faq" onNavigate={onNavigate}>
              FAQ
            </LandingNavLink>
            <LandingNavLink page="support" onNavigate={onNavigate}>
              Support
            </LandingNavLink>
            <LandingNavLink page="about" onNavigate={onNavigate}>
              About
            </LandingNavLink>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-6">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Hero Content */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                  <img
                    src="/icon.png"
                    alt="iTimedIT"
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
        </div>
      </main>
      <footer className="px-6 pb-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 text-sm text-slate-500">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <LandingNavLink page="features" onNavigate={onNavigate} className="hover:text-slate-700">
              Features
            </LandingNavLink>
            <LandingNavLink page="pricing" onNavigate={onNavigate} className="hover:text-slate-700">
              Pricing
            </LandingNavLink>
            <LandingNavLink page="faq" onNavigate={onNavigate} className="hover:text-slate-700">
              FAQ
            </LandingNavLink>
            <LandingNavLink page="support" onNavigate={onNavigate} className="hover:text-slate-700">
              Support
            </LandingNavLink>
            <LandingNavLink page="privacy" onNavigate={onNavigate} className="hover:text-slate-700">
              Privacy
            </LandingNavLink>
            <LandingNavLink page="terms" onNavigate={onNavigate} className="hover:text-slate-700">
              Terms
            </LandingNavLink>
            <LandingNavLink page="about" onNavigate={onNavigate} className="hover:text-slate-700">
              About
            </LandingNavLink>
          </div>
          <p className="text-center">Trusted by professionals worldwide • Secure • Reliable • Efficient</p>
        </div>
      </footer>
    </div>
  );
}

function LandingNavLink({
  page,
  onNavigate,
  className,
  children,
}: {
  page: MarketingPageSlug;
  onNavigate: (page: MarketingPageSlug) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const target = buildAppPath(marketingPageToPath(page));
  return (
    <a
      href={target}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(page);
      }}
      className={`transition-colors hover:text-slate-900 ${className ?? ""}`}
    >
      {children}
    </a>
  );
}

function useMarketingPage() {
  const [page, setPage] = useState<MarketingPageSlug>(() => getMarketingPageFromLocation());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = () => {
      setPage(getMarketingPageFromLocation());
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const navigate = useCallback((target: MarketingPageSlug) => {
    if (typeof window === "undefined") {
      setPage(target);
      return;
    }
    const targetPath = buildAppPath(marketingPageToPath(target));
    window.history.pushState({}, "", targetPath);
    setPage(target);
  }, []);

  return { page, navigate };
}

function getMarketingPageFromLocation(): MarketingPageSlug {
  if (typeof window === "undefined") {
    return "home";
  }

  const { pathname } = window.location;
  const relativePath = stripBasePath(pathname);

  if (relativePath === "/features" || relativePath.startsWith("/features/")) {
    return "features";
  }

  if (relativePath === "/pricing" || relativePath.startsWith("/pricing/")) {
    return "pricing";
  }

  if (relativePath === "/faq" || relativePath.startsWith("/faq/")) {
    return "faq";
  }

  if (relativePath === "/about" || relativePath.startsWith("/about/")) {
    return "about";
  }

  if (relativePath === "/privacy" || relativePath.startsWith("/privacy/")) {
    return "privacy";
  }

  if (relativePath === "/support" || relativePath.startsWith("/support/")) {
    return "support";
  }

  if (relativePath === "/terms" || relativePath.startsWith("/terms/")) {
    return "terms";
  }

  return "home";
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

// Icon components
function TimerIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function EntriesIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h10M9 12h10m-6 5h6M5 7h.01M5 12h.01M5 17h.01" />
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

function CategoriesIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function WorkspaceIndicator({
  currentWorkspace,
  onWorkspaceChange,
  onManageWorkspaces,
}: {
  currentWorkspace: "personal" | "work";
  onWorkspaceChange: (workspace: "personal" | "work") => void;
  onManageWorkspaces?: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { memberships, activeOrganization, switchOrganization, isReady } = useOrganization();

  // Filter memberships into personal and work
  const personalMembership = memberships.find(
    (item) => item.organization?.isPersonalWorkspace === true
  );
  const workMemberships = memberships.filter(
    (item) => item.organization?.isPersonalWorkspace !== true
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleWorkspaceSwitch = async (organizationId: Id<"organizations">, isPersonal: boolean) => {
    if (!isReady) return;

    await switchOrganization(organizationId);
    onWorkspaceChange(isPersonal ? "personal" : "work");
    setShowDropdown(false);
  };

  // Display name and color for the button - use optimistic UI based on currentWorkspace
  const displayOrg = currentWorkspace === "personal"
    ? personalMembership?.organization
    : workMemberships.find(m => m.organization?._id === activeOrganization?._id)?.organization || workMemberships[0]?.organization;

  const displayName = currentWorkspace === "personal"
    ? (displayOrg?.name || "Personal")
    : (displayOrg?.name || "Work");
  const displayColor = currentWorkspace === "personal"
    ? "#3b82f6" // Blue for personal
    : (displayOrg?.color || "#8b5cf6"); // Purple default for work

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: displayColor }}
        />
        <span>{displayName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Personal Workspace */}
          {personalMembership?.organization && (
            <button
              onClick={() => handleWorkspaceSwitch(personalMembership.organization!._id, true)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                currentWorkspace === "personal"
                  ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#3b82f6" }}
              />
              <span>Personal</span>
              {currentWorkspace === "personal" && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}

          {/* Divider if there are work memberships */}
          {workMemberships.length > 0 && personalMembership && (
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          )}

          {/* Work Organizations */}
          {workMemberships.map(({ membership, organization }) => {
            const isActive = currentWorkspace === "work" && activeOrganization?._id === organization?._id;
            const orgColor = organization?.color || "#8b5cf6";
            return (
              <button
                key={membership._id}
                onClick={() => organization && handleWorkspaceSwitch(organization._id, false)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  isActive
                    ? "font-medium bg-gray-100 dark:bg-gray-700/50"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: orgColor }}
                />
                <span className="truncate">{organization?.name || "Workspace"}</span>
                {isActive && (
                  <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}

          {/* Manage Workspaces Option */}
          {onManageWorkspaces && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <button
                onClick={() => {
                  onManageWorkspaces();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Manage Workspaces</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

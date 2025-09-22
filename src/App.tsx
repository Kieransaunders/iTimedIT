import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { ModernDashboard } from "./components/ModernDashboard";
import { useState } from "react";
import { Settings } from "./components/Settings";
import { ClientsPage } from "./components/ClientsPage";
import { ProjectsPage } from "./components/ProjectsPage";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { ThemeProvider } from "./lib/theme";
import { ThemeToggle } from "./components/ThemeToggle";
import { OrganizationProvider, useOrganization } from "./lib/organization-context";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-gradient">
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedView />
      </Unauthenticated>
      <Toaster />
    </div>
  );
}

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<
    "dashboard" | "modern" | "clients" | "projects" | "settings"
  >("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const loggedInUser = useQuery(api.auth.loggedInUser);

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
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {currentPage === "dashboard" && <Dashboard />}
            {currentPage === "modern" && <ModernDashboard />}
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
          </div>
        </main>
      </div>
    </OrganizationProvider>
  );
}

function UnauthenticatedView() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">iTrackIT</h1>
          <p className="text-xl text-secondary">Track time, manage budgets, stay focused</p>
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

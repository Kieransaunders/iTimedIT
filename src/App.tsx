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

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<"dashboard" | "modern" | "clients" | "projects" | "settings">("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-gradient">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 shadow-sm px-4">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-semibold text-primary dark:text-white">TimeTracker</h2>
          <Authenticated>
            <nav className="flex gap-4">
              <button
                onClick={() => setCurrentPage("dashboard")}
                className={`px-3 py-1 rounded ${currentPage === "dashboard" ? "bg-blue-100 text-blue-700 dark:bg-purple-600 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage("modern")}
                className={`px-3 py-1 rounded ${currentPage === "modern" ? "bg-blue-100 text-blue-700 dark:bg-purple-600 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
              >
                Modern
              </button>
              <button
                onClick={() => setCurrentPage("clients")}
                className={`px-3 py-1 rounded ${currentPage === "clients" ? "bg-blue-100 text-blue-700 dark:bg-purple-600 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
              >
                Clients
              </button>
              <button
                onClick={() => setCurrentPage("projects")}
                className={`px-3 py-1 rounded ${currentPage === "projects" ? "bg-blue-100 text-blue-700 dark:bg-purple-600 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
              >
                Projects
              </button>
              <button
                onClick={() => setCurrentPage("settings")}
                className={`px-3 py-1 rounded ${currentPage === "settings" ? "bg-blue-100 text-blue-700 dark:bg-purple-600 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
              >
                Settings
              </button>
            </nav>
          </Authenticated>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-8">
        <Content currentPage={currentPage} selectedProjectId={selectedProjectId} setCurrentPage={setCurrentPage} setSelectedProjectId={setSelectedProjectId} />
      </main>
      <Toaster />
    </div>
  );
}

function Content({ 
  currentPage, 
  selectedProjectId, 
  setCurrentPage,
  setSelectedProjectId 
}: { 
  currentPage: string; 
  selectedProjectId: string | null;
  setCurrentPage: (page: "dashboard" | "clients" | "projects" | "settings") => void;
  setSelectedProjectId: (id: string | null) => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Authenticated>
        {currentPage === "dashboard" && <Dashboard />}
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
        {currentPage === "settings" && <Settings />}
      </Authenticated>
      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">TimeTracker</h1>
            <p className="text-xl text-secondary">Track time, manage budgets, stay focused</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}

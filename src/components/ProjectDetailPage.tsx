import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { RecentEntriesTable } from "./RecentEntriesTable";

interface ProjectDetailPageProps {
  projectId: string;
  onBackToProjects: () => void;
}

export function ProjectDetailPage({ projectId, onBackToProjects }: ProjectDetailPageProps) {
  const project = useQuery(api.projects.get, { id: projectId as Id<"projects"> });

  if (!project) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBackToProjects}
          className="text-blue-600 dark:text-purple-400 hover:text-blue-800 dark:hover:text-purple-300 flex items-center gap-2"
        >
          ← Back to Projects
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {project.name}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {project.client?.name} • ${project.hourlyRate}/hr
        </p>
        {project.budgetType === "hours" && project.budgetHours && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Budget: {project.budgetHours} hours
          </p>
        )}
        {project.budgetType === "amount" && project.budgetAmount && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Budget: ${project.budgetAmount}
          </p>
        )}
      </div>

      <RecentEntriesTable projectId={projectId as Id<"projects">} />
    </div>
  );
}
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface ProjectPickerProps {
  selectedProjectId: Id<"projects"> | null;
  onProjectSelect: (projectId: Id<"projects">) => void;
}

export function ProjectPicker({ selectedProjectId, onProjectSelect }: ProjectPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const projects = useQuery(api.projects.listAll);

  if (!projects) {
    return <div className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>;
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProject = projects.find(p => p._id === selectedProjectId);

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Select Project</h3>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search projects or clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {selectedProject && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-purple-900/30 rounded-md border dark:border-purple-700/50">
          <div className="font-medium text-blue-900 dark:text-purple-200">
            {selectedProject.client?.name} → {selectedProject.name}
          </div>
          <div className="text-sm text-blue-700 dark:text-purple-300">
            ${selectedProject.hourlyRate}/hr • {selectedProject.budgetType === "hours" ? `${selectedProject.budgetHours}h budget` : `$${selectedProject.budgetAmount} budget`}
          </div>
        </div>
      )}

      <div className="mb-4 text-center">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Swipe left/right to switch projects
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {filteredProjects.map((project) => (
          <button
            key={project._id}
            onClick={() => onProjectSelect(project._id)}
            className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
              selectedProjectId === project._id
                ? "border-purple-timer bg-purple-50 dark:bg-purple-900/50 dark:border-purple-600"
                : "border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 bg-white dark:bg-gray-800/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="w-3 h-3 rounded-full bg-cyan-400 mr-3"></div>
              <div className="font-medium text-gray-900 dark:text-gray-100 flex-1">
                {project.client?.name}
              </div>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
              {project.name}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              ${project.hourlyRate}/hr
            </div>
          </button>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No projects found. Create a client and project first.
        </div>
      )}
    </div>
  );
}

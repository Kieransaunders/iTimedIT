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
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Select Project</h3>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search projects or clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {selectedProject && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <div className="font-medium text-blue-900">
            {selectedProject.client?.name} → {selectedProject.name}
          </div>
          <div className="text-sm text-blue-700">
            ${selectedProject.hourlyRate}/hr • {selectedProject.budgetType === "hours" ? `${selectedProject.budgetHours}h budget` : `$${selectedProject.budgetAmount} budget`}
          </div>
        </div>
      )}

      <div className="max-h-60 overflow-y-auto space-y-2">
        {filteredProjects.map((project) => (
          <button
            key={project._id}
            onClick={() => onProjectSelect(project._id)}
            className={`w-full text-left p-3 rounded-md border transition-colors ${
              selectedProjectId === project._id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="font-medium">{project.client?.name} → {project.name}</div>
            <div className="text-sm text-gray-600">
              ${project.hourlyRate}/hr • {project.budgetType === "hours" ? `${project.budgetHours}h budget` : `$${project.budgetAmount} budget`}
            </div>
          </button>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No projects found. Create a client and project first.
        </div>
      )}
    </div>
  );
}

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Avatar } from "./ui/Avatar";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function TeamActivityLeaderboard() {
  const mostActive = useQuery(api.entries.getMostActiveMembers, { limit: 3 });

  if (!mostActive || mostActive.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Team Activity</h2>
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Most Active Over Last 7 Days
        </p>
        <div className="flex gap-8">
          {mostActive.map((member) => (
            <div key={member.userId} className="flex items-center gap-3">
              <Avatar name={member.name} size="lg" />
              <div>
                <p className="font-semibold text-gray-900">{member.name}</p>
                <p className="text-lg font-medium text-gray-700">
                  {formatDuration(member.totalSeconds)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

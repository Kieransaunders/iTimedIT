import type { Doc } from "../../convex/_generated/dataModel";
import { getUserDisplayName, getUserInitials } from "../lib/user-utils";

export function ProfileAvatar({
  user,
  onOpenProfile,
  isActive = false,
}: {
  user: Doc<"users">;
  onOpenProfile: () => void;
  isActive?: boolean;
}) {
  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  return (
    <button
      type="button"
      onClick={onOpenProfile}
      className={`relative h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm uppercase transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-900 ${
        isActive ? "ring-2 ring-primary/70" : ""
      } bg-gradient-to-br from-primary to-purple-600 text-white shadow-sm hover:shadow`}
      title={`Open profile for ${displayName}`}
      aria-label="Open profile"
    >
      {initials}
    </button>
  );
}

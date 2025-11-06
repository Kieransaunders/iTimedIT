import React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
};

const colors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForName(name: string): string {
  // Consistent color based on name hash
  const hash = name.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getColorForName(name);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full text-white font-semibold",
        sizeClasses[size],
        bgColor,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}

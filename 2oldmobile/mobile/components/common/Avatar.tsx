import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../utils/ThemeContext";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: { width: 24, height: 24, fontSize: 10 },
  md: { width: 32, height: 32, fontSize: 13 },
  lg: { width: 48, height: 48, fontSize: 18 },
};

const colors = [
  "#3B82F6", // blue
  "#A855F7", // purple
  "#EC4899", // pink
  "#F97316", // orange
  "#10B981", // green
  "#14B8A6", // teal
  "#6366F1", // indigo
  "#EF4444", // red
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

export function Avatar({ name, size = "md" }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getColorForName(name);
  const sizes = sizeStyles[size];

  return (
    <View
      style={[
        styles.avatar,
        {
          width: sizes.width,
          height: sizes.height,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: sizes.fontSize }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

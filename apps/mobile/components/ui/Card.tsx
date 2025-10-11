import { borderRadius, colors, shadows, sizing } from "@/utils/theme";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  shadow?: "sm" | "md" | "lg" | "none";
}

export function Card({ children, style, padding = sizing.cardPadding, shadow = "md" }: CardProps) {
  const cardStyles = [
    styles.base,
    shadow !== "none" && shadows[shadow],
    { padding },
    style,
  ];

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

import { Client, Project } from "@/types/models";
import { formatElapsedTime } from "@/utils/formatters";
import { colors } from "@/utils/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface TimerDisplayProps {
  elapsedTime: number;
  project: Project | null;
  client: Client | null;
  category?: string | null;
}

/**
 * Large timer display component showing elapsed time and project information
 */
export function TimerDisplay({ elapsedTime, project, client, category }: TimerDisplayProps) {
  const formattedTime = formatElapsedTime(elapsedTime);

  return (
    <View style={styles.container}>
      <Text style={styles.timer} accessibilityLabel={`Timer: ${formattedTime}`}>
        {formattedTime}
      </Text>
      {project && (
        <View style={styles.projectInfo}>
          <Text style={styles.projectName} numberOfLines={2}>
            {project.name}
          </Text>
          {client && (
            <Text style={styles.clientName} numberOfLines={1}>
              {client.name}
            </Text>
          )}
          {category && (
            <Text style={styles.categoryName} numberOfLines={1}>
              {category}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  timer: {
    fontSize: 64,
    fontWeight: "700",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  projectInfo: {
    marginTop: 16,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  projectName: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
    textAlign: "center",
    marginTop: 4,
  },
});

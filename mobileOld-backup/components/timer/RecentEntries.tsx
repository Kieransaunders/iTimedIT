import { Card } from "@/components/ui/Card";
import { colors, spacing } from "@/utils/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Recent time entries section component
 * Note: This is a placeholder. Full implementation will be in task 7
 */
export function RecentEntries() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      <Card style={styles.card}>
        <Text style={styles.placeholderText}>
          Your recent time entries will appear here
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.lg,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

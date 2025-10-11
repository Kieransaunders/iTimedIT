import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatDate, formatDuration } from "../../utils/formatters";
import { colors, typography } from "../../utils/theme";

interface EntryCardProps {
  entry: {
    _id: string;
    projectId: string;
    startedAt: number;
    stoppedAt?: number;
    seconds?: number;
    category?: string;
    note?: string;
    project?: {
      name: string;
    };
    client?: {
      name: string;
    };
  };
  onPress?: () => void;
  onDelete?: () => void;
}

export function EntryCard({ entry, onPress, onDelete }: EntryCardProps) {
  const duration = entry.seconds || 0;
  const formattedDuration = formatDuration(duration);
  const formattedDate = formatDate(entry.startedAt);

  const handleLongPress = () => {
    if (onDelete) {
      Alert.alert(
        "Delete Entry",
        "Are you sure you want to delete this time entry? This action cannot be undone.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: onDelete,
          },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={handleLongPress}
      disabled={!onPress && !onDelete}
      activeOpacity={onPress || onDelete ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.projectInfo}>
          <Text style={styles.projectName} numberOfLines={1}>
            {entry.project?.name || "Unknown Project"}
          </Text>
          {entry.client && (
            <Text style={styles.clientName} numberOfLines={1}>
              {entry.client.name}
            </Text>
          )}
        </View>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.duration}>{formattedDuration}</Text>
        {entry.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{entry.category}</Text>
          </View>
        )}
      </View>

      {entry.note && (
        <Text style={styles.note} numberOfLines={2}>
          {entry.note}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: 2,
  },
  clientName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  duration: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
});

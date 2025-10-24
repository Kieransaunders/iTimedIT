import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatDate, formatDuration } from "../../utils/formatters";
import { typography } from "../../utils/theme";
import { useTheme } from "../../utils/ThemeContext";

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
  const { colors } = useTheme();
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
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      disabled={!onPress && !onDelete}
      activeOpacity={onPress || onDelete ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.projectInfo}>
          <Text style={[styles.projectName, { color: colors.textPrimary }]} numberOfLines={1}>
            {entry.project?.name || "Unknown Project"}
          </Text>
          {entry.client && (
            <Text style={[styles.clientName, { color: colors.textSecondary }]} numberOfLines={1}>
              {entry.client.name}
            </Text>
          )}
        </View>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{formattedDate}</Text>
      </View>

      <View style={styles.details}>
        <Text style={[styles.duration, { color: colors.primary }]}>{formattedDuration}</Text>
        {entry.category && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{entry.category}</Text>
          </View>
        )}
      </View>

      {entry.note && (
        <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={2}>
          {entry.note}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
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
    fontWeight: "600",
    marginBottom: 2,
  },
  clientName: {
    ...typography.caption,
  },
  date: {
    ...typography.caption,
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  duration: {
    ...typography.body,
    fontWeight: "600",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    ...typography.caption,
    fontSize: 12,
  },
  note: {
    ...typography.caption,
    marginTop: 8,
    lineHeight: 18,
  },
});

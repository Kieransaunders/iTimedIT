import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { NetworkErrorState as NetworkErrorStateType } from "@/utils/networkErrorHandler";

interface NetworkErrorStateProps {
  errorState: NetworkErrorStateType;
  onRetry?: () => void;
  message?: string;
  showRetryButton?: boolean;
}

export function NetworkErrorState({
  errorState,
  onRetry,
  message,
  showRetryButton = true,
}: NetworkErrorStateProps) {
  const { styles } = useStyles(stylesheet);

  if (!errorState.hasNetworkError) {
    return null;
  }

  const defaultMessage = errorState.isOffline
    ? "No internet connection. Please check your network and try again."
    : "Network error occurred. Please try again.";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>
          {errorState.isOffline ? "📡" : "⚠️"}
        </Text>
        <Text style={styles.title}>
          {errorState.isOffline ? "Offline" : "Network Error"}
        </Text>
        <Text style={styles.message}>
          {message || defaultMessage}
        </Text>
        {errorState.retryCount > 0 && (
          <Text style={styles.retryInfo}>
            Retry attempt: {errorState.retryCount}
          </Text>
        )}
        {showRetryButton && onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  content: {
    alignItems: "center",
    maxWidth: 300,
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  retryInfo: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    fontStyle: "italic",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sizes.md,
    fontWeight: "600",
  },
}));
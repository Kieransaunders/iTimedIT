import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";

// Conditionally import expo-updates (might not be available in all environments)
let Updates: any;
try {
  Updates = require("expo-updates");
} catch (error) {
  console.warn("expo-updates not available, app restart functionality will be limited");
  Updates = null;
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Top-level error boundary that catches all unhandled errors in the app
 * Provides a user-friendly crash screen with restart functionality
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🚨 App Error Boundary caught error:", error);
    console.error("Error Info:", errorInfo);
    console.error("Component Stack:", errorInfo.componentStack);

    this.setState({ errorInfo });
  }

  handleRestart = async () => {
    try {
      // Check if Updates is available (not available in Expo Go or some dev builds)
      if (Updates && Updates.reloadAsync) {
        // Try to reload the app using Expo Updates
        await Updates.reloadAsync();
      } else {
        console.warn("Expo Updates not available, using fallback restart");
        // Fallback: reset error state to retry rendering
        this.setState({ hasError: false, error: null, errorInfo: null });
      }
    } catch (error) {
      console.error("Failed to reload app:", error);
      // Fallback: reset error state to retry rendering
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} onRestart={this.handleRestart} />;
    }

    return this.props.children;
  }
}

interface ErrorScreenProps {
  error: Error | null;
  onRestart: () => void;
}

function ErrorScreen({ error, onRestart }: ErrorScreenProps) {
  const { styles } = useStyles(stylesheet);
  const isDevelopment = __DEV__;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.emoji}>😔</Text>
          <Text style={styles.title}>Something Went Wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error and needs to restart.
          </Text>

          {isDevelopment && error && (
            <View style={styles.errorDetailsContainer}>
              <Text style={styles.errorDetailsTitle}>Error Details (Dev Only):</Text>
              <Text style={styles.errorDetails}>
                {error.name}: {error.message}
              </Text>
              {error.stack && (
                <Text style={styles.errorStack} numberOfLines={10}>
                  {error.stack}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
            <Text style={styles.restartButtonText}>Restart App</Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            If the problem persists, please try reinstalling the app or contact support.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
  },
  emoji: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.heading.fontSize * 1.2,
    fontWeight: theme.typography.heading.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  message: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  errorDetailsContainer: {
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    width: "100%",
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorDetailsTitle: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: "600",
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  errorDetails: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.error,
    fontFamily: "monospace",
    marginBottom: theme.spacing.sm,
  },
  errorStack: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontFamily: "monospace",
  },
  restartButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    minWidth: 200,
  },
  restartButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.body.fontSize,
    fontWeight: "600",
    textAlign: "center",
  },
  helpText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: theme.spacing.md,
  },
}));

import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class OrganizationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Organization context error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

function DefaultErrorFallback({ error, onRetry }: DefaultErrorFallbackProps) {
  const { styles } = useStyles(stylesheet);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Workspace Error</Text>
        <Text style={styles.message}>
          There was a problem loading your workspace. This might be due to network issues or
          permission problems.
        </Text>
        {error && (
          <Text style={styles.errorDetails}>
            {error.message || "An unexpected error occurred"}
          </Text>
        )}
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <Text style={styles.fallbackText}>
          If the problem persists, the app will fall back to your personal workspace.
        </Text>
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
  title: {
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  message: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  errorDetails: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.error,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    fontFamily: "monospace",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.body.fontSize,
    fontWeight: "600",
  },
  fallbackText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
}));
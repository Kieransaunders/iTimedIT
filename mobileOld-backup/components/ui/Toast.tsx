import { borderRadius, colors, shadows, spacing, typography } from "@/utils/theme";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity
} from "react-native";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  visible: boolean;
  onHide: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function Toast({
  message,
  type = "info",
  duration = 3000,
  visible,
  onHide,
  action,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) {
    return null;
  }

  const backgroundColor = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.primary,
  }[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor,
        },
      ]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {action && (
        <TouchableOpacity
          onPress={() => {
            action.onPress();
            hideToast();
          }}
          style={styles.actionButton}
          accessible={true}
          accessibilityLabel={action.label}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={hideToast}
        style={styles.closeButton}
        accessible={true}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.lg,
    zIndex: 9999,
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  actionText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
});

// Toast Manager for global toast notifications
class ToastManager {
  private listeners: Array<(toast: ToastConfig) => void> = [];

  subscribe(listener: (toast: ToastConfig) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  show(config: ToastConfig) {
    this.listeners.forEach((listener) => listener(config));
  }

  success(message: string, action?: ToastConfig["action"]) {
    this.show({ message, type: "success", action });
  }

  error(message: string, action?: ToastConfig["action"]) {
    this.show({ message, type: "error", action });
  }

  warning(message: string, action?: ToastConfig["action"]) {
    this.show({ message, type: "warning", action });
  }

  info(message: string, action?: ToastConfig["action"]) {
    this.show({ message, type: "info", action });
  }
}

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const toast = new ToastManager();

// ToastContainer component to be placed at the root of the app
export function ToastContainer() {
  const [toastConfig, setToastConfig] = React.useState<ToastConfig | null>(null);
  const [visible, setVisible] = React.useState(false);

  useEffect(() => {
    const unsubscribe = toast.subscribe((config) => {
      setToastConfig(config);
      setVisible(true);
    });

    return unsubscribe;
  }, []);

  if (!toastConfig) {
    return null;
  }

  return (
    <Toast
      message={toastConfig.message}
      type={toastConfig.type}
      duration={toastConfig.duration}
      visible={visible}
      onHide={() => setVisible(false)}
      action={toastConfig.action}
    />
  );
}

import React from "react";
import { View, Text, ActivityIndicator, Modal } from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({
  visible,
  message = "Loading...",
  transparent = false,
}: LoadingOverlayProps) {
  const { styles } = useStyles(stylesheet);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, transparent && styles.transparentOverlay]}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={styles.spinner.color} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  transparentOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  container: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spinner: {
    color: theme.colors.primary,
  },
  message: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    textAlign: "center",
  },
}));
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useTheme } from "@/utils/ThemeContext";
import { spacing, typography, borderRadius } from "@/utils/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export interface WorkspaceTransitionOverlayProps {
  visible: boolean;
  type: "workspace" | "organization";
  targetName?: string;
  message?: string;
}

export function WorkspaceTransitionOverlay({
  visible,
  type,
  targetName,
  message,
}: WorkspaceTransitionOverlayProps) {
  const { colors } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const defaultMessage = type === "workspace" 
    ? `Switching to ${targetName || "workspace"}...`
    : `Switching to ${targetName || "organization"}...`;

  const iconName = type === "workspace" ? "swap-horizontal" : "domain";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: colors.background + "E6", // 90% opacity
            opacity: fadeAnim,
          },
        ]}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={iconName}
              size={32}
              color={colors.primary}
            />
          </View>
          
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.spinner}
          />
          
          <Text
            style={[
              styles.message,
              { color: colors.textPrimary },
            ]}
          >
            {message || defaultMessage}
          </Text>
          
          <Text
            style={[
              styles.subMessage,
              { color: colors.textSecondary },
            ]}
          >
            Data will refresh automatically
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  container: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minWidth: 280,
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  message: {
    ...typography.body,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subMessage: {
    ...typography.caption,
    textAlign: "center",
    fontSize: 13,
  },
});
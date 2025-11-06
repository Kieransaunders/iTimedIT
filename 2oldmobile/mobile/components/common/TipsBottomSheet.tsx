import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { X } from "lucide-react-native";
import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, spacing, typography, sizing } from "@/utils/theme";
import { lightTap } from "@/utils/haptics";
import { openWebApp } from "@/components";

const STORAGE_KEY = "tipsBottomSheet_showCount";
const MAX_AUTO_SHOWS = 3;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const BACKDROP_OPACITY = 0.5;

export interface TipsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function TipsBottomSheet({ visible, onClose }: TipsBottomSheetProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Announce when opened for accessibility
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(
        "Tips bottom sheet opened. This mobile app is optimized for quick time tracking."
      );
    }
  }, [visible]);

  // Animate sheet in/out based on visibility
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      backdropOpacity.value = withTiming(BACKDROP_OPACITY, { duration: 250 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 20,
        stiffness: 300,
      });
      backdropOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible, translateY, backdropOpacity]);

  const handleClose = useCallback(() => {
    lightTap();
    onClose();
  }, [onClose]);

  const handleOpenWebApp = useCallback(async () => {
    lightTap();
    await openWebApp("/");
    handleClose();
  }, [handleClose]);

  // Swipe down gesture handler
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        backdropOpacity.value = Math.max(
          0,
          BACKDROP_OPACITY * (1 - event.translationY / 300)
        );
      }
    })
    .onEnd((event) => {
      if (event.translationY > 150 || event.velocityY > 500) {
        // Dismiss if swiped down far enough or fast enough
        translateY.value = withSpring(SCREEN_HEIGHT, {
          damping: 20,
          stiffness: 300,
        });
        backdropOpacity.value = withTiming(0, { duration: 250 });
        runOnJS(handleClose)();
      } else {
        // Bounce back to open position
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
        backdropOpacity.value = withTiming(BACKDROP_OPACITY, { duration: 250 });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
      accessible={true}
      accessibilityLabel="Tips bottom sheet"
      accessibilityViewIsModal={true}
    >
      <GestureHandlerRootView style={styles.modalContainer}>
        {/* Backdrop */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessible={true}
          accessibilityLabel="Close tips sheet"
          accessibilityRole="button"
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.backdrop,
              animatedBackdropStyle,
            ]}
          />
        </Pressable>

        {/* Bottom Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.surface },
              animatedSheetStyle,
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandleContainer}>
              <View
                style={[
                  styles.dragHandle,
                  { backgroundColor: colors.textTertiary },
                ]}
              />
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessible={true}
              accessibilityLabel="Close tips"
              accessibilityRole="button"
            >
              <X size={sizing.iconSize.md} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.emoji}>💡</Text>
              <Text style={[styles.message, { color: colors.textPrimary }]}>
                This mobile app is optimized for quick time tracking. Use the
                web app for comprehensive project and team management.
              </Text>

              {/* Open Web App Button */}
              <TouchableOpacity
                onPress={handleOpenWebApp}
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                ]}
                accessible={true}
                accessibilityLabel="Open Web App"
                accessibilityRole="button"
                accessibilityHint="Opens the web app in your browser"
              >
                <Text style={styles.buttonText}>Open Web App</Text>
                <Text style={styles.externalIcon}>↗</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

/**
 * Hook to manage TipsBottomSheet auto-show logic
 * Tracks show count in AsyncStorage and determines if sheet should auto-show
 */
export function useTipsBottomSheet() {
  const [shouldAutoShow, setShouldAutoShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check show count on mount
  useEffect(() => {
    checkShouldAutoShow();
  }, []);

  const checkShouldAutoShow = async () => {
    try {
      const countStr = await AsyncStorage.getItem(STORAGE_KEY);
      const count = countStr ? parseInt(countStr, 10) : 0;
      setShouldAutoShow(count < MAX_AUTO_SHOWS);
    } catch (error) {
      console.error("Failed to check tips show count:", error);
      setShouldAutoShow(false);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsShown = async () => {
    try {
      const countStr = await AsyncStorage.getItem(STORAGE_KEY);
      const count = countStr ? parseInt(countStr, 10) : 0;
      const newCount = count + 1;
      await AsyncStorage.setItem(STORAGE_KEY, newCount.toString());
      setShouldAutoShow(newCount < MAX_AUTO_SHOWS);
    } catch (error) {
      console.error("Failed to update tips show count:", error);
    }
  };

  const resetShowCount = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setShouldAutoShow(true);
    } catch (error) {
      console.error("Failed to reset tips show count:", error);
    }
  };

  return {
    shouldAutoShow: !isLoading && shouldAutoShow,
    markAsShown,
    resetShowCount,
  };
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: "#000",
  },
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    minHeight: 200,
    maxHeight: SCREEN_HEIGHT * 0.9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 16,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    zIndex: 1,
    minWidth: sizing.minTouchTarget / 2,
    minHeight: sizing.minTouchTarget / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: "center",
    gap: spacing.md,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: sizing.buttonHeight,
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  externalIcon: {
    fontSize: 16,
    color: "#ffffff",
  },
});

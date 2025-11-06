import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import * as Haptics from "expo-haptics";

interface CTAButtonsProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryGuest?: () => void;
}

export const CTAButtons: React.FC<CTAButtonsProps> = ({
  onGetStarted,
  onSignIn,
  onTryGuest,
}) => {
  const { styles, theme } = useStyles(stylesheet);
  const router = useRouter();
  const { signInAnonymously } = useAuth();
  const [isGuestLoading, setIsGuestLoading] = React.useState(false);

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onGetStarted) {
      onGetStarted();
    } else {
      router.push("/auth/sign-up" as any);
    }
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onSignIn) {
      onSignIn();
    } else {
      router.push("/auth/sign-in");
    }
  };

  const handleTryGuest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onTryGuest) {
      onTryGuest();
    } else {
      setIsGuestLoading(true);
      try {
        await signInAnonymously();
        // Navigation will be handled by _layout.tsx auth guard
      } catch (error) {
        console.error("Guest sign-in failed:", error);
        setIsGuestLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Primary CTA - Get Started */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleGetStarted}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>

      {/* Secondary CTA - Sign In */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleSignIn}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryButtonText}>Sign In</Text>
      </TouchableOpacity>

      {/* Ghost CTA - Try as Guest */}
      <TouchableOpacity
        style={styles.ghostButton}
        onPress={handleTryGuest}
        activeOpacity={0.8}
        disabled={isGuestLoading}
      >
        {isGuestLoading ? (
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        ) : (
          <Text style={styles.ghostButtonText}>Try as Guest</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const stylesheet = createStyleSheet((theme) => ({
  container: {
    width: "100%",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    letterSpacing: 0.1,
  },
}));

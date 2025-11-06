import React, { useEffect, useRef } from "react";
import { View, Text, Image, Animated, Dimensions } from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const HeroSection: React.FC = () => {
  const { styles, theme } = useStyles(stylesheet);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <View style={styles.logoSegment1} />
          <View style={styles.logoSegment2} />
          <View style={styles.logoSegment3} />
          <View style={styles.logoHand} />
        </View>
      </View>

      {/* App Name */}
      <Text style={styles.appName}>iTimedIT</Text>

      {/* Tagline */}
      <Text style={styles.tagline}>Professional time tracking made simple</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Track time efficiently, manage project budgets, and stay focused on what
        matters most to your business.
      </Text>
    </Animated.View>
  );
};

const stylesheet = createStyleSheet((theme) => ({
  container: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  logoContainer: {
    marginBottom: theme.spacing.lg,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.background,
    position: "relative",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoSegment1: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    transform: [{ rotate: "0deg" }],
    overflow: "hidden",
  },
  logoSegment2: {
    position: "absolute",
    width: 50,
    height: 100,
    backgroundColor: theme.colors.accent,
    right: 0,
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
  },
  logoSegment3: {
    position: "absolute",
    width: 100,
    height: 50,
    backgroundColor: "#4B5563",
    bottom: 0,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  logoHand: {
    position: "absolute",
    width: 4,
    height: 40,
    backgroundColor: "#1F2937",
    left: 48,
    top: 10,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  appName: {
    fontSize: 36,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
}));

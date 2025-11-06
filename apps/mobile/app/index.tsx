import React, { useEffect } from "react";
import { ScrollView, View, StatusBar } from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { useRouter } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { HeroSection } from "../components/marketing/HeroSection";
import { FeatureCard } from "../components/marketing/FeatureCard";
import { CTAButtons } from "../components/marketing/CTAButtons";
import {
  Clock,
  DollarSign,
  Timer,
  Smartphone,
} from "lucide-react-native";

/**
 * Landing/Welcome Page for iTimedIT Mobile
 *
 * Shown to logged-out users as the first screen.
 * Displays marketing content with value proposition and CTAs.
 *
 * Auth Flow:
 * - Landing Page → Sign Up/Sign In → Main App
 * - Or: Landing Page → Try as Guest → Main App
 */
export default function LandingPage() {
  const { styles, theme } = useStyles(stylesheet);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to main app if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading]);

  // Show nothing while checking auth state
  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.background}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <HeroSection />

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          <FeatureCard
            icon={Clock}
            title="One-Tap Timer Start"
            description="Start tracking time instantly with quick project selection. No complex forms or setup required."
            iconColor={theme.colors.primary}
          />
          <FeatureCard
            icon={Smartphone}
            title="Lock Screen Control"
            description="Timer runs in the background with push notifications. Control your time tracking from anywhere."
            iconColor={theme.colors.accent}
          />
          <FeatureCard
            icon={DollarSign}
            title="Project & Budget Tracking"
            description="Monitor project budgets in real-time with automatic alerts when approaching limits."
            iconColor="#10B981"
          />
          <FeatureCard
            icon={Timer}
            title="Pomodoro & Focus Modes"
            description="Stay productive with built-in Pomodoro timer and customizable work intervals."
            iconColor="#8B5CF6"
          />
        </View>

        {/* CTA Buttons */}
        <CTAButtons />

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xxl,
  },
  featuresContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
}));

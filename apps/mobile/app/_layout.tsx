import { useAuth } from "@/hooks/useAuth";
import { convexClient } from "@/services/convex";
import { setupNotificationHandler, setupNotificationChannels, setupNotificationCategories } from "@/services/notifications";
import { tokenStorage } from "@/services/storage";
import { lightTheme, darkTheme } from "@/utils/theme";
import { ThemeProvider, useTheme } from "@/utils/ThemeContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { OrganizationErrorBoundary } from "@/components/common/OrganizationErrorBoundary";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";
import { UnistylesRegistry } from "react-native-unistyles";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Constants from "expo-constants";

// MVP: Global error handlers moved to index.js (run before ANY imports)
// This ensures fail-safe guards are active before module initialization

// Configure Unistyles with our themes
UnistylesRegistry.addThemes({
  light: lightTheme,
  dark: darkTheme,
}).addConfig({
  adaptiveThemes: true,
  initialTheme: "light",
});

/**
 * Protected layout component that handles authentication routing
 */
function ProtectedLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const notificationsInitialized = useRef(false);

  // MVP: Defer notification setup until AFTER first screen is visible
  // This prevents any notification-related crashes during app startup
  useEffect(() => {
    if (isLoading || notificationsInitialized.current) {
      return; // Don't initialize during loading or if already initialized
    }

    // Only initialize notifications after auth check is complete
    const initNotifications = async () => {
      try {
        console.log("[MVP] Initializing notifications after first render...");
        setupNotificationHandler();
        await setupNotificationChannels();
        await setupNotificationCategories();
        notificationsInitialized.current = true;
        console.log("[MVP] Notifications initialized successfully");
      } catch (error) {
        console.error("[MVP] Failed to setup notifications:", error);
        console.warn("[MVP] App will continue without notifications");
      }
    };

    // Delay by 1 second to ensure first screen is fully rendered
    const timer = setTimeout(initNotifications, 1000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) {
      // Still checking auth status, don't navigate yet
      return;
    }

    const inAuthGroup = segments[0] === "auth";

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and trying to access protected route
      // Redirect to sign-in
      router.replace("/auth/sign-in");
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but on auth screen
      // Redirect to main app
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Always wrap with OrganizationProvider to prevent race conditions
  // Pass null userId when not authenticated - provider handles this gracefully
  return (
    <OrganizationErrorBoundary>
      <OrganizationProvider userId={user?._id ?? null}>
        <Slot />
      </OrganizationProvider>
    </OrganizationErrorBoundary>
  );
}

export default function RootLayout() {
  // MVP: Notification setup moved to ProtectedLayout (after first screen renders)
  // This prevents notification-related crashes during early app startup

  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <ConvexAuthProvider client={convexClient} storage={tokenStorage}>
          <ProtectedLayout />
          <Toast />
        </ConvexAuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

import { useAuth } from "@/hooks/useAuth";
import { convexClient } from "@/services/convex";
import { setupNotificationChannels, setupNotificationCategories } from "@/services/notifications";
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
// Global error handlers to prevent silent crashes
// Set up before any component rendering

// Handle unhandled promise rejections
// Note: ErrorUtils is a global object in React Native, not an import
declare const ErrorUtils: {
  setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void;
  getGlobalHandler: () => ((error: Error, isFatal: boolean) => void) | undefined;
};

const originalPromiseRejectionHandler = typeof ErrorUtils !== 'undefined'
  ? ErrorUtils.getGlobalHandler?.()
  : undefined;

if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error("🚨 Global Error Handler:", error);
    console.error("Is Fatal:", isFatal);
    console.error("Stack:", error?.stack);

    // Call original handler if it exists
    if (originalPromiseRejectionHandler) {
      originalPromiseRejectionHandler(error, isFatal);
    }
  });
}

// Note: React Native doesn't have global.addEventListener for promise rejections
// The ErrorUtils handler above already catches most unhandled errors

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
  useEffect(() => {
    // Set up notification channels and categories on app start
    // Wrap in async IIFE with error handling to prevent crashes
    (async () => {
      try {
        await setupNotificationChannels();
        await setupNotificationCategories();
        console.log("Notification setup completed successfully");
      } catch (error) {
        // Log error but don't crash the app
        console.error("Failed to setup notifications:", error);
        console.warn("App will continue without notifications");
      }
    })();
  }, []);

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

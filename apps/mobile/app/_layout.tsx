import { useAuth } from "@/hooks/useAuth";
import { convexClient } from "@/services/convex";
import { setupNotificationChannels, setupNotificationCategories } from "@/services/notifications";
import { tokenStorage } from "@/services/storage";
import { lightTheme, darkTheme } from "@/utils/theme";
import { ThemeProvider, useTheme } from "@/utils/ThemeContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { OrganizationErrorBoundary } from "@/components/common/OrganizationErrorBoundary";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";
import { UnistylesRegistry } from "react-native-unistyles";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

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
    setupNotificationChannels();
    setupNotificationCategories();
  }, []);

  return (
    <ThemeProvider>
      <ConvexAuthProvider client={convexClient} storage={tokenStorage}>
        <ProtectedLayout />
        <Toast />
      </ConvexAuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

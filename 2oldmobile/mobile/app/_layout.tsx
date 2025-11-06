// Polyfills for React Native
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

// 🔍 CRASH TEST: Commenting out Unistyles to test if it causes Hermes crash
// Initialize Unistyles
// import "../styles/unistyles";

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
// 🔍 CRASH TEST: Commenting out reanimated to test if it causes Hermes crash
// import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { convex } from "../services/convex";
import { OrganizationProvider } from "../contexts/OrganizationContext";
import { ThemeProvider } from "../utils/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { InterruptBanner } from "../components/timer/InterruptBanner";
// 🔍 CRASH TEST: Commenting out notifications import (module may load at import time)
// import { initializeNotifications } from "../services/notifications";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // ...FontAwesome.font, // Temporarily disabled to debug crash
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch((err) => {
        console.error("Failed to hide splash screen:", err);
      });
    }
  }, [loaded]);

  // 🔍 CRASH TEST: Commenting out notification init to test if it causes Hermes crash
  // // Initialize notifications system early to prevent crashes
  // useEffect(() => {
  //   // Lazy initialization - run after component mounts to prevent startup crashes
  //   const timer = setTimeout(() => {
  //     initializeNotifications().catch((err) => {
  //       console.error("Failed to initialize notifications in _layout:", err);
  //     });
  //   }, 0);

  //   return () => clearTimeout(timer);
  // }, []);

  if (!loaded) {
    return null;
  }

  // Wrap in try-catch to prevent Hermes crashes during provider initialization in release builds
  try {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ConvexAuthProvider client={convex} storage={AsyncStorage}>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </ConvexAuthProvider>
      </GestureHandlerRootView>
    );
  } catch (err) {
    console.error("Fatal error in RootLayout:", err);
    throw err;
  }
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Handle authentication redirects with null safety guards
  useEffect(() => {
    if (isLoading) return;

    try {
      // Defensive array access to prevent Hermes crash in release builds
      const firstSegment = Array.isArray(segments) && segments.length > 0 ? segments[0] : null;
      const inAuthGroup = firstSegment === "auth";
      const inTabsGroup = firstSegment === "(tabs)";
      const onLandingPage = Array.isArray(segments) && segments.length === 0;

      if (!user && inTabsGroup) {
        // Not authenticated and trying to access protected tabs → Redirect to landing page
        router.replace("/");
      } else if (user && (inAuthGroup || onLandingPage)) {
        // Authenticated and on auth/landing page → Redirect to tabs
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Error in navigation redirect:", err);
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return null;
  }

  return (
    <OrganizationProvider userId={user?._id ?? null}>
      <NavigationThemeProvider value={DarkTheme}>
        <InterruptBanner />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </NavigationThemeProvider>
    </OrganizationProvider>
  );
}

// Polyfills for React Native
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

// Initialize Unistyles
import "../styles/unistyles";

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ConvexAuthProvider } from "@convex-dev/auth/react";

import { convex } from "../services/convex";
import { OrganizationProvider } from "../contexts/OrganizationContext";
import { ThemeProvider } from "../utils/ThemeContext";
import { useAuth } from "../hooks/useAuth";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ConvexAuthProvider client={convex}>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Handle authentication redirects
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!user && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace("/auth/sign-in");
    } else if (user && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return null;
  }

  return (
    <OrganizationProvider userId={user?._id ?? null}>
      <NavigationThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </NavigationThemeProvider>
    </OrganizationProvider>
  );
}

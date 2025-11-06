import { ConfigContext, ExpoConfig } from "expo/config";

// Dynamically get the reversed client ID for the Google OAuth scheme
// Note: Using index-based string manipulation to avoid Hermes array operations crash in release builds
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
let googleClientScheme: string | undefined;
if (googleClientId && typeof googleClientId === 'string' && googleClientId.includes('.')) {
  try {
    // Safe string reversal without array operations (avoids Hermes DictPropertyMap crash)
    const parts: string[] = [];
    let currentPart = '';

    for (let i = 0; i < googleClientId.length; i++) {
      const char = googleClientId.charAt(i);
      if (char === '.') {
        if (currentPart) {
          parts.push(currentPart);
          currentPart = '';
        }
      } else {
        currentPart += char;
      }
    }
    if (currentPart) {
      parts.push(currentPart);
    }

    // Reverse by building from end to start
    let reversed = '';
    for (let i = parts.length - 1; i >= 0; i--) {
      reversed += parts[i];
      if (i > 0) reversed += '.';
    }

    googleClientScheme = reversed || undefined;
  } catch (error) {
    console.warn('Failed to generate Google OAuth scheme:', error);
    googleClientScheme = undefined;
  }
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "iTimedIT",
  slug: "itimedit",
  version: "1.0.2",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "itimeditapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1a1a2e",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.itimedit.app",
    infoPlist: {
      UIBackgroundModes: ["fetch", "remote-notification"],
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "itimeditapp",
            ...(googleClientScheme ? [googleClientScheme] : []),
          ],
        },
      ],
    },
  },
  android: {
    package: "com.itimedit.app",
    permissions: ["VIBRATE", "RECEIVE_BOOT_COMPLETED"],
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "itimeditapp",
            host: "auth",
            pathPrefix: "/callback",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
    "expo-background-fetch",
    "expo-task-manager",
  ],
  experiments: {
    typedRoutes: true,
    autolinkingModuleResolution: true,
  },
  extra: {
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL,
    router: {
      origin: false,
    },
    eas: {
      projectId: "a7118405-a040-4c3e-b89f-32b9d3112242",
    },
  },
});

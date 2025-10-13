import { ConfigContext, ExpoConfig } from "expo/config";

// Dynamically get the reversed client ID for the Google OAuth scheme
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const googleClientScheme = googleClientId?.split(".").reverse().join(".");

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "iTimedIT",
  slug: "itimedit",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "itimeditapp",
  userInterfaceStyle: "dark",
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
          CFBundleURLSchemes: ["itimeditapp"],
        },
        // Add Google OAuth redirect scheme if client ID is configured
        ...(googleClientScheme
          ? [
              {
                CFBundleURLSchemes: [googleClientScheme],
              },
            ]
          : []),
      ],
    },
  },
  android: {
    icon: "./assets/images/icon.png",
    package: "com.itimedit.app",
    permissions: ["RECEIVE_BOOT_COMPLETED", "VIBRATE", "SCHEDULE_EXACT_ALARM"],
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
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-background-fetch",
    "expo-task-manager",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#1a1a2e",
        dark: {
          backgroundColor: "#1a1a2e",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "your-project-id",
    },
  },
});
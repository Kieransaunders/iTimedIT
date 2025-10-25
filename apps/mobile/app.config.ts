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
  newArchEnabled: true,
  owner: "iconnectit",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1a1a2e",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.itimedit.app",
    infoPlist: {
      UIBackgroundModes: ["fetch", "remote-notification", "processing"],
      BGTaskSchedulerPermittedIdentifiers: ["timer-heartbeat-task"],
      NSSupportsLiveActivities: true,
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "itimeditapp",
            ...(googleClientScheme ? [googleClientScheme] : []),
          ],
        },
      ],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    icon: "./assets/images/icon.png",
    package: "com.itimedit.app",
    permissions: [
      "RECEIVE_BOOT_COMPLETED",
      "VIBRATE",
      "SCHEDULE_EXACT_ALARM",
      "FOREGROUND_SERVICE",
      "WAKE_LOCK",
      "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    ],
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
    "expo-live-activity",
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
    webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL,
    router: {
      origin: false,
    },
    eas: {
      projectId: "9765d9ef-1bbf-43eb-9200-6ecd31389a64",
    },
  },
  userInterfaceStyle: "automatic",
});

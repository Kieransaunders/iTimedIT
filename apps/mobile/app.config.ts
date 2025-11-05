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
  plugins: ["expo-router", "expo-secure-store"],
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
  },
});

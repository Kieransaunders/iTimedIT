import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import sitemap from "vite-plugin-sitemap";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    sitemap({
      hostname: "https://itimedit.app", // Replace with your actual domain
      dynamicRoutes: [
        "/",
        "/features",
        "/pricing",
        "/faq",
        "/about",
        "/privacy",
        "/support",
        "/terms",
      ],
    }),
    // Only include Sentry plugin if auth token is configured
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: "serenity-dev",
            project: "itimedit",
            authToken: process.env.SENTRY_AUTH_TOKEN,
          }),
        ]
      : []),
    ...(mode === "production"
      ? [visualizer({ filename: "dist/stats.html" })]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
  },
}));

import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import sitemap from "vite-plugin-sitemap";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      srcDir: "public",
      filename: "sw.js",
      strategies: "injectManifest",
      injectRegister: "auto",
      includeAssets: ["icon.png", "icons/*.svg", "Sounds/*.mp3"],
      manifest: {
        name: "iTimedIT - Time Tracking",
        short_name: "iTimedIT",
        description: "Professional time tracking and project management",
        theme_color: "#F85E00",
        background_color: "#1f2937",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "business", "utilities"],
        icons: [
          {
            src: "/icon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Start Timer",
            short_name: "Timer",
            description: "Start tracking time",
            url: "/",
            icons: [
              {
                src: "/icons/timer.svg",
                sizes: "96x96",
              },
            ],
          },
          {
            name: "View Entries",
            short_name: "Entries",
            description: "View time entries",
            url: "/entries",
            icons: [
              {
                src: "/icons/list.svg",
                sizes: "96x96",
              },
            ],
          },
          {
            name: "Quick Entry",
            short_name: "Add",
            description: "Add quick time entry",
            url: "/?action=quickEntry",
            icons: [
              {
                src: "/icons/plus.svg",
                sizes: "96x96",
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "convex-api-cache",
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:js|css|woff2)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            urlPattern: /\.(?:mp3|wav|ogg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "audio-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
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

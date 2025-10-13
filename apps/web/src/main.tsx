import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as Sentry from "@sentry/react";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";

Sentry.init({
  dsn: "https://6067a602869754bdf4e3dc3a4c02ed45@o4509537295532033.ingest.de.sentry.io/4510146354020432",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: true,
  environment: import.meta.env.MODE,
});

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </HelmetProvider>,
);

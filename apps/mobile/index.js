// Entry point for Expo Router in monorepo setup
// Replicates expo-router/entry with explicit app directory

// ===== MVP FAIL-SAFE GUARDS =====
// Prevent crashes from error.stack access and unhandled rejections
// These guards run BEFORE any other code to catch early startup issues

// 1. Disable stack traces to avoid Error.stack getter crashes
//    (harmless in JSC, protective if reverting to Hermes later)
if (typeof Error !== 'undefined') {
  try {
    Error.stackTraceLimit = 0;
  } catch (e) {
    // Ignore if stackTraceLimit is not writable
  }
}

// 2. Make unhandled promise rejections non-fatal
//    Log them instead of crashing the app
if (typeof global !== 'undefined') {
  global.onunhandledrejection = (event) => {
    try {
      const reason = (event && event.reason) || event;
      // Don't access reason.stack directly - use safe getter if available
      const message = reason && typeof reason === 'object' && 'message' in reason
        ? reason.message
        : String(reason);
      console.warn('[MVP Guard] Unhandled promise rejection:', message);
    } catch (err) {
      console.warn('[MVP Guard] Unhandled rejection (could not parse)');
    }
  };
}

// 3. Catch global errors that escape error boundaries
if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
  const originalHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      console.error('[MVP Guard] Global error:', error && error.message || String(error));
      console.error('[MVP Guard] Is fatal:', isFatal);
    } catch (e) {
      console.error('[MVP Guard] Error logging failed');
    }
    // Call original handler if it exists
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}
// ===== END MVP FAIL-SAFE GUARDS =====

import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);

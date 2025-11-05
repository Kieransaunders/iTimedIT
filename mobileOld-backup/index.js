// Entry point for Expo Router in monorepo setup
// Replicates expo-router/entry with explicit app directory
import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);

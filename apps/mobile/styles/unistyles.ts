import { UnistylesRegistry } from 'react-native-unistyles';
import { lightTheme, darkTheme } from '@/utils/theme';

// Define the themes
type AppThemes = {
  light: typeof lightTheme;
  dark: typeof darkTheme;
};

// Extend the library types
declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
}

// Lazy initialization flag to prevent Hermes crash in release builds
let unistylesInitialized = false;

// Initialize Unistyles (call this after app mounts, not at module load time)
export function initializeUnistyles(): void {
  if (unistylesInitialized) {
    return; // Already initialized
  }

  try {
    UnistylesRegistry
      .addThemes({
        light: lightTheme,
        dark: darkTheme,
      })
      .addConfig({
        adaptiveThemes: true,
      });

    unistylesInitialized = true;
    console.log('✓ Unistyles initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Unistyles registry:', error);
    // App will continue with default theme system
  }
}

// For backwards compatibility, auto-initialize (but with delay to avoid Hermes crash)
if (typeof setTimeout !== 'undefined') {
  setTimeout(() => {
    initializeUnistyles();
  }, 0);
}

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

// Register the themes
UnistylesRegistry
  .addThemes({
    light: lightTheme,
    dark: darkTheme,
  })
  .addConfig({
    adaptiveThemes: true,
  });

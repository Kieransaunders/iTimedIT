import type { lightTheme, darkTheme } from './utils/theme';

declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    light: typeof lightTheme;
    dark: typeof darkTheme;
  }
}

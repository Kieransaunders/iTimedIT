/**
 * Navigation types for Expo Router
 */

export type RootStackParamList = {
  "(tabs)": undefined;
  "auth/sign-in": undefined;
  "modals/project-selector": undefined;
  "modals/category-selector": undefined;
  "modals/manual-entry": { entryId?: string };
  "+not-found": undefined;
};

export type TabParamList = {
  index: undefined;
  projects: undefined;
  entries: undefined;
  settings: undefined;
};

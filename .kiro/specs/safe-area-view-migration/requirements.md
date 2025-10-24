# Requirements Document

## Introduction

This feature addresses the deprecation warning for SafeAreaView from React Native core by migrating to the recommended `react-native-safe-area-context` library. The deprecated SafeAreaView will be removed in a future React Native release, so this migration ensures the mobile app remains compatible and follows current best practices.

## Glossary

- **SafeAreaView**: A deprecated React Native core component that renders content within the safe area boundaries of a device
- **react-native-safe-area-context**: The recommended third-party library that provides SafeAreaProvider and SafeAreaView components with enhanced functionality
- **Mobile App**: The React Native Expo application located in apps/mobile
- **Modal Components**: React Native Modal components that currently use the deprecated SafeAreaView

## Requirements

### Requirement 1

**User Story:** As a developer, I want to eliminate deprecation warnings from the mobile app, so that the codebase remains maintainable and compatible with future React Native versions

#### Acceptance Criteria

1. WHEN the Mobile App starts, THE Mobile App SHALL NOT display deprecation warnings related to SafeAreaView
2. THE Mobile App SHALL use SafeAreaView from react-native-safe-area-context instead of React Native core
3. THE Mobile App SHALL maintain existing safe area behavior in all components that currently use SafeAreaView
4. THE Mobile App SHALL render content within device safe area boundaries as it did before the migration

### Requirement 2

**User Story:** As a developer, I want all SafeAreaView imports updated to use the recommended library, so that the code follows current React Native best practices

#### Acceptance Criteria

1. THE Mobile App SHALL import SafeAreaView from react-native-safe-area-context in all component files
2. THE Mobile App SHALL NOT import SafeAreaView from react-native core library
3. WHEN a component file uses SafeAreaView, THE Mobile App SHALL include the correct import statement from react-native-safe-area-context
4. THE Mobile App SHALL update exactly 2 component files that currently use the deprecated SafeAreaView

### Requirement 3

**User Story:** As a user, I want modal screens to continue displaying correctly with proper safe area handling, so that content is not obscured by device notches or system UI

#### Acceptance Criteria

1. WHEN the ClientPickerModal displays, THE Mobile App SHALL render content within safe area boundaries
2. WHEN the ProjectSelectorModal displays, THE Mobile App SHALL render content within safe area boundaries
3. THE Mobile App SHALL maintain the existing visual layout and styling of modal components after migration
4. THE Mobile App SHALL preserve all existing functionality of components using SafeAreaView

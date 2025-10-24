# Design Document

## Overview

This design addresses the migration from React Native's deprecated SafeAreaView to the recommended `react-native-safe-area-context` library. The migration is straightforward as the library is already installed and provides a drop-in replacement with the same API surface.

The scope is limited to 2 modal components:
- `ClientPickerModal.tsx` - A modal for selecting clients
- `ProjectSelectorModal.tsx` - A modal for selecting and creating projects

Both components use SafeAreaView as the root container within a Modal component to ensure content respects device safe areas (notches, status bars, home indicators).

## Architecture

### Current State
```
Modal (React Native)
└── SafeAreaView (React Native - DEPRECATED)
    └── Content
```

### Target State
```
Modal (React Native)
└── SafeAreaView (react-native-safe-area-context)
    └── Content
```

### Key Differences
The `react-native-safe-area-context` library provides:
- Better performance through native modules
- More accurate safe area calculations
- Active maintenance and future compatibility
- Same component API (drop-in replacement)

## Components and Interfaces

### Affected Components

#### 1. ClientPickerModal (`apps/mobile/components/clients/ClientPickerModal.tsx`)
**Current Import:**
```typescript
import { Modal, SafeAreaView, FlatList, ... } from "react-native";
```

**Target Import:**
```typescript
import { Modal, FlatList, ... } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
```

**Usage Pattern:**
- SafeAreaView wraps the entire modal content
- Applies dynamic background color from theme
- Contains header, loading states, and FlatList

#### 2. ProjectSelectorModal (`apps/mobile/components/projects/ProjectSelectorModal.tsx`)
**Current Import:**
```typescript
import { ActivityIndicator, FlatList, Modal, SafeAreaView, ... } from "react-native";
```

**Target Import:**
```typescript
import { ActivityIndicator, FlatList, Modal, ... } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
```

**Usage Pattern:**
- SafeAreaView wraps the entire modal content
- Uses static background color from theme constants
- Contains complex nested views with forms and lists

### No Component API Changes Required
The SafeAreaView component from `react-native-safe-area-context` accepts the same props as the deprecated version:
- `style` prop works identically
- Children rendering is unchanged
- No behavioral differences for basic usage

## Data Models

No data model changes required. This is purely a dependency migration.

## Error Handling

### Potential Issues

1. **Import Resolution**
   - Risk: Import statement might fail if package not properly installed
   - Mitigation: Package is already in dependencies (verified in package.json)
   - Fallback: None needed - build will fail clearly if package missing

2. **Runtime Behavior**
   - Risk: Different safe area calculations could affect layout
   - Mitigation: Library is widely adopted and provides consistent behavior
   - Testing: Visual verification of both modals on devices with notches

3. **Build Issues**
   - Risk: Native module linking might fail
   - Mitigation: Expo manages native dependencies automatically
   - Fallback: Clear error messages will indicate linking issues

### Error Scenarios
No new error handling code required. The component API is identical, so existing error boundaries and error handling remain unchanged.

## Testing Strategy

### Manual Testing
1. **Visual Verification**
   - Open ClientPickerModal on device with notch (iPhone X+)
   - Verify header and close button are not obscured
   - Open ProjectSelectorModal on device with notch
   - Verify all interactive elements are accessible
   - Test on Android devices with different screen configurations

2. **Functional Testing**
   - Verify all modal interactions work as before
   - Test client selection flow
   - Test project creation flow
   - Verify modal dismissal works correctly

3. **Theme Testing**
   - Test both modals in light and dark themes
   - Verify background colors apply correctly
   - Ensure safe area respects theme colors

### Deprecation Warning Verification
1. Run the mobile app in development mode
2. Open both modals
3. Check console/logs for deprecation warnings
4. Confirm no SafeAreaView deprecation warnings appear

### Regression Testing
Since this is a drop-in replacement with identical API:
- No unit tests need modification
- No integration tests need modification
- Existing test coverage remains valid

## Implementation Notes

### Migration Steps
1. Update import statement in `ClientPickerModal.tsx`
   - Remove SafeAreaView from react-native import
   - Add new import for SafeAreaView from react-native-safe-area-context

2. Update import statement in `ProjectSelectorModal.tsx`
   - Remove SafeAreaView from react-native import
   - Add new import for SafeAreaView from react-native-safe-area-context

3. No code changes to component logic or JSX required

### Dependencies
- `react-native-safe-area-context` version `~5.6.0` (already installed)
- No additional dependencies required
- No peer dependency conflicts

### Compatibility
- Works with Expo SDK 54
- Compatible with React Native 0.81.4
- No breaking changes to existing functionality

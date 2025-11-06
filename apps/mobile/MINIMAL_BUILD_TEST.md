# Minimal Build Test - Suspect Packages Removed

## 🎯 Goal
Test if the Hermes crash is caused by specific packages that perform complex operations during module initialization.

## ✅ Changes Made

We've commented out the **4 most suspicious** module-level imports/operations in `app/_layout.tsx`:

### 1. **Unistyles** (Line 7)
```typescript
// 🔍 CRASH TEST: Commenting out Unistyles to test if it causes Hermes crash
// import "../styles/unistyles";
```
**Why suspect:** Creates stylesheet objects with many properties at module load time

### 2. **React Native Reanimated** (Line 16)
```typescript
// 🔍 CRASH TEST: Commenting out reanimated to test if it causes Hermes crash
// import 'react-native-reanimated';
```
**Why suspect:** Animation library that initializes native modules and worklets

### 3. **FontAwesome.font Spread** (Line 44)
```typescript
const [loaded, error] = useFonts({
  SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  // ...FontAwesome.font,  // COMMENTED OUT FOR TESTING
});
```
**Why suspect:** Object spread operation that iterates over many icon properties

### 4. **Notification Initialization** (Lines 62-71)
```typescript
// 🔍 CRASH TEST: Commenting out notification init to test if it causes Hermes crash
// useEffect(() => {
//   const timer = setTimeout(() => {
//     initializeNotifications().catch((err) => {
//       console.error("Failed to initialize notifications in _layout:", err);
//     });
//   }, 0);
//   return () => clearTimeout(timer);
// }, []);
```
**Why suspect:** Native module initialization with channel creation

---

## 🚀 Build and Test

### Step 1: Build with EAS
```bash
cd apps/mobile

# Build production version for iOS
eas build --profile production --platform ios

# Monitor build progress
eas build:list
```

### Step 2: Upload to TestFlight
The build will automatically upload to TestFlight when complete.

### Step 3: Test on Device
1. Install from TestFlight
2. **Launch the app**
3. **Does it crash immediately on startup?**

---

## 📊 Expected Results

### ✅ Scenario A: App Does NOT Crash
**Conclusion:** One (or more) of the removed packages was causing the crash!

**Next Steps:**
1. Add back packages **one at a time** to identify the specific culprit:
   - First: Re-enable Unistyles
   - Second: Re-enable Reanimated
   - Third: Re-enable FontAwesome spread
   - Fourth: Re-enable Notifications
2. Rebuild and test after each addition
3. When crash reappears, you've found the culprit!

### ❌ Scenario B: App STILL Crashes
**Conclusion:** The crash is NOT caused by these packages

**Next Steps:**
1. The problem is in:
   - **Providers** (ConvexAuthProvider, ThemeProvider, OrganizationProvider)
   - **Convex client** initialization
   - **OrganizationContext** state management
   - **Another module-level import** we haven't identified

2. Follow `STARTUP_CRASH_ANALYSIS.md` Stage D:
   - Remove OrganizationProvider
   - Test with minimal providers
   - Add back one-by-one

---

## 🔄 Restoring Removed Code

If the app doesn't crash, add back **one package at a time**:

### Add Back Unistyles
```typescript
// app/_layout.tsx line 7
import "../styles/unistyles";
```
Build → Test → If crashes, Unistyles is the culprit!

### Add Back Reanimated
```typescript
// app/_layout.tsx line 16
import 'react-native-reanimated';
```
Build → Test → If crashes, Reanimated is the culprit!

### Add Back FontAwesome
```typescript
// app/_layout.tsx line 44
const [loaded, error] = useFonts({
  SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  ...FontAwesome.font,
});
```
Build → Test → If crashes, FontAwesome spread is the culprit!

### Add Back Notifications
```typescript
// app/_layout.tsx lines 62-71
useEffect(() => {
  const timer = setTimeout(() => {
    initializeNotifications().catch((err) => {
      console.error("Failed to initialize notifications in _layout:", err);
    });
  }, 0);
  return () => clearTimeout(timer);
}, []);
```
Build → Test → If crashes, notification init is the culprit!

---

## 🎯 Known Fixes for Each Culprit

### If Unistyles is the problem:
1. **Update to latest version**: `npm install react-native-unistyles@latest`
2. **Defer initialization**:
   ```typescript
   useEffect(() => {
     import("../styles/unistyles").catch(console.error);
   }, []);
   ```
3. **Replace with StyleSheet.create()**: Use React Native's built-in styling

### If Reanimated is the problem:
1. **Update to latest**: `npm install react-native-reanimated@latest`
2. **Configure Hermes**: Check babel.config.js has reanimated plugin
3. **Rebuild native**: `npx expo prebuild --clean`

### If FontAwesome spread is the problem:
1. **Load fonts individually**:
   ```typescript
   const [loaded] = useFonts({
     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
     'FontAwesome': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
   });
   ```

### If Notifications are the problem:
1. **Defer to after mount**:
   ```typescript
   useEffect(() => {
     // Wait 2 seconds before initializing
     const timer = setTimeout(() => {
       initializeNotifications().catch(console.error);
     }, 2000);
     return () => clearTimeout(timer);
   }, []);
   ```

---

## 📝 Testing Checklist

Mark as you test:

- [ ] Built minimal version (no suspects)
- [ ] Uploaded to TestFlight
- [ ] Tested on device
- [ ] **Result: Crashed / Did Not Crash**

If did not crash, add back one-by-one:

- [ ] Added Unistyles → Result: ___________
- [ ] Added Reanimated → Result: ___________
- [ ] Added FontAwesome → Result: ___________
- [ ] Added Notifications → Result: ___________

**Culprit identified**: ___________________________

---

## 🏁 Quick Commands

```bash
# Build for TestFlight
eas build --profile production --platform ios

# Check build status
eas build:list

# View build logs
eas build:view [build-id]

# Restore original _layout.tsx if needed
git diff apps/mobile/app/_layout.tsx
git checkout apps/mobile/app/_layout.tsx
```

---

## 💡 Pro Tips

1. **Keep crash logs**: Save each TestFlight crash report
2. **Check Xcode console**: Use macOS Console app to see device logs
3. **Test locally first**: Use `npx expo run:ios --configuration Release` before uploading
4. **One change at a time**: Only modify one thing per build
5. **Document everything**: Keep notes of what you tried

Good luck! 🎯

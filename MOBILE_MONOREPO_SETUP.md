# Mobile App Monorepo Integration ✅

Your mobile app has been successfully integrated into the iTimedIT monorepo!

## 📁 Updated Structure

```
iTimedIT/
├── apps/
│   ├── web/              # React + Vite web application
│   │   ├── src/          # Web app source code
│   │   ├── convex/       # Convex backend
│   │   └── package.json  # @itimedit/web
│   │
│   └── mobile/           # React Native + Expo mobile app
│       ├── app/          # Mobile app screens
│       ├── components/   # Mobile components
│       ├── services/     # Mobile services
│       └── package.json  # @itimedit/mobile
│
├── packages/
│   └── shared/           # Shared code between web & mobile
│       ├── src/
│       │   └── index.ts  # Shared types and utilities
│       └── package.json  # @itimedit/shared
│
└── package.json          # Root workspace configuration
```

## 🔧 Changes Made

1. ✅ Renamed mobile app package from `itimeditapp` to `@itimedit/mobile`
2. ✅ Added `@itimedit/shared` dependency to mobile app
3. ✅ Updated mobile app's tsconfig.json with path mapping for shared package
4. ✅ Added mobile scripts to root package.json:
   - `npm run dev:mobile` - Start Expo dev server
   - `npm run build:mobile` - Build mobile app
   - `npm run ios` - Run on iOS simulator
   - `npm run android` - Run on Android emulator

## 🚀 Getting Started

### First Time Setup

1. **Install all dependencies:**

   ```bash
   npm install
   npm install --workspaces
   ```

2. **Build the shared package:**

   ```bash
   cd packages/shared && npm run build && cd ../..
   ```

3. **Install mobile dependencies (if needed):**

   ```bash
   cd apps/mobile && npm install && cd ../..
   ```

### Development Workflow

**Start Web App:**

```bash
npm run dev:web
```

**Start Mobile App:**

```bash
npm run dev:mobile
```

**Run on iOS:**

```bash
npm run ios
```

**Run on Android:**

```bash
npm run android
```

## 📦 Using Shared Code

Both web and mobile apps can now import from the shared package:

```typescript
// In apps/web/src or apps/mobile/app
import { formatTime, validateEmail, TimerData, User } from '@itimedit/shared';

const time = formatTime(3665); // "1:01:05"
const isValid = validateEmail('user@example.com'); // true
```

### Important: Rebuilding Shared Package

After making changes to `packages/shared/src/`, you must rebuild:

```bash
cd packages/shared
npm run build
```

Or use watch mode during development:

```bash
cd packages/shared
npm run dev  # Watches for changes and rebuilds automatically
```

## 🔄 Development Workflow

### Adding Shared Code

1. Add your code to `packages/shared/src/index.ts`
2. Build the package: `cd packages/shared && npm run build`
3. Import in web or mobile apps using `@itimedit/shared`

### Web Development

1. Work in `apps/web/src/`
2. Run `npm run dev:web` from root
3. Access at <http://localhost:5173>

### Mobile Development

1. Work in `apps/mobile/app/`
2. Run `npm run dev:mobile` from root
3. Scan QR code with Expo Go app or run on simulator

## 🎯 Common Commands

### Root Level

```bash
npm run dev              # Start web app (default)
npm run dev:web          # Start web dev server
npm run dev:mobile       # Start Expo dev server
npm run build:web        # Build web for production
npm run build:mobile     # Export mobile app
npm run ios              # Run mobile on iOS
npm run android          # Run mobile on Android
npm run lint             # Lint all workspaces
npm run test             # Test all workspaces
npm run clean            # Remove all node_modules
npm run install:all      # Reinstall all dependencies
```

### Web App (apps/web)

```bash
cd apps/web
npm run dev              # Start dev server + Convex
npm run dev:frontend     # Start only Vite
npm run dev:backend      # Start only Convex
npm run build            # Build for production
npm run test             # Run tests
```

### Mobile App (apps/mobile)

```bash
cd apps/mobile
npm run start            # Start Expo dev server
npm run ios              # Run on iOS
npm run android          # Run on Android
npm run build            # Export app
npm run lint             # Lint mobile code
```

### Shared Package (packages/shared)

```bash
cd packages/shared
npm run build            # Build TypeScript
npm run dev              # Watch mode
npm run clean            # Remove dist folder
```

## 🔧 Configuration Files

### Mobile App TypeScript Config

The mobile app's `tsconfig.json` now includes path mapping:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@itimedit/shared": ["../../packages/shared/src"]
    }
  }
}
```

### Root Package.json

Workspaces are configured to include both apps:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

## 🐛 Troubleshooting

### Mobile app can't find shared package

```bash
# Rebuild shared package
cd packages/shared && npm run build

# Reinstall mobile dependencies
cd apps/mobile && npm install

# Clear Expo cache
cd apps/mobile && npx expo start -c
```

### TypeScript errors in mobile app

```bash
# Ensure shared package is built
cd packages/shared && npm run build

# Restart TypeScript server in your IDE
```

### Metro bundler issues

```bash
# Clear Metro cache
cd apps/mobile
npx expo start -c

# Or reset the project
npm run reset-project
```

### Web app issues

```bash
# Ensure Convex is running
cd apps/web
npm run dev:backend

# Check .env.local exists
ls -la .env.local
```

## 📱 Mobile-Specific Setup

### iOS Development

- Requires macOS with Xcode installed
- Run `npm run ios` to build and launch iOS simulator

### Android Development

- Requires Android Studio and Android SDK
- Run `npm run android` to build and launch Android emulator

### Expo Go

- Install Expo Go app on your physical device
- Run `npm run dev:mobile` and scan QR code

## 🔗 Backend Integration

Both web and mobile apps share the same Convex backend:

- Backend code is in `apps/web/convex/`
- `apps/mobile/convex/` is a symlink to `apps/web/convex/`
- Both apps use the same Convex deployment
- Web app: `.env.local` has `VITE_CONVEX_URL`
- Mobile app: `.env.local` has `EXPO_PUBLIC_CONVEX_URL`
- Both point to the same deployment URL

## 📝 Next Steps

1. ✅ Run `npm install --workspaces` to link packages
2. ✅ Build shared package: `cd packages/shared && npm run build`
3. ✅ Test web app: `npm run dev:web`
4. ✅ Test mobile app: `npm run dev:mobile`
5. 🎉 Start building features!

## 💡 Tips

- Keep shared package in watch mode during development: `cd packages/shared && npm run dev`
- Use `npm run clean` if you encounter dependency issues
- Mobile and web can have different UI but share business logic via `@itimedit/shared`
- Consider moving Convex types to shared package for better type safety across apps

## 🔗 Resources

- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [Convex Documentation](https://docs.convex.dev/)
- [Vite Documentation](https://vitejs.dev/)
ccd

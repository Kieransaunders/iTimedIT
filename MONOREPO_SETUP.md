# Monorepo Setup Complete ✅

Your iTimedIT project has been successfully converted to a monorepo structure!

## 📁 Structure

```
iTimedIT/
├── apps/
│   ├── web/              # React + Vite web application
│   │   ├── src/          # Web app source code
│   │   ├── public/       # Static assets
│   │   ├── convex/       # Convex backend
│   │   └── package.json  # Web app dependencies
│   │
│   └── mobile/           # React Native + Ignite mobile app
│       ├── app/          # Mobile app screens
│       ├── assets/       # Mobile assets
│       └── package.json  # Mobile app dependencies
│
├── packages/
│   └── shared/           # Shared code between web & mobile
│       ├── src/
│       │   └── index.ts  # Shared types and utilities
│       └── package.json
│
└── package.json          # Root workspace configuration
```

## 🚀 Quick Start

### First Time Setup
```bash
npm install
npm install --workspaces
cd packages/shared && npm run build && cd ../..
```

Or use the setup script:
```bash
./setup-monorepo.sh
```

### Development

**Start Web App:**
```bash
npm run dev:web
```
This will start:
- Vite dev server on http://localhost:5173
- Convex backend

**Start Mobile App:**
```bash
npm run dev:mobile
```
This will start the Expo development server.

## 📦 Available Commands

### Root Level
- `npm run dev` - Start web app (default)
- `npm run dev:web` - Start web development server
- `npm run dev:mobile` - Start mobile development server
- `npm run build:web` - Build web app for production
- `npm run build:mobile` - Build mobile app
- `npm run lint` - Lint all workspaces
- `npm run test` - Test all workspaces
- `npm run clean` - Remove all node_modules
- `npm run install:all` - Install all dependencies

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
npm run test             # Run tests
```

### Shared Package (packages/shared)
```bash
cd packages/shared
npm run build            # Build TypeScript
npm run dev              # Watch mode
```

## 🔧 Using Shared Code

The shared package exports common types and utilities:

```typescript
// In web or mobile app
import { formatTime, validateEmail, TimerData, User } from '@itimedit/shared';

const time = formatTime(3665); // "1:01:05"
const isValid = validateEmail('user@example.com'); // true
```

**Important:** After making changes to the shared package, rebuild it:
```bash
cd packages/shared && npm run build
```

## 🔄 Workflow

1. **Adding shared code:**
   - Add to `packages/shared/src/index.ts`
   - Run `npm run build` in packages/shared
   - Import in web/mobile apps

2. **Web development:**
   - Work in `apps/web/src/`
   - Use `npm run dev:web` from root

3. **Mobile development:**
   - Work in `apps/mobile/app/`
   - Use `npm run dev:mobile` from root

## 🐛 Troubleshooting

### Web app won't start
- Ensure all config files are in `apps/web/`
- Check that `.env.local` exists in `apps/web/`
- Run `npm install` in `apps/web/`

### Mobile app issues
- Run `npm install --legacy-peer-deps` in `apps/mobile/`
- Clear Expo cache: `cd apps/mobile && npx expo start -c`

### Shared package not updating
- Rebuild: `cd packages/shared && npm run build`
- Reinstall in apps: `npm install --workspaces`

## 📝 Next Steps

1. ✅ Run `npm install` and `npm install --workspaces`
2. ✅ Build shared package: `cd packages/shared && npm run build`
3. ✅ Start web app: `npm run dev:web`
4. ✅ Start mobile app: `npm run dev:mobile`
5. 🎉 Start developing!

## 🔗 Resources

- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Vite Documentation](https://vitejs.dev/)
- [Ignite Documentation](https://github.com/infinitered/ignite)
- [Convex Documentation](https://docs.convex.dev/)

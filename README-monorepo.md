# iTimedIT Monorepo

A monorepo containing both web and mobile applications for iTimedIT.

## Project Structure

```
├── apps/
│   ├── web/          # React web application with Vite
│   └── mobile/       # React Native mobile app with Ignite
├── packages/
│   └── shared/       # Shared utilities and types
└── package.json      # Root workspace configuration
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- For mobile development: Expo CLI, Android Studio/Xcode

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

### Development

#### Web App
```bash
npm run dev:web
```

#### Mobile App
```bash
npm run dev:mobile
```

### Building

#### Web App
```bash
npm run build:web
```

#### Mobile App
```bash
npm run build:mobile
```

### Project Commands

- `npm run dev` - Start web development server
- `npm run dev:web` - Start web development server
- `npm run dev:mobile` - Start mobile development server
- `npm run build:web` - Build web app for production
- `npm run build:mobile` - Build mobile app
- `npm run lint` - Run linting across all workspaces
- `npm run test` - Run tests across all workspaces
- `npm run clean` - Clean all node_modules
- `npm run install:all` - Install dependencies for all workspaces

## Apps

### Web App (`apps/web`)
- React + TypeScript
- Vite for bundling
- Tailwind CSS for styling
- Convex for backend

### Mobile App (`apps/mobile`)
- React Native + TypeScript
- Ignite boilerplate
- Expo for development and building

### Shared Package (`packages/shared`)
- Common types and utilities
- Shared between web and mobile apps

## Development Workflow

1. Make changes to shared code in `packages/shared`
2. Build shared package: `cd packages/shared && npm run build`
3. Use shared code in web/mobile apps by importing from `@itimedit/shared`
4. Test changes in both web and mobile apps

## Contributing

1. Create feature branches from `main`
2. Make changes in appropriate workspace
3. Test in both web and mobile if changes affect shared code
4. Submit pull request
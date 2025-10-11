# iTimedIT Mobile App

A React Native mobile companion app for iTimedIT time tracking, built with Expo and Convex.

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Convex account and deployment

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your Convex deployment URL:
   ```
   EXPO_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on a device:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## Project Structure

```
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication screens
│   ├── modals/            # Modal screens
│   └── _layout.tsx        # Root layout with providers
├── components/            # React components
│   ├── timer/            # Timer-related components
│   ├── projects/         # Project-related components
│   ├── entries/          # Entry-related components
│   ├── ui/               # Reusable UI components
│   └── common/           # Common components
├── hooks/                # Custom React hooks
├── services/             # Service layer
│   ├── convex.ts        # Convex client setup
│   ├── notifications.ts # Push notifications
│   ├── storage.ts       # Secure storage
│   └── background.ts    # Background tasks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
│   ├── theme.ts        # Theme configuration
│   ├── constants.ts    # App constants
│   └── formatters.ts   # Formatting utilities
└── convex/             # Convex backend (shared with web)
```

## Key Features

- ✅ Cross-platform (iOS & Android)
- ✅ Dark theme with purple accents
- ✅ Convex real-time sync
- ✅ Push notifications for timer interrupts
- ✅ Budget alerts
- ✅ Pomodoro mode
- ✅ Offline support
- ✅ Background timer synchronization
- ✅ Secure authentication

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production

#### iOS
```bash
eas build --platform ios
```

#### Android
```bash
eas build --platform android
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_CONVEX_URL` | Convex deployment URL | Yes |

## Tech Stack

- **Framework:** React Native with Expo
- **Navigation:** Expo Router
- **Backend:** Convex
- **State Management:** React hooks + Convex queries
- **Storage:** Expo SecureStore + AsyncStorage
- **Notifications:** Expo Notifications
- **Background Tasks:** Expo Background Fetch

## License

Proprietary - All rights reserved

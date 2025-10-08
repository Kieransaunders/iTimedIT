# Enable Push Notifications

The warning `VAPID public key not configured` means push notifications aren't set up yet. This is **optional** - your app works fine without it.

## Quick Setup

### Option 1: Automatic (Recommended)
```bash
./setup-vapid.sh
```

This will:
1. Generate VAPID keys
2. Add them to `apps/web/.env.local`
3. You're done!

Then restart your dev server:
```bash
npm run dev:web
```

### Option 2: Manual Setup

1. **Generate keys:**
   ```bash
   cd apps/web
   npm run generate:vapid
   ```

2. **Copy the output** and add to `apps/web/.env.local`:
   ```env
   # Push Notification VAPID Keys
   VITE_VAPID_PUBLIC_KEY="your_public_key_here"
   VAPID_PRIVATE_KEY="your_private_key_here"
   ```

3. **Restart dev server:**
   ```bash
   npm run dev:web
   ```

## What are VAPID Keys?

VAPID (Voluntary Application Server Identification) keys are used for web push notifications. They allow your app to send push notifications to users' browsers.

## Do I Need This?

**No, it's optional!** Your app works perfectly without push notifications. Only set this up if you want to:
- Send notifications to users when they're not actively using the app
- Alert users about timer completions
- Send reminders or updates

## Troubleshooting

### "npm run generate:vapid not found"
Make sure you're in the `apps/web` directory:
```bash
cd apps/web
npm run generate:vapid
```

### Keys not working after adding
1. Make sure the keys are in `apps/web/.env.local` (not the root `.env.local`)
2. Restart your dev server completely (Ctrl+C and run `npm run dev:web` again)
3. Clear browser cache and reload

### Still seeing the warning
Check that the key name is exactly: `VITE_VAPID_PUBLIC_KEY` (with the `VITE_` prefix)

## Production Setup

For production, add the keys to:
- `apps/web/.env.production`
- Your hosting platform's environment variables (Vercel, Netlify, etc.)

The private key should be kept secret and only used on the server side.

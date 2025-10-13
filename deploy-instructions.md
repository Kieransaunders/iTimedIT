# Deployment Instructions for iTimedIT Web App

## Current Setup
- **Production URL**: https://itimedit.netlify.app
- **Repository**: https://github.com/Kieransaunders/iTimedIT.git
- **Web App Location**: `/apps/web`
- **Production Convex Backend**: `https://basic-greyhound-928.convex.cloud`

## Netlify Configuration
Your `apps/web/netlify.toml` is already configured correctly:
```toml
[build]
  base = "apps/web"
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)
Every push to the `Main` branch automatically deploys to Netlify.

**Steps:**
```bash
# 1. Make your changes
# 2. Commit them
git add .
git commit -m "Your commit message"

# 3. Push to main branch
git push origin Main
```

Netlify will automatically:
- Detect the push
- Navigate to `apps/web` directory
- Run `npm run build`
- Publish the `dist` folder

### Method 2: Manual Deploy via Dashboard
1. Go to https://app.netlify.com/sites/itimedit/deploys
2. Click "Trigger deploy" → "Deploy site"
3. Wait for build to complete

### Method 3: Deploy via Netlify CLI
```bash
# 1. Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# 2. Login to Netlify
netlify login

# 3. Link your site (one-time setup)
cd apps/web
netlify link --name itimedit

# 4. Deploy
netlify deploy --prod
```

## Required Environment Variables on Netlify

Make sure these are set in Netlify Dashboard → Site settings → Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_CONVEX_URL` | `https://basic-greyhound-928.convex.cloud` |
| `NODE_VERSION` | `20` (already in netlify.toml) |

Add any other environment variables from your `apps/web/.env.local` file.

## Verification Checklist

After deployment, verify:
- [ ] Site loads at https://itimedit.netlify.app
- [ ] No console errors in browser
- [ ] Timer functionality works
- [ ] Data loads from Convex backend
- [ ] Authentication works

## Troubleshooting

### Build Fails
1. Check build logs in Netlify dashboard
2. Verify all environment variables are set
3. Test build locally: `cd apps/web && npm run build`

### App Loads but Data Doesn't Load
1. Verify `VITE_CONVEX_URL` environment variable is correct
2. Check Convex dashboard for backend errors
3. Check browser console for API errors

### Changes Not Visible
1. Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
2. Check if deployment succeeded in Netlify dashboard
3. Verify you pushed to the correct branch (`Main`)

## Pre-Deployment Testing

Before deploying, always test locally:
```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Test development build
npm run dev

# 4. Test production build
npm run build
```

## Deploy Convex Backend

If you've made changes to Convex functions:
```bash
# Deploy Convex backend first
cd apps/web
npx convex deploy --prod

# Then deploy frontend
git push origin Main
```

## Monitoring

- **Build Status**: https://app.netlify.com/sites/itimedit/deploys
- **Convex Dashboard**: https://dashboard.convex.dev/
- **Live Site**: https://itimedit.netlify.app

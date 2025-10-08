#!/bin/bash

echo "🚀 Starting iTimedIT Web App..."
echo ""

# Navigate to web app directory
cd apps/web

echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo ""
echo "🔄 Starting Convex backend and Vite dev server..."
echo "   - Convex will sync your backend functions"
echo "   - Vite will start on http://localhost:5173"
echo ""
echo "⚠️  If Convex asks 'What would you like to configure?'"
echo "   Choose: 'choose an existing project'"
echo "   Select: 'watchful-hedgehog-860' (iTrackIT)"
echo ""

# Start the dev server
npm run dev

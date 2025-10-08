#!/bin/bash

echo "🔧 Fixing Convex Setup..."
echo ""

cd apps/web

# Check if .convex directory exists
if [ -d ".convex" ]; then
  echo "✅ .convex directory exists"
else
  echo "⚠️  .convex directory not found - Convex needs to be initialized"
  echo ""
  echo "Running 'npx convex dev' to initialize..."
  echo ""
  echo "📝 When prompted:"
  echo "   1. Choose: 'choose an existing project'"
  echo "   2. Select: 'watchful-hedgehog-860' (iTrackIT)"
  echo ""
  echo "Press Ctrl+C after Convex syncs successfully, then run 'npm run dev:web' from root"
  echo ""
  
  npx convex dev
fi

#!/bin/bash

echo "🚀 Setting up iTimedIT Monorepo..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install workspace dependencies
echo "📦 Installing workspace dependencies..."
npm install --workspaces

# Build shared package
echo "🔨 Building shared package..."
cd packages/shared
npm run build
cd ../..

echo "✅ Monorepo setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  • Start web app: npm run dev:web"
echo "  • Start mobile app: npm run dev:mobile"
echo "  • Read README-monorepo.md for more details"
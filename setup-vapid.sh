#!/bin/bash

echo "🔑 Generating VAPID Keys for Push Notifications..."
echo ""

cd apps/web

# Generate keys and capture output
OUTPUT=$(npm run generate:vapid 2>&1)

# Extract the keys from the output
PUBLIC_KEY=$(echo "$OUTPUT" | grep "VITE_VAPID_PUBLIC_KEY" | cut -d'"' -f2)
PRIVATE_KEY=$(echo "$OUTPUT" | grep "VAPID_PRIVATE_KEY" | cut -d'"' -f2)

if [ -z "$PUBLIC_KEY" ] || [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Failed to generate keys. Running the script manually:"
  echo ""
  npm run generate:vapid
  echo ""
  echo "📝 Please manually add the keys to apps/web/.env.local"
  exit 1
fi

echo "✅ Keys generated successfully!"
echo ""

# Add to .env.local if not already present
if grep -q "VITE_VAPID_PUBLIC_KEY" .env.local 2>/dev/null; then
  echo "⚠️  VAPID keys already exist in .env.local"
  echo "   Remove them first if you want to regenerate"
else
  echo "" >> .env.local
  echo "# Push Notification VAPID Keys" >> .env.local
  echo "VITE_VAPID_PUBLIC_KEY=\"$PUBLIC_KEY\"" >> .env.local
  echo "VAPID_PRIVATE_KEY=\"$PRIVATE_KEY\"" >> .env.local
  
  echo "✅ Keys added to apps/web/.env.local"
fi

echo ""
echo "🎉 Setup complete! Restart your dev server to use push notifications."
echo ""
echo "Run: npm run dev:web"

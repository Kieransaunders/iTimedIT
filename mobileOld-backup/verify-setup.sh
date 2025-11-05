#!/bin/bash

echo "🔍 Verifying Project Setup..."
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
  echo "✅ Dependencies installed"
else
  echo "❌ Dependencies not installed"
  exit 1
fi

# Check if key directories exist
dirs=("app" "components" "hooks" "services" "types" "utils")
for dir in "${dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "✅ Directory exists: $dir"
  else
    echo "❌ Directory missing: $dir"
    exit 1
  fi
done

# Check if key files exist
files=(
  "app.config.ts"
  "services/convex.ts"
  "services/notifications.ts"
  "services/storage.ts"
  "services/background.ts"
  "types/models.ts"
  "types/navigation.ts"
  "utils/theme.ts"
  "utils/constants.ts"
  "utils/formatters.ts"
  "utils/validators.ts"
  ".env.example"
  "README.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ File exists: $file"
  else
    echo "❌ File missing: $file"
    exit 1
  fi
done

echo ""
echo "🎉 All setup verification checks passed!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env.local and add your Convex URL"
echo "2. Run 'npm start' to start the development server"
echo "3. Continue with Task 2: Theme and UI Foundation"

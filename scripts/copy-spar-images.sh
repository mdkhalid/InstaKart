#!/bin/bash
# Copy SPAR India product images to the app's public directory
# Run: bash scripts/copy-spar-images.sh

SPAR_IMAGES_DIR="D:/MyCode/2026/Images/newdata/images"
APP_PUBLIC_DIR="D:/MyCode/2026/Projects/InstantShopping/apps/web/public/images/spar"

if [ ! -d "$SPAR_IMAGES_DIR" ]; then
    echo "Error: SPAR images directory not found: $SPAR_IMAGES_DIR"
    exit 1
fi

mkdir -p "$APP_PUBLIC_DIR"

echo "Copying SPAR images to $APP_PUBLIC_DIR..."
cp "$SPAR_IMAGES_DIR"/*.* "$APP_PUBLIC_DIR"/

echo "Done! $(ls -1 "$APP_PUBLIC_DIR" | wc -l) images copied"

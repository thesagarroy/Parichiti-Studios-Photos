#!/bin/bash
# ==============================================================================
# PARICHITI STUDIOS - 1-Click Windows App Builder & Upgrader
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBSITE_DIR="/home/sagar/Desktop/Website/Parichiti-Studios-Photos"
APP_DIR="$SCRIPT_DIR/Parichiti Studios Windows App"
MAKENSIS="$HOME/.cache/electron-builder/nsis-3.0.4.1/nsis-3.0.4.1-1mx3n/linux/makensis"

echo "=================================================="
echo "🚀 PARICHITI STUDIOS - Updating Windows App..."
echo "=================================================="

# 1. Check if website directory exists
if [ ! -d "$WEBSITE_DIR" ]; then
    echo "❌ Error: Website directory not found at $WEBSITE_DIR"
    exit 1
fi

echo "📦 Step 1: Packaging latest web application code into app.asar..."
npx -y asar pack "$WEBSITE_DIR" "$APP_DIR/resources/app.asar" \
    --unpack-dir "{lib/mediapipe}"

echo "🔨 Step 2: Compiling new PARICHITI-STUDIOS-Setup.exe..."
cd "$SCRIPT_DIR"
"$MAKENSIS" "$SCRIPT_DIR/PARICHITI-STUDIOS-Installer.nsi"

echo "=================================================="
echo "✅ SUCCESS! New PARICHITI-STUDIOS-Setup.exe is ready!"
echo "📁 Location: $SCRIPT_DIR/PARICHITI-STUDIOS-Setup.exe"
echo "=================================================="

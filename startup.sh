#!/bin/bash
# Auto-update startup script for production deployment
# This script pulls the latest code from GitHub before starting the server
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "[Startup] Pulling latest code from GitHub..."
# Fetch latest commits
git fetch origin main 2>/dev/null || echo "[Startup] Git fetch failed"

# Force-overwrite dist/index.js from origin/main (resolve any local conflict)
git checkout origin/main -- dist/index.js 2>/dev/null && echo "[Startup] dist/index.js updated from origin/main" || echo "[Startup] git checkout dist/index.js failed (non-fatal)"

# Pull the rest of the changes
git pull origin main --ff-only 2>/dev/null || \
  (git reset --hard origin/main 2>/dev/null && echo "[Startup] Used git reset --hard") || \
  echo "[Startup] Git pull failed or already up to date"

echo "[Startup] Ensuring Chrome is installed..."
# Try to install Chrome if not present
CHROME_CACHE="$APP_DIR/.chrome-cache"
if ! find "$CHROME_CACHE" -name "chrome" -type f 2>/dev/null | grep -q .; then
  echo "[Startup] Chrome not found in $CHROME_CACHE, installing..."
  # Use node_modules/.bin/puppeteer if available (avoids npx PATH issues)
  PUPPETEER_BIN="$APP_DIR/node_modules/.bin/puppeteer"
  if [ -f "$PUPPETEER_BIN" ]; then
    PUPPETEER_CACHE_DIR="$CHROME_CACHE" "$PUPPETEER_BIN" browsers install chrome 2>/dev/null && \
      echo "[Startup] Chrome installed successfully via node_modules/.bin/puppeteer" || \
      echo "[Startup] Chrome installation failed (will retry at sync time)"
  else
    PUPPETEER_CACHE_DIR="$CHROME_CACHE" npx puppeteer browsers install chrome 2>/dev/null && \
      echo "[Startup] Chrome installed successfully via npx" || \
      echo "[Startup] Chrome installation failed (will retry at sync time)"
  fi
else
  echo "[Startup] Chrome already installed"
fi

echo "[Startup] Starting server..."
exec node dist/index.js

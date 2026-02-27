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
echo "[Startup] Ensuring Puppeteer Chrome is installed..."
# Install Chrome for Puppeteer to BOTH the project cache AND the default /root/.cache/puppeteer
PUPPETEER_BIN="$APP_DIR/node_modules/.bin/puppeteer"
CHROME_FOUND=false

# Check if Chrome exists in /root/.cache/puppeteer (default path)
if find /root/.cache/puppeteer -name "chrome" -type f 2>/dev/null | grep -q .; then
  echo "[Startup] Puppeteer Chrome already installed in /root/.cache/puppeteer"
  CHROME_FOUND=true
fi

# Check if Chrome exists in APP_DIR/.chrome-cache (project cache)
if find "$APP_DIR/.chrome-cache" -name "chrome" -type f 2>/dev/null | grep -q .; then
  echo "[Startup] Puppeteer Chrome already installed in $APP_DIR/.chrome-cache"
  CHROME_FOUND=true
fi

if [ "$CHROME_FOUND" = "false" ]; then
  echo "[Startup] Chrome not found, installing to /root/.cache/puppeteer..."
  if [ -f "$PUPPETEER_BIN" ]; then
    "$PUPPETEER_BIN" browsers install chrome 2>/dev/null && \
      echo "[Startup] Chrome installed successfully to default cache" || \
      echo "[Startup] Chrome installation to default cache failed"
    # Also install to project cache as fallback
    PUPPETEER_CACHE_DIR="$APP_DIR/.chrome-cache" "$PUPPETEER_BIN" browsers install chrome 2>/dev/null && \
      echo "[Startup] Chrome installed to project cache" || \
      echo "[Startup] Chrome installation to project cache failed (non-fatal)"
  else
    npx puppeteer browsers install chrome 2>/dev/null && \
      echo "[Startup] Chrome installed via npx" || \
      echo "[Startup] Chrome installation failed (will retry at sync time)"
  fi
fi

echo "[Startup] Ensuring Playwright browsers are installed..."
# Install Playwright Chromium
PLAYWRIGHT_BIN="$APP_DIR/node_modules/.bin/playwright"
if [ -f "$PLAYWRIGHT_BIN" ]; then
  # Check if Playwright Chromium is already installed
  if find /root/.cache/ms-playwright -name "chrome-headless-shell" -type f 2>/dev/null | grep -q .; then
    echo "[Startup] Playwright Chromium already installed"
  else
    echo "[Startup] Playwright Chromium not found, installing..."
    "$PLAYWRIGHT_BIN" install chromium 2>/dev/null && \
      echo "[Startup] Playwright Chromium installed successfully" || \
      echo "[Startup] Playwright Chromium installation failed (will retry at sync time)"
    # Also install system dependencies for Playwright
    "$PLAYWRIGHT_BIN" install-deps chromium 2>/dev/null && \
      echo "[Startup] Playwright system dependencies installed" || \
      echo "[Startup] Playwright system deps installation failed (non-fatal)"
  fi
else
  echo "[Startup] Playwright binary not found, trying npx..."
  npx playwright install chromium 2>/dev/null && \
    echo "[Startup] Playwright Chromium installed via npx" || \
    echo "[Startup] Playwright Chromium installation failed via npx"
fi
echo "[Startup] Starting server..."
exec node dist/index.js

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

# Check system Chrome
if command -v google-chrome-stable >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1; then
  echo "[Startup] System Chrome/Chromium found"
  CHROME_FOUND=true
fi

if [ "$CHROME_FOUND" = "false" ]; then
  echo "[Startup] Chrome not found, installing..."

  # Strategy 1: Puppeteer CLI install
  if [ -f "$PUPPETEER_BIN" ]; then
    echo "[Startup] Strategy 1: Installing via puppeteer CLI..."
    "$PUPPETEER_BIN" browsers install chrome 2>&1 && \
      echo "[Startup] Chrome installed successfully to default cache" || \
      echo "[Startup] Chrome installation to default cache failed"
    # Also install to project cache as fallback
    PUPPETEER_CACHE_DIR="$APP_DIR/.chrome-cache" "$PUPPETEER_BIN" browsers install chrome 2>&1 && \
      echo "[Startup] Chrome installed to project cache" || \
      echo "[Startup] Chrome installation to project cache failed (non-fatal)"
  else
    npx puppeteer browsers install chrome 2>&1 && \
      echo "[Startup] Chrome installed via npx" || \
      echo "[Startup] Chrome installation via npx failed"
  fi

  # Check again
  if find /root/.cache/puppeteer -name "chrome" -type f 2>/dev/null | grep -q . || \
     find "$APP_DIR/.chrome-cache" -name "chrome" -type f 2>/dev/null | grep -q .; then
    CHROME_FOUND=true
  fi

  # Strategy 2: Direct download of Chrome for Testing
  if [ "$CHROME_FOUND" = "false" ]; then
    echo "[Startup] Strategy 2: Direct download of Chrome for Testing..."
    DOWNLOAD_DIR="$APP_DIR/.chrome-cache/chrome-direct"
    mkdir -p "$DOWNLOAD_DIR"
    CHROME_URL=$(curl -sS "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json" | \
      python3 -c "import sys,json; d=json.load(sys.stdin); print([x['url'] for x in d['channels']['Stable']['downloads']['chrome'] if x['platform']=='linux64'][0])" 2>/dev/null) || true
    if [ -n "$CHROME_URL" ]; then
      echo "[Startup] Downloading Chrome from $CHROME_URL..."
      cd "$DOWNLOAD_DIR" && curl -sSL "$CHROME_URL" -o chrome.zip && unzip -q -o chrome.zip && rm -f chrome.zip
      if [ -f "$DOWNLOAD_DIR/chrome-linux64/chrome" ]; then
        chmod +x "$DOWNLOAD_DIR/chrome-linux64/chrome"
        echo "[Startup] Chrome for Testing installed at $DOWNLOAD_DIR/chrome-linux64/chrome"
        CHROME_FOUND=true
      fi
      cd "$APP_DIR"
    fi
  fi

  # Strategy 3: Install Google Chrome Stable via dpkg
  if [ "$CHROME_FOUND" = "false" ]; then
    echo "[Startup] Strategy 3: Installing Google Chrome Stable via dpkg..."
    wget -q -O /tmp/google-chrome.deb "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb" 2>/dev/null && \
      dpkg -i /tmp/google-chrome.deb 2>/dev/null || apt-get install -f -y -qq 2>/dev/null
    rm -f /tmp/google-chrome.deb
    if command -v google-chrome-stable >/dev/null 2>&1; then
      echo "[Startup] Google Chrome Stable installed"
      CHROME_FOUND=true
    fi
  fi

  if [ "$CHROME_FOUND" = "false" ]; then
    echo "[Startup] WARNING: All Chrome installation strategies failed. Sync will likely fail."
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

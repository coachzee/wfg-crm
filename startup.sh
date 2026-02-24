#!/bin/bash
# Auto-update startup script for production deployment
# This script pulls the latest code from GitHub before starting the server
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "[Startup] Pulling latest code from GitHub..."
git pull origin main --ff-only 2>/dev/null || echo "[Startup] Git pull failed or already up to date"

echo "[Startup] Starting server..."
exec node dist/index.js

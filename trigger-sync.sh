#!/bin/bash

# WFG CRM Sync Trigger Script
# This script triggers the MyWFG full sync on the deployed application
# Run this on your Hostinger VPS where the .env file with SYNC_SECRET is located

# Load environment variables from .env file
if [ -f "/var/www/wfgcrm/.env" ]; then
    export $(grep -v '^#' /var/www/wfgcrm/.env | xargs)
elif [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found"
    echo "Please run this script from the wfgcrm directory or ensure .env exists at /var/www/wfgcrm/.env"
    exit 1
fi

# Check if SYNC_SECRET is set
if [ -z "$SYNC_SECRET" ]; then
    echo "Error: SYNC_SECRET not found in environment"
    exit 1
fi

# Trigger the sync
echo "Triggering MyWFG full sync..."
echo "Endpoint: https://crm.wealthbuildershaven.com/api/cron/sync"
echo "Time: $(date)"
echo ""

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "https://crm.wealthbuildershaven.com/api/cron/sync" \
    -H "x-sync-secret: $SYNC_SECRET" \
    -H "Content-Type: application/json" \
    -d '{"source":"manual-trigger"}')

# Extract HTTP status and body
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')

echo "Response Status: $http_status"
echo "Response Body:"
echo "$body" | jq . 2>/dev/null || echo "$body"

if [ "$http_status" = "200" ]; then
    echo ""
    echo "✅ Sync triggered successfully!"
    exit 0
elif [ "$http_status" = "409" ]; then
    echo ""
    echo "⚠️  Sync is already running. Please wait for it to complete."
    exit 0
else
    echo ""
    echo "❌ Sync trigger failed with status $http_status"
    exit 1
fi

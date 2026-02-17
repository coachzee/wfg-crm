#!/bin/bash

###############################################################################
# WFG CRM Remote Sync Invoker
# 
# This script triggers the MyWFG full sync on the deployed production server
# by making an authenticated API call to the cron endpoint.
#
# Usage:
#   1. Set the SYNC_SECRET environment variable
#   2. Run: ./invoke-remote-sync.sh
#
# Or provide the secret as an argument:
#   ./invoke-remote-sync.sh YOUR_SYNC_SECRET
#
# This script can be:
#   - Run manually for on-demand syncs
#   - Scheduled via cron for automated execution
#   - Integrated into CI/CD pipelines
###############################################################################

set -e  # Exit on error

# Configuration
APP_URL="${APP_URL:-https://crm.wealthbuildershaven.com}"
ENDPOINT="${APP_URL}/api/cron/sync"
LOG_FILE="${LOG_FILE:-/tmp/wfg-sync.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to log error
error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log success
success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log warning
warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Get SYNC_SECRET from argument or environment
if [ -n "$1" ]; then
    SYNC_SECRET="$1"
elif [ -n "$SYNC_SECRET" ]; then
    # Use environment variable
    :
else
    error "SYNC_SECRET not provided"
    echo ""
    echo "Usage:"
    echo "  $0 YOUR_SYNC_SECRET"
    echo "  OR"
    echo "  export SYNC_SECRET=YOUR_SECRET && $0"
    echo ""
    exit 1
fi

# Validate SYNC_SECRET
if [ ${#SYNC_SECRET} -lt 16 ]; then
    error "SYNC_SECRET must be at least 16 characters long"
    exit 1
fi

log "========================================="
log "WFG CRM Remote Sync Invoker"
log "========================================="
log "Endpoint: $ENDPOINT"
log "Log file: $LOG_FILE"
log ""

# Make the API call
log "Triggering sync..."

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$ENDPOINT" \
    -H "x-sync-secret: $SYNC_SECRET" \
    -H "Content-Type: application/json" \
    -d '{"source":"remote-invoker"}' 2>&1)

# Extract HTTP status and body
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')

# Log the response
log "HTTP Status: $http_status"
log "Response Body: $body"

# Parse and display the response
if command -v jq &> /dev/null; then
    formatted_body=$(echo "$body" | jq . 2>/dev/null || echo "$body")
    log "Formatted Response:"
    echo "$formatted_body" | tee -a "$LOG_FILE"
else
    log "Response (jq not available for formatting):"
    echo "$body" | tee -a "$LOG_FILE"
fi

log ""

# Handle different status codes
case "$http_status" in
    200)
        success "Sync triggered successfully!"
        log "The sync process is now running on the server."
        log "Check the monitoring endpoint for progress:"
        log "  curl -s \"${APP_URL}/api/monitoring/sync\" | jq ."
        exit 0
        ;;
    409)
        warning "Sync is already running"
        log "A sync job is currently in progress. Please wait for it to complete."
        log "Typical sync duration: 5-15 minutes"
        exit 0
        ;;
    401|403)
        error "Authentication failed"
        log "The SYNC_SECRET provided is invalid or missing."
        log "Please verify the secret matches the one configured on the server."
        exit 1
        ;;
    500)
        error "Server error"
        log "The server encountered an error while processing the request."
        log "Check the server logs for more details."
        exit 1
        ;;
    *)
        error "Unexpected response (HTTP $http_status)"
        log "An unexpected error occurred. Check the response body above for details."
        exit 1
        ;;
esac

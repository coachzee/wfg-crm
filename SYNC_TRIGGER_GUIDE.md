# MyWFG Sync Trigger Guide

This guide explains how to manually trigger the MyWFG full sync process.

## Current Sync Status

Based on the latest monitoring data:
- **Last Successful Sync**: February 16, 2026 at 10:45 PM EST
- **System Status**: Healthy
- **Scheduled Sync Times**: 3:30 PM and 6:30 PM EST daily

## Method 1: Using the Trigger Script (Recommended)

### On Your Hostinger VPS

1. SSH into your Hostinger VPS:
   ```bash
   ssh wfgcrm@your-vps-ip
   ```

2. Navigate to the application directory:
   ```bash
   cd /var/www/wfgcrm
   ```

3. Run the trigger script:
   ```bash
   ./trigger-sync.sh
   ```

The script will:
- Automatically load the SYNC_SECRET from your .env file
- Trigger the sync via the API endpoint
- Display the response and status

### From This Sandbox (After Uploading)

If you've uploaded the script to your server, you can also run it directly:

```bash
bash trigger-sync.sh
```

## Method 2: Manual cURL Command

If you prefer to use cURL directly on your Hostinger VPS:

```bash
# Load the SYNC_SECRET from .env
source /var/www/wfgcrm/.env

# Trigger the sync
curl -X POST "https://crm.wealthbuildershaven.com/api/cron/sync" \
  -H "x-sync-secret: $SYNC_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"source":"manual-trigger"}' | jq .
```

## Method 3: Wait for Scheduled Sync

The sync runs automatically twice daily:
- **3:30 PM EST** (20:30 UTC)
- **6:30 PM EST** (23:30 UTC)

The next scheduled sync will run automatically via the configured cron job.

## Response Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Sync triggered successfully |
| 409 | Sync is already running (wait for completion) |
| 401 | Invalid or missing SYNC_SECRET |
| 500 | Server error (check logs) |

## Monitoring Sync Status

You can check the current sync status at any time:

```bash
curl -s "https://crm.wealthbuildershaven.com/api/monitoring/sync" | jq .
```

This will show:
- Last successful sync time
- Hours since last sync
- Health status
- Any alerts or issues

## Troubleshooting

### Error: "Invalid or missing sync secret"
- Ensure the SYNC_SECRET in your .env file matches the one configured in production
- Check that the .env file is being loaded correctly

### Error: "Job is already running"
- A sync is currently in progress
- Wait for it to complete (typically 5-15 minutes)
- Check the monitoring endpoint for status

### Error: "SYNC_SECRET not found in environment"
- The .env file is not in the expected location
- Run the script from the /var/www/wfgcrm directory
- Or specify the full path to the .env file

## What the Sync Does

The MyWFG full sync process:

1. **Logs into MyWFG** using stored credentials with OTP retrieval from Gmail
2. **Fetches Downline Status Report** with filters:
   - Title Levels: TA, A, SA, MD, SMD
   - Team: Super Base (Base - 1st)
   - Type: Active
3. **Extracts Agent Data** including names, codes, and ranks
4. **Updates Database** with current agent information
5. **Fetches Contact Information** from Hierarchy Tool for each agent
6. **Records Sync History** for monitoring and troubleshooting

## Next Steps

After triggering the sync, you can:
- Monitor progress via the monitoring endpoint
- Check the sync history in the CRM dashboard
- Review any errors in the application logs
- Verify updated agent data in the CRM

## Support

For issues or questions about the sync process, refer to:
- `DEPLOYMENT_HOSTINGER.md` - Deployment and configuration guide
- `USER_GUIDE.md` - User documentation
- Application logs at `/var/log/wfgcrm/sync.log` (on Hostinger VPS)

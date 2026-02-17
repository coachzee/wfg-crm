# MyWFG Sync Automation Guide

This guide provides multiple methods for triggering and automating the MyWFG full sync process.

## Current Status

Your WFG CRM is deployed at: **https://crm.wealthbuildershaven.com**

### Latest Sync Information
- **Last Successful Sync**: February 16, 2026 at 10:45 PM EST
- **System Health**: ✅ Healthy
- **Scheduled Times**: 3:30 PM and 6:30 PM EST (daily)
- **Next Automatic Sync**: 6:30 PM EST today

---

## Method 1: Automated Scheduled Sync (Recommended - Already Configured)

Your system is already configured with automated syncs running twice daily via Hostinger cron jobs.

### Current Cron Configuration

The following cron jobs are configured on your Hostinger VPS:

```cron
# MyWFG/Transamerica Sync - 3:30 PM EST (20:30 UTC)
30 20 * * * curl -s -X POST "https://crm.wealthbuildershaven.com/api/cron/sync" \
  -H "x-sync-secret: $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"source":"hostinger-cron"}' >> /var/log/wfgcrm/sync.log 2>&1

# MyWFG/Transamerica Sync - 6:30 PM EST (23:30 UTC)
30 23 * * * curl -s -X POST "https://crm.wealthbuildershaven.com/api/cron/sync" \
  -H "x-sync-secret: $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"source":"hostinger-cron"}' >> /var/log/wfgcrm/sync.log 2>&1
```

**No action needed** - these syncs run automatically.

---

## Method 2: Manual Trigger from Hostinger VPS

If you need to trigger a sync immediately from your Hostinger server:

### Option A: Using the Trigger Script

```bash
# SSH into your Hostinger VPS
ssh wfgcrm@your-vps-ip

# Navigate to the application directory
cd /var/www/wfgcrm

# Run the trigger script
./trigger-sync.sh
```

### Option B: Direct cURL Command

```bash
# SSH into your Hostinger VPS
ssh wfgcrm@your-vps-ip

# Load environment variables
source /var/www/wfgcrm/.env

# Trigger the sync
curl -X POST "https://crm.wealthbuildershaven.com/api/cron/sync" \
  -H "x-sync-secret: $SYNC_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"source":"manual-trigger"}' | jq .
```

---

## Method 3: Remote Trigger from Any Location

Use the `invoke-remote-sync.sh` script to trigger syncs from anywhere (including this Manus sandbox).

### Prerequisites
- The SYNC_SECRET value from your production .env file

### Usage

```bash
# Method 1: Pass secret as argument
./invoke-remote-sync.sh YOUR_SYNC_SECRET

# Method 2: Use environment variable
export SYNC_SECRET="your_secret_here"
./invoke-remote-sync.sh

# Method 3: Set custom app URL
export APP_URL="https://crm.wealthbuildershaven.com"
export SYNC_SECRET="your_secret_here"
./invoke-remote-sync.sh
```

### Example Output

```
[2026-02-17 15:30:00] =========================================
[2026-02-17 15:30:00] WFG CRM Remote Sync Invoker
[2026-02-17 15:30:00] =========================================
[2026-02-17 15:30:00] Endpoint: https://crm.wealthbuildershaven.com/api/cron/sync
[2026-02-17 15:30:00] Log file: /tmp/wfg-sync.log
[2026-02-17 15:30:00] 
[2026-02-17 15:30:00] Triggering sync...
[2026-02-17 15:30:02] HTTP Status: 200
[2026-02-17 15:30:02] SUCCESS: Sync triggered successfully!
```

---

## Method 4: Scheduled Task via Manus

You can create a Manus scheduled task to trigger syncs automatically.

### Create a Scheduled Task

```javascript
// Schedule sync for 3:30 PM EST daily
{
  "type": "cron",
  "cron": "0 30 15 * * *",  // 3:30 PM EST
  "repeat": true,
  "name": "MyWFG Afternoon Sync",
  "prompt": "Run the MyWFG sync using the invoke-remote-sync.sh script"
}
```

---

## Method 5: Direct API Call

For integration with other systems or custom automation:

### HTTP Request

```http
POST https://crm.wealthbuildershaven.com/api/cron/sync
Content-Type: application/json
x-sync-secret: YOUR_SYNC_SECRET

{
  "source": "custom-automation"
}
```

### cURL Example

```bash
curl -X POST "https://crm.wealthbuildershaven.com/api/cron/sync" \
  -H "x-sync-secret: YOUR_SYNC_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"source":"api-call"}' \
  | jq .
```

### Python Example

```python
import requests

url = "https://crm.wealthbuildershaven.com/api/cron/sync"
headers = {
    "x-sync-secret": "YOUR_SYNC_SECRET",
    "Content-Type": "application/json"
}
data = {"source": "python-script"}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

### Node.js Example

```javascript
const fetch = require('node-fetch');

const url = 'https://crm.wealthbuildershaven.com/api/cron/sync';
const headers = {
  'x-sync-secret': 'YOUR_SYNC_SECRET',
  'Content-Type': 'application/json'
};
const body = JSON.stringify({ source: 'nodejs-script' });

fetch(url, { method: 'POST', headers, body })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

---

## Monitoring Sync Status

### Check Current Sync Health

```bash
curl -s "https://crm.wealthbuildershaven.com/api/monitoring/sync" | jq .
```

### Response Example

```json
{
  "timestamp": "2026-02-17T20:35:15.306Z",
  "overall": {
    "isHealthy": true,
    "lastSuccessfulSync": "2026-02-17T18:22:58.000Z",
    "hoursSinceLastSync": 2.2,
    "consecutiveFailures": 0,
    "alerts": []
  },
  "byJob": {
    "fullsync": {
      "isHealthy": true,
      "lastSuccessfulSync": "2026-02-16T22:45:56.000Z",
      "hoursSinceLastSync": 21.8,
      "consecutiveFailures": 0,
      "alerts": []
    }
  }
}
```

### View Sync History in Dashboard

1. Log in to https://crm.wealthbuildershaven.com
2. Navigate to the Dashboard
3. Scroll to the "Sync History" section
4. View recent sync runs, status, and metrics

---

## What the Sync Does

The MyWFG full sync process performs the following operations:

### 1. MyWFG Data Sync
- Logs into MyWFG using stored credentials
- Retrieves OTP from Gmail automatically
- Fetches Downline Status Report with filters:
  - **Title Levels**: TA, A, SA, MD, SMD
  - **Team**: Super Base (Base - 1st)
  - **Type**: Active
- Extracts agent data (names, codes, ranks)
- Updates database with current information

### 2. Contact Information Sync
- Fetches detailed contact info from Hierarchy Tool
- Updates agent records with:
  - Personal email addresses
  - Mobile phone numbers
  - Home addresses
  - Licensing status

### 3. Agent Licensing Status Sync
- Verifies current licensing status for all agents
- Updates license information in database
- Flags unlicensed agents for follow-up

### 4. Scheduled Email Processing
- Processes any pending scheduled emails
- Sends follow-up communications
- Tracks email delivery status

### 5. Sync History Recording
- Records sync execution details
- Captures metrics and performance data
- Stores artifacts for troubleshooting

---

## Response Codes

| Status Code | Meaning | Action Required |
|-------------|---------|-----------------|
| 200 | ✅ Sync triggered successfully | None - sync is running |
| 409 | ⚠️ Sync already running | Wait 5-15 minutes and retry |
| 401 | ❌ Invalid SYNC_SECRET | Verify secret matches production |
| 403 | ❌ Forbidden | Check authentication |
| 500 | ❌ Server error | Check server logs |

---

## Troubleshooting

### Issue: "Invalid or missing sync secret"

**Solution**: Verify the SYNC_SECRET value

```bash
# On Hostinger VPS
grep SYNC_SECRET /var/www/wfgcrm/.env
```

### Issue: "Job is already running"

**Solution**: Wait for the current sync to complete

```bash
# Check sync status
curl -s "https://crm.wealthbuildershaven.com/api/monitoring/sync" | jq '.overall'
```

### Issue: Sync not completing

**Solution**: Check server logs

```bash
# On Hostinger VPS
tail -f /var/log/wfgcrm/sync.log
pm2 logs wfgcrm
```

### Issue: MyWFG login failing

**Solution**: Verify credentials and Gmail app password

```bash
# On Hostinger VPS
grep MYWFG /var/www/wfgcrm/.env
```

---

## Security Best Practices

1. **Never commit SYNC_SECRET to version control**
   - Keep it in .env files only
   - Use environment variables in production

2. **Rotate secrets periodically**
   - Update SYNC_SECRET every 90 days
   - Update in both .env and cron jobs

3. **Use HTTPS only**
   - All API calls use encrypted connections
   - SSL certificates auto-renewed via Certbot

4. **Limit access to .env files**
   ```bash
   chmod 600 /var/www/wfgcrm/.env
   ```

5. **Monitor sync logs for anomalies**
   - Review logs weekly
   - Set up alerts for consecutive failures

---

## Next Steps

1. **Verify automated syncs are running**
   - Check monitoring endpoint
   - Review sync history in dashboard

2. **Set up monitoring alerts**
   - Configure notifications for sync failures
   - Set up weekly sync summary reports

3. **Test manual trigger**
   - Run `./trigger-sync.sh` from Hostinger VPS
   - Verify sync completes successfully

4. **Document your SYNC_SECRET**
   - Store securely in password manager
   - Share with authorized team members only

---

## Support

For issues or questions:
- Review `DEPLOYMENT_HOSTINGER.md` for deployment details
- Check `USER_GUIDE.md` for user documentation
- View server logs at `/var/log/wfgcrm/sync.log`
- Contact system administrator for access issues

---

**Last Updated**: February 17, 2026  
**Version**: 1.0

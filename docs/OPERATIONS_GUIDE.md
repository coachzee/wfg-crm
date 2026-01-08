# WBH CRM Operations Guide

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Credential Management](#credential-management)
3. [Automated Sync Jobs](#automated-sync-jobs)
4. [Monitoring and Alerts](#monitoring-and-alerts)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance Procedures](#maintenance-procedures)

---

## Environment Variables

The WBH CRM system requires several environment variables to function properly. These are managed through the Manus Secrets panel in the Management UI.

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL/TiDB connection string | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | Secret key for signing JWT tokens | Auto-generated |
| `VITE_APP_ID` | Manus OAuth application ID | Auto-generated |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL | Auto-generated |

### MyWBH Integration Credentials

| Variable | Description | How to Obtain |
|----------|-------------|---------------|
| `MYWFG_USERNAME` | MyWFG.com login username | Your MyWBH account username |
| `MYWFG_PASSWORD` | MyWFG.com login password | Your MyWBH account password |
| `MYWFG_EMAIL` | Gmail address for OTP | Gmail account that receives MyWBH OTPs |
| `MYWFG_APP_PASSWORD` | Gmail App Password | Generate in Google Account settings |

### Transamerica Integration Credentials

| Variable | Description | How to Obtain |
|----------|-------------|---------------|
| `TRANSAMERICA_USERNAME` | Transamerica portal username | e.g., `larex3030` |
| `TRANSAMERICA_PASSWORD` | Transamerica portal password | Your Transamerica password |
| `TRANSAMERICA_EMAIL` | Gmail for Transamerica OTPs | Gmail that receives Transamerica OTPs |
| `TRANSAMERICA_APP_PASSWORD` | Gmail App Password | Generate in Google Account settings |
| `TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY` | Security question answer | Answer to "In what city was your first job?" |
| `TRANSAMERICA_SECURITY_Q_PET_NAME` | Security question answer | Answer to "What is your pet's name?" |

---

## Credential Management

### How to Update Credentials in Manus

**Step 1:** Open the Management UI by clicking the settings icon in the Chatbox header.

**Step 2:** Navigate to **Settings → Secrets** in the left sidebar.

**Step 3:** Locate the credential you want to update. You will see a list of all environment variables.

**Step 4:** Click the **Edit** button next to the variable you want to change.

**Step 5:** Enter the new value and click **Save**.

**Step 6:** The application will automatically restart to apply the new credentials.

### Setting Up Gmail App Passwords

Gmail App Passwords are required for the OTP extraction service to read emails via IMAP. Follow these steps to generate one:

**Step 1:** Go to your Google Account settings at [myaccount.google.com](https://myaccount.google.com).

**Step 2:** Navigate to **Security → 2-Step Verification**. You must have 2-Step Verification enabled.

**Step 3:** Scroll down to **App passwords** and click on it.

**Step 4:** Select **Mail** as the app and **Other** as the device (name it "WBH CRM").

**Step 5:** Click **Generate**. Google will display a 16-character password.

**Step 6:** Copy this password and add it to the Manus Secrets panel as `MYWFG_APP_PASSWORD` or `TRANSAMERICA_APP_PASSWORD`.

> **Important:** App passwords are shown only once. If you lose it, you must generate a new one.

### When to Update Credentials

You should update credentials in the following situations:

1. **Password Change** - When you change your MyWBH or Transamerica password
2. **Security Incident** - If you suspect credentials have been compromised
3. **Account Lockout** - After recovering from an account lockout
4. **New Security Questions** - If Transamerica adds new security questions

---

## Automated Sync Jobs

### Sync Schedule

The system runs automated sync jobs twice daily:

| Sync Type | Time (EST) | Purpose |
|-----------|------------|---------|
| MyWBH Sync | 3:30 PM | Sync agents, cash flow, production data |
| MyWBH Sync | 6:30 PM | Sync agents, cash flow, production data |
| Transamerica Sync | 3:30 PM | Sync pending policies and requirements |
| Transamerica Sync | 6:30 PM | Sync pending policies and requirements |

### Manual Sync

You can trigger a manual sync from the Dashboard:

1. Navigate to the **Dashboard** page
2. Click the **Refresh** button in the top-right corner
3. The sync will run immediately and update all data

For Transamerica pending policies:

1. Navigate to the **Pending Policies** page
2. Click the **Sync Now** button
3. Wait for the sync to complete (may take 2-5 minutes)

### Sync Status Indicators

The Dashboard shows the last sync status:

| Status | Meaning |
|--------|---------|
| **Live** (green) | Data is current (synced within last 6 hours) |
| **X days ago** | Time since last successful sync |
| **Failed** (red) | Last sync failed - check Sync History |

---

## Monitoring and Alerts

### Sync History

View detailed sync history at **Dashboard → Sync History** or navigate to `/sync-history`. This page shows:

- All past sync attempts with timestamps
- Success/failure status for each sync
- Number of records processed
- Error messages for failed syncs
- Duration of each sync operation

### Email Alerts

The system sends email alerts for critical events:

| Event | Recipients | Content |
|-------|------------|---------|
| Sync Failure | Admin (zaidshopejuwbh@gmail.com) | Error details and suggested actions |
| OTP Request | Admin | Notification when OTP is being fetched |
| Chargeback Alert | Admin | Policy details and reversal information |
| Login Activity | Admin | When automated login is performed |

### Chargeback Notifications

The system monitors Transamerica for chargeback alerts and premium reversals. When detected:

1. Alert appears on the Dashboard under "Compliance & Platform Fee Status"
2. Email notification is sent to the admin
3. Details include policy number, amount, and affected client

---

## Troubleshooting

### Common Issues and Solutions

#### Sync Fails with "Invalid Credentials"

**Symptoms:** Sync fails immediately with authentication error.

**Causes:**
- Password was changed on the portal
- Account is locked due to failed login attempts
- Credentials were entered incorrectly

**Solution:**
1. Verify you can log in manually to the portal (MyWBH or Transamerica)
2. Update the credentials in Manus Secrets panel
3. Wait 15-30 minutes if account was locked
4. Trigger a manual sync to test

#### Sync Fails with "OTP Timeout"

**Symptoms:** Sync starts but fails waiting for OTP code.

**Causes:**
- Gmail App Password is incorrect or expired
- OTP email is going to spam folder
- Gmail IMAP is disabled

**Solution:**
1. Check if OTP emails are arriving in the Gmail inbox
2. Verify Gmail App Password is correct
3. Enable IMAP in Gmail settings (Settings → See all settings → Forwarding and POP/IMAP)
4. Generate a new App Password if needed

#### Sync Fails with "Security Question Required"

**Symptoms:** Transamerica sync fails after OTP verification.

**Causes:**
- New security question was asked
- Security question answer is incorrect

**Solution:**
1. Log in manually to Transamerica to see the question
2. Update the corresponding environment variable:
   - `TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY` for "first job city"
   - `TRANSAMERICA_SECURITY_Q_PET_NAME` for "pet name"
3. If a new question type appears, contact the developer to add support

#### Dashboard Shows Stale Data

**Symptoms:** Data hasn't updated even though sync shows success.

**Causes:**
- Browser cache showing old data
- Sync completed but with partial data

**Solution:**
1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Check Sync History for any warnings
3. Verify the specific data in the database

#### Pending Policies Not Updating

**Symptoms:** Transamerica pending policies show old requirements.

**Causes:**
- Transamerica session expired during sync
- Network timeout while extracting policy details

**Solution:**
1. Trigger manual sync from Pending Policies page
2. Check Sync History for specific errors
3. If persistent, the portal structure may have changed (contact developer)

### Diagnostic Steps

When troubleshooting sync issues, follow these steps:

**Step 1: Check Sync History**
Navigate to Sync History and look for the most recent sync attempt. Note the error message and timestamp.

**Step 2: Verify Credentials**
Try logging in manually to the affected portal (MyWBH or Transamerica) using the same credentials.

**Step 3: Check Email**
Verify that OTP emails are being received in the configured Gmail account.

**Step 4: Review Server Logs**
If you have access to server logs, look for detailed error messages around the sync timestamp.

**Step 5: Test Manual Sync**
Trigger a manual sync and watch for immediate errors.

---

## Maintenance Procedures

### Regular Maintenance Tasks

| Task | Frequency | Description |
|------|-----------|-------------|
| Review Sync History | Weekly | Check for failed syncs and patterns |
| Verify Data Accuracy | Monthly | Spot-check CRM data against portals |
| Update Credentials | As needed | When passwords change |
| Clear Old Sync Logs | Quarterly | Archive logs older than 90 days |

### Database Maintenance

The database is managed by Manus and requires minimal maintenance. However, you should:

1. **Monitor Table Sizes** - Large tables may need indexing optimization
2. **Review Sync Logs** - Clean up old logs periodically
3. **Backup Data** - Manus provides automatic backups, but export critical data periodically

### Updating the Application

When updates are available:

1. Review the changelog for breaking changes
2. Create a checkpoint before updating
3. Apply updates through the Manus interface
4. Test all sync functionality after update
5. Rollback if issues are detected

### Emergency Procedures

#### If Sync Completely Stops Working

1. Check if the external portals (MyWFG, Transamerica) are accessible
2. Verify all credentials are still valid
3. Check for any Manus platform issues
4. Contact support if the issue persists

#### If Data Appears Corrupted

1. Stop any running syncs
2. Create a checkpoint of current state
3. Identify the scope of corruption
4. Rollback to a previous checkpoint if needed
5. Re-run sync to restore data

---

## Contact and Support

For issues not covered in this guide:

1. **Manus Support** - Submit requests at [https://help.manus.im](https://help.manus.im)
2. **Developer Contact** - For code-level issues, contact the development team
3. **Portal Support** - For MyWBH or Transamerica portal issues, contact their respective support teams

---

## Appendix: Environment Variable Reference

### Complete List

```
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Authentication
JWT_SECRET=<auto-generated>
VITE_APP_ID=<auto-generated>
OAUTH_SERVER_URL=<auto-generated>
VITE_OAUTH_PORTAL_URL=<auto-generated>

# MyWBH Integration
MYWFG_USERNAME=<your-mywfg-username>
MYWFG_PASSWORD=<your-mywfg-password>
MYWFG_EMAIL=<gmail-for-otp>
MYWFG_APP_PASSWORD=<gmail-app-password>

# Transamerica Integration
TRANSAMERICA_USERNAME=<your-transamerica-username>
TRANSAMERICA_PASSWORD=<your-transamerica-password>
TRANSAMERICA_EMAIL=<gmail-for-otp>
TRANSAMERICA_APP_PASSWORD=<gmail-app-password>
TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY=<answer>
TRANSAMERICA_SECURITY_Q_PET_NAME=<answer>

# Manus APIs (auto-configured)
BUILT_IN_FORGE_API_URL=<auto-generated>
BUILT_IN_FORGE_API_KEY=<auto-generated>
VITE_FRONTEND_FORGE_API_KEY=<auto-generated>
VITE_FRONTEND_FORGE_API_URL=<auto-generated>

# Application Settings
VITE_APP_TITLE=Wealth Builders Haven CRM
VITE_APP_LOGO=/wbh-logo.png
```

### Security Notes

- Never share credentials in plain text
- Use strong, unique passwords for each portal
- Rotate App Passwords periodically
- Monitor for unauthorized access attempts
- Keep security question answers confidential

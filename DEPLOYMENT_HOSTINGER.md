# Deploying Wealth Builders Haven CRM to Hostinger

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Hostinger VPS Setup](#hostinger-vps-setup)
4. [Server Configuration](#server-configuration)
5. [Database Setup](#database-setup)
6. [Application Deployment](#application-deployment)
7. [Environment Configuration](#environment-configuration)
8. [SSL Certificate Setup](#ssl-certificate-setup)
9. [Process Management](#process-management)
10. [Nginx Configuration](#nginx-configuration)
11. [Automated Sync Setup](#automated-sync-setup)
12. [Maintenance & Updates](#maintenance--updates)
13. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions for deploying the Wealth Builders Haven CRM to a Hostinger VPS (Virtual Private Server). The deployment uses Node.js with a MySQL database, Nginx as a reverse proxy, and PM2 for process management.

### Architecture Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 19 + Vite | User interface |
| **Backend** | Express + tRPC | API server |
| **Database** | MySQL 8.0 | Data storage |
| **Web Server** | Nginx | Reverse proxy & SSL |
| **Process Manager** | PM2 | Application lifecycle |
| **Browser Automation** | Playwright | MyWFG/Transamerica sync |

---

## Prerequisites

Before starting the deployment, ensure you have:

1. **Hostinger VPS Account** - Minimum KVM 2 plan recommended (2 vCPU, 8GB RAM)
2. **Domain Name** - Pointed to your Hostinger VPS IP address
3. **SSH Access** - Root or sudo access to your VPS
4. **GitHub Access** - Access to the wfg-crm repository
5. **Gmail App Password** - For automated OTP retrieval

### Recommended VPS Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## Hostinger VPS Setup

### Step 1: Access Your VPS

Log into your Hostinger hPanel and navigate to VPS → Manage. Note your VPS IP address and SSH credentials.

Connect via SSH:

```bash
ssh root@your-vps-ip-address
```

### Step 2: Update System Packages

```bash
apt update && apt upgrade -y
```

### Step 3: Create a Non-Root User

For security, create a dedicated user for running the application:

```bash
adduser wfgcrm
usermod -aG sudo wfgcrm
su - wfgcrm
```

### Step 4: Install Required Software

Install Node.js 22.x:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Install pnpm package manager:

```bash
sudo npm install -g pnpm
```

Install MySQL 8.0:

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Install Nginx:

```bash
sudo apt install -y nginx
```

Install PM2:

```bash
sudo npm install -g pm2
```

Install Playwright dependencies (for browser automation):

```bash
sudo apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libasound2 libpango-1.0-0 libcairo2
```

---

## Server Configuration

### Step 1: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 2: Configure MySQL

Create the database and user:

```bash
sudo mysql -u root -p
```

Execute the following SQL commands:

```sql
CREATE DATABASE wfgcrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wfgcrm_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON wfgcrm.* TO 'wfgcrm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Create Application Directory

```bash
sudo mkdir -p /var/www/wfgcrm
sudo chown wfgcrm:wfgcrm /var/www/wfgcrm
```

---

## Database Setup

### Step 1: Note Your Database URL

Your database connection string will be:

```
mysql://wfgcrm_user:your_secure_password_here@localhost:3306/wfgcrm
```

### Step 2: Database Migrations

After deploying the application code, run migrations:

```bash
cd /var/www/wfgcrm
pnpm db:push
```

This command will create all necessary tables based on the Drizzle schema.

---

## Application Deployment

### Step 1: Clone the Repository

```bash
cd /var/www/wfgcrm
git clone https://github.com/coachzee/wfg-crm.git .
```

If the repository is private, use a Personal Access Token:

```bash
git clone https://coachzee:YOUR_PAT_TOKEN@github.com/coachzee/wfg-crm.git .
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Install Playwright Browsers

```bash
npx playwright install chromium
```

### Step 4: Build the Application

```bash
pnpm build
```

This creates optimized production builds for both frontend and backend.

---

## Environment Configuration

### Step 1: Create Environment File

Create the `.env` file in the project root:

```bash
nano /var/www/wfgcrm/.env
```

### Step 2: Configure Environment Variables

Add the following variables (replace placeholder values with your actual credentials):

```env
# Database Configuration
DATABASE_URL=mysql://wfgcrm_user:your_secure_password@localhost:3306/wfgcrm

# Authentication
JWT_SECRET=your_very_long_random_secret_key_at_least_32_characters

# Application Settings
NODE_ENV=production
PORT=3000

# MyWFG Integration
MYWFG_USERNAME=your_mywfg_username
MYWFG_PASSWORD=your_mywfg_password
MYWFG_EMAIL=your_gmail_for_otp@gmail.com
MYWFG_APP_PASSWORD=your_gmail_app_password

# Transamerica Integration
TRANSAMERICA_USERNAME=your_transamerica_username
TRANSAMERICA_PASSWORD=your_transamerica_password
TRANSAMERICA_EMAIL=your_gmail_for_transamerica_otp@gmail.com
TRANSAMERICA_APP_PASSWORD=your_gmail_app_password
TRANSAMERICA_SECURITY_Q_PET_NAME=your_pet_name
TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY=your_first_job_city

# Owner Information (for notifications)
OWNER_NAME=Your Name
OWNER_OPEN_ID=your_manus_open_id
```

### Step 3: Secure the Environment File

```bash
chmod 600 /var/www/wfgcrm/.env
```

### Gmail App Password Setup

To enable automated OTP retrieval, you need a Gmail App Password:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Navigate to Security → 2-Step Verification → App passwords
4. Generate a new app password for "Mail"
5. Use this 16-character password as your `MYWFG_APP_PASSWORD`

---

## SSL Certificate Setup

### Step 1: Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Obtain SSL Certificate

Replace `yourdomain.com` with your actual domain:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts to complete certificate installation. Certbot will automatically configure Nginx for HTTPS.

### Step 3: Auto-Renewal

Certbot automatically sets up a cron job for certificate renewal. Verify with:

```bash
sudo certbot renew --dry-run
```

---

## Process Management

### Step 1: Create PM2 Ecosystem File

Create `/var/www/wfgcrm/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'wfgcrm',
    script: 'dist/server/index.js',
    cwd: '/var/www/wfgcrm',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Step 2: Start the Application

```bash
cd /var/www/wfgcrm
pm2 start ecosystem.config.js
```

### Step 3: Configure PM2 Startup

```bash
pm2 startup systemd
pm2 save
```

This ensures the application starts automatically after server reboot.

### Step 4: Monitor Application

```bash
pm2 status
pm2 logs wfgcrm
pm2 monit
```

---

## Nginx Configuration

### Step 1: Create Nginx Configuration

Create `/etc/nginx/sites-available/wfgcrm`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Step 2: Enable the Configuration

```bash
sudo ln -s /etc/nginx/sites-available/wfgcrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Automated Sync Setup

The CRM includes a built-in sync endpoint that can be triggered by cron jobs. This syncs data from MyWFG and Transamerica portals automatically.

### Step 1: Configure SYNC_SECRET

Add a secure sync secret to your `.env` file:

```env
# Sync Authentication (generate a random 32+ character string)
SYNC_SECRET=your_very_long_random_sync_secret_at_least_32_chars
APP_URL=https://wealthbuildershaven.com
```

Generate a secure secret:

```bash
openssl rand -hex 32
```

### Step 2: Configure Cron Jobs

Edit crontab:

```bash
crontab -e
```

Add the following lines to run sync at **3:30 PM and 6:30 PM EST** (adjust for your timezone):

```cron
# MyWFG/Transamerica Sync - 3:30 PM EST (20:30 UTC)
30 20 * * * curl -s -X POST "https://wealthbuildershaven.com/api/cron/sync" -H "x-sync-secret: YOUR_SYNC_SECRET" -H "content-type: application/json" -d '{"source":"hostinger-cron"}' >> /var/log/wfgcrm/sync.log 2>&1

# MyWFG/Transamerica Sync - 6:30 PM EST (23:30 UTC)
30 23 * * * curl -s -X POST "https://wealthbuildershaven.com/api/cron/sync" -H "x-sync-secret: YOUR_SYNC_SECRET" -H "content-type: application/json" -d '{"source":"hostinger-cron"}' >> /var/log/wfgcrm/sync.log 2>&1
```

**Note:** Replace `YOUR_SYNC_SECRET` with your actual SYNC_SECRET value.

> **IMPORTANT:** GET requests with `?secret=` query parameter are **DISABLED in production** for security. You must use POST with the `x-sync-secret` header as shown above. If you need to enable GET with query secrets (not recommended), set `ENABLE_CRON_GET_SECRET=true` in your environment.

### Step 3: Alternative - Use the Sync Script

If you prefer using a Node.js script instead of curl:

```bash
# 3:30 PM EST (20:30 UTC)
30 20 * * * cd /var/www/wfgcrm && APP_URL=https://wealthbuildershaven.com SYNC_SECRET=your_secret node scripts/cron-sync.mjs >> /var/log/wfgcrm/sync.log 2>&1

# 6:30 PM EST (23:30 UTC)
30 23 * * * cd /var/www/wfgcrm && APP_URL=https://wealthbuildershaven.com SYNC_SECRET=your_secret node scripts/cron-sync.mjs >> /var/log/wfgcrm/sync.log 2>&1
```

### Step 4: Create Log Directory

```bash
sudo mkdir -p /var/log/wfgcrm
sudo chown wfgcrm:wfgcrm /var/log/wfgcrm
```

### Step 5: Test the Sync Endpoint

Test that the sync endpoint works:

```bash
curl -X POST "https://wealthbuildershaven.com/api/cron/sync" \
  -H "x-sync-secret: YOUR_SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"source":"manual-test"}'
```

Expected response:

```json
{
  "success": true,
  "timestamp": "2026-01-15T20:30:00.000Z",
  "runId": "abc123",
  "metrics": {
    "mywfg": { "success": true },
    "transamerica": { "success": true }
  }
}
```

### Timezone Reference

| EST Time | UTC Time | Cron Expression |
|----------|----------|----------------|
| 3:30 PM | 20:30 | `30 20 * * *` |
| 6:30 PM | 23:30 | `30 23 * * *` |

**Note:** During Daylight Saving Time (EDT), subtract 1 hour from UTC times.

---

## Maintenance & Updates

### Updating the Application

To deploy updates from GitHub:

```bash
cd /var/www/wfgcrm
git pull origin main
pnpm install
pnpm build
pm2 restart wfgcrm
```

### Database Backups

Create a backup script at `/var/www/wfgcrm/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/wfgcrm"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u wfgcrm_user -p'your_password' wfgcrm > $BACKUP_DIR/wfgcrm_$DATE.sql
# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

Schedule daily backups:

```cron
0 2 * * * /var/www/wfgcrm/scripts/backup-db.sh
```

### Log Rotation

Create `/etc/logrotate.d/wfgcrm`:

```
/var/log/wfgcrm/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 wfgcrm wfgcrm
}
```

---

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **502 Bad Gateway** | Application not running | Check `pm2 status` and restart if needed |
| **Database connection failed** | Wrong credentials or MySQL not running | Verify DATABASE_URL and `systemctl status mysql` |
| **Sync fails with OTP error** | Gmail app password expired | Generate new app password in Google Account |
| **SSL certificate error** | Certificate expired | Run `sudo certbot renew` |
| **Out of memory** | Insufficient RAM | Upgrade VPS plan or optimize memory usage |

### Checking Logs

Application logs:

```bash
pm2 logs wfgcrm
```

Nginx logs:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

Sync logs:

```bash
tail -f /var/log/wfgcrm/sync.log
```

### Restarting Services

```bash
# Restart application
pm2 restart wfgcrm

# Restart Nginx
sudo systemctl restart nginx

# Restart MySQL
sudo systemctl restart mysql
```

### Health Check

Create a simple health check endpoint test:

```bash
curl -I https://yourdomain.com/api/health
```

---

## Security Recommendations

1. **Keep software updated**: Regularly run `apt update && apt upgrade`
2. **Use strong passwords**: All passwords should be at least 16 characters
3. **Enable fail2ban**: Protect against brute force attacks
4. **Regular backups**: Automate daily database backups
5. **Monitor logs**: Set up log monitoring for suspicious activity
6. **Limit SSH access**: Use key-based authentication only

### Installing Fail2ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Support

For issues specific to this deployment:

1. Check the troubleshooting section above
2. Review application logs with `pm2 logs`
3. Verify all environment variables are correctly set
4. Ensure all services are running (`pm2 status`, `systemctl status nginx mysql`)

For Hostinger-specific issues, contact Hostinger support through hPanel.

---

*This deployment guide is maintained by the Wealth Builders Haven team. For the latest updates, visit the GitHub repository.*

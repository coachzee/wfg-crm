# WBH CRM - Wealth Builders Haven Customer Relationship Management

## What is WBH CRM?

WBH CRM is a comprehensive customer relationship management system designed specifically for insurance and financial services professionals. It helps you manage your team of agents, track client policies, monitor production and commissions, and stay organized with tasks and follow-ups.

**Key Features:**
- **Dashboard** - Get a quick overview of your team's performance, including active associates, licensed agents, and total face amount protected
- **Agent Management** - Track your team members, their ranks, licenses, and performance
- **Client Management** - Manage client information and their insurance policies
- **Production Tracking** - Monitor inforce policies, pending policies, and commission calculations
- **Task Management** - Create and track tasks and follow-ups
- **Team Hierarchy** - Visualize your organization structure and downline

---

## How the Application Works

### High-Level Architecture

The WBH CRM is built as a modern web application with three main components:

| Component | Description | Technology |
|-----------|-------------|------------|
| **Frontend** | The user interface you see in your browser | React, Tailwind CSS |
| **Backend** | The server that processes requests and business logic | Node.js, Express, tRPC |
| **Database** | Where all your data is stored | MySQL/TiDB |

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Your Browser  │────▶│   Web Server    │────▶│    Database     │
│   (Frontend)    │◀────│   (Backend)     │◀────│    (MySQL)      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **You interact** with the application through your web browser
2. **The frontend** sends requests to the backend server
3. **The backend** processes the request and communicates with the database
4. **The database** stores and retrieves your data
5. **Results flow back** through the same path to display in your browser

---

## Major Components

### 1. Authentication System
- Users log in with email and password
- Passwords are securely hashed using bcrypt
- Sessions are managed with JWT tokens stored in cookies
- First registered user automatically becomes the administrator

### 2. Dashboard
- Shows key metrics: Active Associates, Licensed Agents, Net Licensed, Task Completion
- Displays Total Face Amount, Families Protected, and Super Team Cash Flow
- Compliance and Platform Fee Status section

### 3. Agent Management
- Add, edit, and view agent profiles
- Track WFG ranks and license status
- View agent hierarchy and upline/downline relationships
- Monitor individual agent production

### 4. Client Management
- Store client contact information
- Link clients to their policies
- Track policy status and details

### 5. Production Tracking
- View inforce policies with commission calculations
- Track pending policies and their requirements
- Top Agents by Commission leaderboard
- Bulk update capabilities for policy data

### 6. Settings
- Manage user profile
- Configure notification preferences
- Set up external service credentials (MyWFG, Transamerica)

---

## Routine Maintenance

### Daily Tasks
- No daily maintenance required - the system runs automatically

### Weekly Tasks
- Review the Dashboard for any alerts or pending items
- Check Sync History for any failed sync attempts

### Monthly Tasks
- Review and clean up completed tasks
- Verify agent license statuses are up to date
- Back up your database (see Database Backup section below)

### Database Backup

To back up your database, run this command on your server:

```bash
mysqldump -h YOUR_DATABASE_HOST -u YOUR_USERNAME -p YOUR_DATABASE_NAME > backup_$(date +%Y%m%d).sql
```

Replace:
- `YOUR_DATABASE_HOST` with your database server address
- `YOUR_USERNAME` with your database username
- `YOUR_DATABASE_NAME` with your database name

You'll be prompted for your database password.

---

## Updating Passwords and Credentials

### Where Credentials Are Stored

All sensitive credentials are stored as **environment variables** in a file called `.env` in the root directory of the application. This file is NOT included in version control for security reasons.

### How to Update Credentials

**Step 1:** Connect to your server via SSH or access your hosting control panel

**Step 2:** Navigate to the application directory:
```bash
cd /path/to/wbh-crm
```

**Step 3:** Open the `.env` file with a text editor:
```bash
nano .env
```

**Step 4:** Find the credential you want to update and change its value

**Step 5:** Save the file (in nano: Ctrl+O, then Enter, then Ctrl+X)

**Step 6:** Restart the application:
```bash
pm2 restart wbh-crm
# or if using systemd:
sudo systemctl restart wbh-crm
```

### Available Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `mysql://user:pass@host:3306/dbname` |
| `JWT_SECRET` | Secret key for session tokens | `your-random-secret-key` |
| `MYWFG_USERNAME` | MyWFG portal username | `your-mywfg-username` |
| `MYWFG_PASSWORD` | MyWFG portal password | `your-mywfg-password` |
| `TRANSAMERICA_USERNAME` | Transamerica portal username | `your-ta-username` |
| `TRANSAMERICA_PASSWORD` | Transamerica portal password | `your-ta-password` |
| `SMTP_HOST` | Email server for notifications | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | `your-email@gmail.com` |
| `SMTP_PASS` | Email password or app password | `your-app-password` |

### Precautions When Updating Credentials

> **⚠️ IMPORTANT:** Always follow these precautions to avoid breaking the system

1. **Make a backup** before changing any credentials:
   ```bash
   cp .env .env.backup
   ```

2. **Never share** your `.env` file or its contents with anyone

3. **Use strong passwords** - at least 12 characters with letters, numbers, and symbols

4. **Test after changes** - after updating credentials, verify the application still works by logging in and checking the Dashboard

5. **Keep credentials secure** - if you suspect credentials have been compromised, change them immediately

6. **Database password changes** require updating both:
   - The database server password
   - The `DATABASE_URL` in your `.env` file

---

## Troubleshooting

### Application Won't Start

1. Check if all environment variables are set correctly in `.env`
2. Verify the database is accessible
3. Check the application logs:
   ```bash
   pm2 logs wbh-crm
   ```

### Can't Log In

1. Verify your email and password are correct
2. Clear your browser cookies and try again
3. Check if the database is running

### Data Not Syncing

The automated sync from MyWFG and Transamerica is currently disabled. To update data:
1. Export data from the external portal as CSV
2. Use the Import feature in the CRM
3. Or manually enter data through the UI

### Database Connection Errors

1. Verify `DATABASE_URL` in `.env` is correct
2. Check if the database server is running
3. Ensure your IP is allowed in the database firewall rules

---

## Getting Help

If you encounter issues not covered in this documentation:

1. Check the application logs for error messages
2. Review the `.env` file for missing or incorrect values
3. Ensure all services (database, web server) are running

---

## Technical Specifications

For developers and technical administrators:

- **Frontend:** React 19, Tailwind CSS 4, Vite
- **Backend:** Node.js, Express 4, tRPC 11
- **Database:** MySQL 8.0+ / TiDB
- **Authentication:** JWT with bcrypt password hashing
- **Package Manager:** pnpm

### File Structure

```
wbh-crm/
├── client/           # Frontend React application
│   ├── src/
│   │   ├── pages/    # Page components
│   │   ├── components/  # Reusable UI components
│   │   └── lib/      # Utilities and helpers
├── server/           # Backend server code
│   ├── _core/        # Core infrastructure
│   ├── db.ts         # Database functions
│   └── routers.ts    # API endpoints
├── drizzle/          # Database schema
├── docs/             # Documentation
└── .env              # Environment variables (not in git)
```

---

*Documentation last updated: January 2026*
*WBH CRM Version: 1.0.0*

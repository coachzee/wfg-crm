# WFG CRM System Architecture

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Overview

The Wealth Builders Haven CRM (WFG CRM) is a comprehensive customer relationship management system designed specifically for World Financial Group (WFG) insurance agents. The system integrates with external portals (MyWFG.com and Transamerica Life Access) to automatically sync agent data, track production metrics, manage pending policies, and provide actionable insights through a modern dashboard interface.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    React 19 + TypeScript Frontend                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │Dashboard │ │ Agents   │ │ Clients  │ │Production│ │ Pending  │  │    │
│  │  │          │ │          │ │          │ │          │ │ Policies │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  │                          │                                          │    │
│  │                    tRPC Client (Type-Safe)                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Express + tRPC Server                             │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                      tRPC Routers                             │   │    │
│  │  │  • auth      • agents    • clients    • tasks                 │   │    │
│  │  │  • dashboard • sync      • production • pendingPolicies       │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                          │                                          │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Service Layer                              │   │    │
│  │  │  • MyWFG Sync Service    • Transamerica Sync Service         │   │    │
│  │  │  • Gmail OTP Service     • Notification Service               │   │    │
│  │  │  • Email Alert Service   • Chargeback Notification           │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│    MySQL/TiDB       │  │    External APIs    │  │   Puppeteer/Browser │
│    Database         │  │                     │  │   Automation        │
│  ┌───────────────┐  │  │  • Manus OAuth      │  │                     │
│  │ users         │  │  │  • Manus Forge API  │  │  • MyWFG.com        │
│  │ agents        │  │  │  • Gmail IMAP       │  │  • Transamerica     │
│  │ clients       │  │  │  • S3 Storage       │  │    Life Access      │
│  │ tasks         │  │  │                     │  │                     │
│  │ production    │  │  └─────────────────────┘  └─────────────────────┘
│  │ pendingPolicies│ │
│  │ syncLogs      │  │
│  └───────────────┘  │
└─────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4 | Modern, responsive UI with type safety |
| **UI Components** | shadcn/ui, Radix UI | Accessible, customizable component library |
| **State Management** | tRPC React Query | Server state with automatic caching |
| **Backend** | Express 4, tRPC 11 | Type-safe API with end-to-end type inference |
| **Database** | MySQL/TiDB with Drizzle ORM | Relational data storage with type-safe queries |
| **Authentication** | Manus OAuth, JWT | Secure user authentication |
| **Browser Automation** | Puppeteer | Headless browser for portal scraping |
| **Email** | IMAP (Gmail) | OTP extraction for automated logins |
| **Scheduling** | Node.js setInterval | Automated sync jobs |

---

## Data Flow

### 1. User Authentication Flow

```
User → Login Page → Manus OAuth → Callback → JWT Cookie → Authenticated Session
```

The system uses Manus OAuth for authentication. When a user logs in, they are redirected to the Manus OAuth portal, which returns an authorization code. The server exchanges this code for user information and creates a JWT session cookie.

### 2. MyWFG Data Sync Flow

```
Scheduled Trigger (3:30 PM / 6:30 PM EST)
    │
    ▼
Launch Puppeteer Browser
    │
    ▼
Navigate to MyWFG.com Login
    │
    ▼
Enter Credentials (from Environment)
    │
    ▼
Wait for OTP Email (Gmail IMAP)
    │
    ▼
Extract OTP and Submit
    │
    ▼
Navigate to Reports (Downline Status, Cash Flow, etc.)
    │
    ▼
Extract Data from HTML Tables
    │
    ▼
Parse and Transform Data
    │
    ▼
Upsert to Database (agents, cashflow, production)
    │
    ▼
Log Sync Results
```

### 3. Transamerica Pending Policies Sync Flow

```
Scheduled Trigger (3:30 PM / 6:30 PM EST)
    │
    ▼
Launch Puppeteer Browser
    │
    ▼
Navigate to secure.transamerica.com
    │
    ▼
Enter Credentials → Handle OTP → Answer Security Questions
    │
    ▼
Navigate to Transamerica Life Access
    │
    ▼
Go to My Book → Pending → View My Book
    │
    ▼
Extract Policy List
    │
    ▼
For Each Policy: Click View → Extract Requirements
    │
    ▼
Categorize Requirements:
    • Pending with Producer
    • Pending with Transamerica
    • Completed
    │
    ▼
Upsert to Database (pendingPolicies, pendingRequirements)
    │
    ▼
Log Sync Results
```

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | System users with OAuth | id, openId, name, email, role |
| `agents` | WFG team members | id, agentCode, firstName, lastName, rank, stage |
| `clients` | Policy holders | id, firstName, lastName, email, phone, agentId |
| `workflowTasks` | Follow-ups and reminders | id, title, dueDate, status, agentId, clientId |
| `productionRecords` | Agent production tracking | id, agentId, amount, productType, submittedDate |
| `pendingPolicies` | Transamerica pending policies | id, policyNumber, ownerName, status, faceAmount |
| `pendingRequirements` | Policy requirements | id, policyId, category, requirement, status |
| `syncLogs` | Sync history and audit | id, syncType, status, startedAt, completedAt |
| `agentCashFlowHistory` | Monthly cash flow data | id, agentId, month, year, totalCashFlow |

### Entity Relationships

```
users (1) ──────────────── (N) agents
agents (1) ─────────────── (N) clients
agents (1) ─────────────── (N) productionRecords
agents (1) ─────────────── (N) workflowTasks
agents (1) ─────────────── (N) agentCashFlowHistory
clients (1) ────────────── (N) workflowTasks
pendingPolicies (1) ────── (N) pendingRequirements
```

---

## Key Components

### Server Components

| File | Purpose |
|------|---------|
| `server/routers.ts` | Main tRPC router with all API procedures |
| `server/db.ts` | Database helper functions and queries |
| `server/gmail-otp.ts` | Gmail IMAP service for OTP extraction |
| `server/auto-login-mywfg.ts` | MyWFG portal automated login |
| `server/auto-login-transamerica.ts` | Transamerica portal automated login |
| `server/mywfg-service-v3.ts` | MyWFG data extraction service |
| `server/mywfg-downline-scraper.ts` | Downline status report scraper |
| `server/mywfg-cashflow-scraper.ts` | Cash flow report scraper |
| `server/transamerica-sync.ts` | Transamerica pending policies sync |
| `server/notification-service.ts` | Manus notification integration |
| `server/email-alert.ts` | Email alert service |
| `server/chargeback-notification.ts` | Chargeback alert detection |

### Client Components

| File | Purpose |
|------|---------|
| `client/src/pages/Dashboard.tsx` | Main dashboard with metrics |
| `client/src/pages/Agents.tsx` | Agent list and management |
| `client/src/pages/Clients.tsx` | Client list and management |
| `client/src/pages/PendingPolicies.tsx` | Transamerica pending policies |
| `client/src/pages/Production.tsx` | Production tracking |
| `client/src/pages/Tasks.tsx` | Task management |
| `client/src/components/DashboardLayout.tsx` | Sidebar navigation layout |

---

## Scheduled Jobs

The system runs automated sync jobs at specific times:

| Job | Schedule (EST) | Purpose |
|-----|----------------|---------|
| MyWFG Sync | 3:30 PM, 6:30 PM | Sync agent data, cash flow, production |
| Transamerica Sync | 3:30 PM, 6:30 PM | Sync pending policies and requirements |

These jobs are configured in:
- `server/mywfg-sync-job.ts` - MyWFG scheduling
- `server/transamerica-sync.ts` - Transamerica scheduling (scheduleTransamericaSync function)

---

## Security Considerations

### Credential Storage

All sensitive credentials are stored in environment variables, never in code:

- `MYWFG_USERNAME`, `MYWFG_PASSWORD` - MyWFG portal credentials
- `TRANSAMERICA_USERNAME`, `TRANSAMERICA_PASSWORD` - Transamerica credentials
- `TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY`, `TRANSAMERICA_SECURITY_Q_PET_NAME` - Security question answers
- `MYWFG_EMAIL`, `MYWFG_APP_PASSWORD` - Gmail credentials for OTP
- `JWT_SECRET` - Session signing secret

### Authentication

- All API routes are protected by JWT authentication
- Role-based access control (admin/user roles)
- Session cookies are HTTP-only and secure

### Data Protection

- Database connections use SSL/TLS
- Passwords are never logged or exposed in error messages
- OTP codes are extracted and used immediately, not stored

---

## Error Handling

The system implements comprehensive error handling:

1. **tRPC Errors** - Typed errors with codes (UNAUTHORIZED, NOT_FOUND, etc.)
2. **Sync Errors** - Logged to syncLogs table with error messages
3. **Browser Automation Errors** - Screenshots captured on failure for debugging
4. **Email Alerts** - Critical errors trigger email notifications to admin

---

## Monitoring

### Sync Status

The dashboard displays real-time sync status including:
- Last sync time
- Sync result (success/failed/partial)
- Number of records processed
- Any error messages

### Sync History

The Sync History page (`/sync-history`) shows:
- All past sync attempts
- Success/failure rates
- Duration of each sync
- Detailed error logs

---

## References

- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Puppeteer Documentation](https://pptr.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)

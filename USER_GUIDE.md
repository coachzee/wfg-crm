# Wealth Builders Haven CRM - User Guide

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Agent Management](#agent-management)
5. [Client Management](#client-management)
6. [Production Tracking](#production-tracking)
7. [Pending Policies](#pending-policies)
8. [Tasks & Follow-ups](#tasks--follow-ups)
9. [Team Management](#team-management)
10. [Settings & Integration](#settings--integration)
11. [MyWFG Sync](#mywfg-sync)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

Wealth Builders Haven CRM is a comprehensive customer relationship management system designed specifically for WFG (World Financial Group) agents and team leaders. The system integrates directly with MyWFG.com and Transamerica portals to provide real-time data synchronization, commission tracking, and team management capabilities.

### Key Features

The CRM provides a unified platform for managing your insurance business with the following core capabilities:

| Feature | Description |
|---------|-------------|
| **Agent Management** | Track recruits through the entire licensing workflow from recruitment to fully licensed status |
| **Production Dashboard** | Monitor team production, commissions, and face amounts in real-time |
| **MyWFG Integration** | Automated sync with MyWFG.com for agent data, cash flow, and compliance status |
| **Transamerica Integration** | Extract inforce policies and pending policy requirements automatically |
| **Commission Calculator** | Calculate commissions based on WFG's compensation grid with generational overrides |
| **Task Management** | Create and track follow-up tasks for agents and clients |
| **Compliance Tracking** | Monitor platform fees, missing licenses, and compliance issues |

---

## Getting Started

### Accessing the CRM

Navigate to your CRM URL in any modern web browser (Chrome, Firefox, Safari, or Edge recommended). The system is fully responsive and works on desktop, tablet, and mobile devices.

### First-Time Login

1. Click the **Sign In** button on the landing page
2. If you have an account, enter your email and password
3. If you're a new user, click **Create Account** and fill in your details
4. After successful authentication, you'll be redirected to the Dashboard

### User Roles

The system supports two primary user roles:

| Role | Permissions |
|------|-------------|
| **Administrator** | Full access to all features, settings, and user management |
| **User** | Access to dashboard, agents, clients, production, and tasks |

---

## Dashboard Overview

The Dashboard is your command center, providing an at-a-glance view of your team's performance and key metrics.

### Metric Cards

The top section displays six key performance indicators:

| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Active Associates** | Total team members in your organization | MyWFG Downline Status |
| **Licensed Agents** | Life licensed associates (percentage shown) | MyWFG Downline Status |
| **Net Licensed** | Agents with $1,000+ total cash flow (TA/A only) | MyWFG Custom Reports |
| **Task Completion** | Percentage of completed tasks | Local Database |
| **Last Sync** | Time since last MyWFG data sync | Sync Service |
| **Total Face Amount** | Total life insurance coverage issued | Transamerica Inforce |
| **Families Protected** | Number of households with coverage | Transamerica Inforce |
| **Super Team Cash Flow** | Total team commission (YTD) | MyWFG Total Cash Flow |

### Clickable Metrics

Most dashboard cards are interactive. Clicking on a metric will navigate you to the relevant page with pre-applied filters:

- **Active Associates** → Agents page
- **Licensed Agents** → Agents filtered by licensed status
- **Net Licensed** → Opens modal with detailed agent list
- **Families Protected** → Production page with client details

### Compliance Section

The Compliance & Platform Fee Status section displays agents requiring attention:

- **Platform Fee First Notice** - Agents with pending platform fee payments
- **Platform Fee Final Notice** - Agents at risk of commission holds
- **Commissions on Hold** - Agents with held commissions and balance owed

---

## Agent Management

### Viewing Agents

Navigate to **Agents** from the sidebar to see your team roster. The page displays agents in card format with the following information:

- Agent name and code
- Current WFG rank (TA, A, SA, MD, SMD, etc.)
- License status
- Contact information (email, phone)
- Date added to the system

### Filtering and Search

Use the filter controls at the top of the page:

| Filter | Options |
|--------|---------|
| **Search** | Search by name, email, or agent code |
| **Stage** | All Stages, Recruitment, Training, Licensed, etc. |
| **Rank** | All Ranks, TA, A, SA, MD, SMD, EMD, etc. |
| **Tab** | Base Shop (direct recruits) or Super Team (full hierarchy) |

### Adding a New Agent

1. Click the **Add Agent** button in the top right
2. Fill in the required fields:
   - First Name and Last Name
   - Email address
   - Phone number (optional)
   - Agent Code (WFG agent code)
3. Click **Create Agent** to save

### Agent Detail View

Click on any agent card to view their detailed profile:

- **Overview Tab**: Personal information, rank progression, and production summary
- **Production Tab**: Individual production records and commission history
- **Advancement Tab**: Progress toward next rank with requirements checklist
- **Tasks Tab**: Tasks and follow-ups assigned to this agent
- **Notes Tab**: Internal notes and comments

### WFG Rank Progression

The agent detail page shows a visual progress bar indicating advancement toward the next rank. The WFG rank hierarchy is:

| Rank | Level | Base Commission |
|------|-------|-----------------|
| Training Associate (TA) | 1 | 25% |
| Associate (A) | 2 | 35% |
| Senior Associate (SA) | 3 | 45% |
| Marketing Director (MD) | 4 | 50% |
| Senior Marketing Director (SMD) | 5 | 55% |
| Executive Marketing Director (EMD) | 6 | 60% |
| CEO Marketing Director (CEO MD) | 7 | 65% |
| Executive Vice Chairman (EVC) | 8 | 70% |
| Senior Executive Vice Chairman (SEVC) | 9 | 75% |
| Field Chairman (FC) | 10 | 80% |
| Executive Chairman (EC) | 11 | 85% |

---

## Client Management

### Viewing Clients

Navigate to **Clients** from the sidebar to manage your client database. Each client card displays:

- Client name
- Assigned agent
- Contact information
- Policy status (if applicable)
- Date added

### Adding a New Client

1. Click **Add Client** button
2. Enter client details:
   - First Name and Last Name
   - Email address
   - Phone number
   - Assigned Agent (select from dropdown)
3. Click **Create Client** to save

### Client Summary Cards

The top of the Clients page shows summary metrics:

| Metric | Description |
|--------|-------------|
| **Total Clients** | Total number of clients in the system |
| **With Policies** | Clients who have active policies |
| **Upcoming Renewals** | Policies due for renewal soon |
| **New This Month** | Clients added in the current month |

---

## Production Tracking

### Production Dashboard

Navigate to **Production** to view comprehensive production analytics. The dashboard includes:

- **Total Premium**: Sum of all target premiums
- **Total Commission**: Calculated commissions based on agent levels
- **Active Policies**: Number of currently active policies
- **Total Face Amount**: Sum of all policy face amounts

### Policy Status Distribution

A visual breakdown shows policies by status:

| Status | Description |
|--------|-------------|
| **Active** | Policies currently in force |
| **Free Look Surrender** | Policies surrendered during free look period |
| **Lapsed** | Policies that have lapsed due to non-payment |
| **Surrendered** | Policies voluntarily surrendered by client |

### Tabs

| Tab | Content |
|-----|---------|
| **Overview** | Summary metrics and top policies |
| **All Policies** | Complete list of all policies with search and filter |
| **Top Clients** | Clients ranked by premium amount |
| **Top Agents** | Agents ranked by commission earned |

### Commission Calculation

Commissions are calculated using the WFG compensation formula:

```
Commission = Target Premium × 125% × Agent Level % × Split %
```

For example, a $10,000 target premium policy with a 55% SMD level agent:
- $10,000 × 1.25 × 0.55 = $6,875 commission

---

## Pending Policies

### Overview

Navigate to **Pending Policies** to track policies requiring action. This data is synced from the Transamerica portal.

### Summary Cards

| Metric | Description |
|--------|-------------|
| **Total Pending** | Policies requiring some action |
| **Pending with Producer** | Requirements the agent must fulfill |
| **Pending with Transamerica** | Requirements being processed by carrier |
| **Incomplete** | Policies with missing information |

### Policy Requirements

Each pending policy shows:

- Client name and policy number
- Face amount
- Current status
- List of pending requirements
- Requirement status (Pending, Received, Approved)

### Syncing Data

Click **Sync Now** to manually trigger a sync with Transamerica. The sync will:

1. Login to Transamerica portal automatically
2. Navigate to pending policies section
3. Extract all pending requirements
4. Update the local database

---

## Tasks & Follow-ups

### Task Management

Navigate to **Tasks** to manage follow-ups and reminders. Tasks help you track important actions for agents and clients.

### Creating a Task

1. Click **New Task** button
2. Fill in task details:
   - Title (required)
   - Description
   - Due Date
   - Priority (Low, Medium, High)
   - Assigned Agent (optional)
   - Related Client (optional)
3. Click **Create Task** to save

### Task Filters

| Tab | Shows |
|-----|-------|
| **Pending** | Tasks not yet completed |
| **Completed** | Tasks marked as done |
| **All** | All tasks regardless of status |

### Completing Tasks

Click the checkbox on any task to mark it as complete. Completed tasks are moved to the Completed tab and contribute to your Task Completion metric on the dashboard.

---

## Team Management

### Team Hierarchy

Navigate to **Team** to view your organizational structure. The Team Hierarchy tab displays:

- Visual tree of your downline organization
- Agent ranks with color-coded badges
- Expand/collapse functionality for sub-teams

### Rank Distribution

A summary shows the count of agents at each rank level:

| Rank | Icon | Color |
|------|------|-------|
| SMD+ | ⭐ | Gold |
| MD | 🎯 | Blue |
| SA | 📊 | Green |
| A | 📋 | Purple |
| TA | 🎓 | Gray |

### Commission Calculator

The **Commission Calculator** tab provides tools to calculate potential earnings:

1. **Personal Tab**: Calculate your personal commission based on premium and rank
2. **Overrides Tab**: Calculate generational override income
3. **Structure Tab**: View the complete WFG compensation structure

---

## Settings & Integration

### MyWBH Integration

Navigate to **Settings** to configure your MyWFG integration:

1. Click **Add MyWBH Credentials** (or edit existing)
2. Enter your MyWFG username and password
3. Credentials are encrypted and stored securely
4. Click **Test Connection** to verify

### Sync Status

The Settings page shows:

- **Last Sync**: Date and time of last successful sync
- **Status**: Success, Failed, or In Progress
- **Records Processed**: Number of records updated

### Manual Sync

Click **Sync Now** to trigger a manual data sync. The sync process:

1. Logs into MyWFG.com automatically
2. Handles OTP verification via Gmail
3. Extracts agent data, cash flow, and compliance info
4. Updates the local database
5. Logs the sync result

---

## MyWFG Sync

### Automated OTP Handling

The CRM includes automated OTP (One-Time Password) handling for MyWFG login:

1. When MyWFG requires OTP verification, the system automatically:
   - Connects to your Gmail inbox via IMAP
   - Searches for the latest OTP email from MyWFG
   - Extracts the verification code
   - Enters it into the MyWFG login form

2. This enables fully automated syncing without manual intervention

### Data Synced

| Data Type | Source Report | Frequency |
|-----------|---------------|-----------|
| Agent Roster | Downline Status | Daily |
| Cash Flow | Total Cash Flow | Daily |
| Net Licensed Status | Custom Reports (YTD Cash Flow) | Daily |
| Compliance Issues | Platform Fee Reports | Daily |
| Inforce Policies | Transamerica My Book | On-demand |
| Pending Policies | Transamerica Pending | On-demand |

### Sync Logs

All sync operations are logged for audit purposes. View sync history in Settings to see:

- Sync timestamp
- Status (Success/Failed)
- Records processed
- Error messages (if any)

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Can't login** | Verify email and password. Try resetting password. |
| **Sync failed** | Check MyWFG credentials in Settings. Verify Gmail app password is valid. |
| **OTP not received** | Ensure Gmail IMAP is enabled. Check spam folder. |
| **Data not updating** | Click Refresh on dashboard. Try manual sync. |
| **Missing agents** | Only Base Shop agents are imported. Super Team agents are under other SMDs. |

### Getting Help

If you encounter issues not covered in this guide:

1. Check the sync logs in Settings for error details
2. Verify all credentials are correctly configured
3. Ensure your MyWFG and Transamerica accounts are active
4. Contact support with specific error messages

### Browser Requirements

For optimal performance, use:

- Google Chrome (version 90+)
- Mozilla Firefox (version 88+)
- Microsoft Edge (version 90+)
- Safari (version 14+)

Enable JavaScript and cookies for full functionality.

---

## Appendix: Environment Variables

For self-hosted deployments, the following environment variables must be configured:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL/TiDB connection string | Yes |
| `JWT_SECRET` | Secret key for session tokens | Yes |
| `MYWFG_USERNAME` | MyWFG login username | Yes |
| `MYWFG_PASSWORD` | MyWFG login password | Yes |
| `MYWFG_EMAIL` | Gmail for OTP (same as username) | Yes |
| `MYWFG_APP_PASSWORD` | Gmail app password for IMAP | Yes |
| `TRANSAMERICA_USERNAME` | Transamerica portal username | Yes |
| `TRANSAMERICA_PASSWORD` | Transamerica portal password | Yes |
| `TRANSAMERICA_EMAIL` | Gmail for Transamerica OTP | Yes |
| `TRANSAMERICA_APP_PASSWORD` | Gmail app password | Yes |

See `DEPLOYMENT_HOSTINGER.md` for complete deployment instructions.

---

*This documentation is maintained by the Wealth Builders Haven team. For the latest updates, visit the GitHub repository.*

# WFG CRM Project TODO

## Database Schema & Core Setup
- [x] Define and implement agents table (recruits with workflow stages)
- [x] Define and implement clients table (policy holders)
- [x] Define and implement workflow_tasks table (follow-ups and reminders)
- [x] Define and implement production_records table (agent production tracking)
- [x] Define and implement mywfg_sync_logs table (integration audit trail)
- [x] Define and implement credentials table (encrypted mywfg.com credentials)
- [x] Run database migrations

## Authentication & Authorization
- [x] Set up user roles (admin, agent, team_member)
- [x] Implement role-based access control (RBAC) in procedures
- [ ] Create admin procedure to manage user roles
- [x] Implement credential encryption/decryption utilities
- [x] Create secure credential storage procedures

## Agent Management Features
- [x] Create agent list view with filtering by stage
- [x] Build agent creation form with initial recruitment stage
- [x] Implement agent detail view with full lifecycle tracking
- [x] Add agent code assignment and management
- [x] Build stage transition workflow (manual and automatic)
- [ ] Create exam tracking with date and result recording
- [ ] Implement license verification workflow
- [x] Add production milestone tracking ($1,000 threshold)
- [x] Build agent notes and internal comments system

## Client Management Features
- [x] Create client list view with filtering
- [x] Build client creation form with agent assignment
- [x] Implement client detail view with policy information
- [ ] Add policy tracking with multiple policies per client
- [ ] Create renewal date management and tracking
- [x] Build client contact history and notes system
- [x] Implement client search and filtering

## Follow-up & Task Management
- [x] Create task/follow-up list view with filtering by stage and status
- [x] Build task creation form with due date and assignment
- [x] Implement task completion workflow
- [ ] Create automated reminder system for overdue tasks
- [x] Build task filtering by agent, client, and stage
- [x] Add task priority levels (low, medium, high)
- [ ] Implement "stale lead" detection (no activity in X days)
- [x] Create task assignment to team members

## Dashboard & Analytics
- [x] Build main dashboard with key metrics
- [x] Create agent pipeline view (agents by stage)
- [ ] Implement production tracking dashboard
- [ ] Build team performance analytics
- [x] Create follow-up completion rate metrics
- [ ] Add chargeback proof tracking dashboard
- [x] Implement real-time sync status indicator

## MyWFG Integration (Core Framework Complete)
- [x] Create mywfg.com credential management UI (backend procedures)
- [x] Implement secure credential storage with encryption
- [x] Build headless browser automation script for data extraction
- [x] Create scheduled sync job (daily at off-peak hours)
- [x] Implement agent code sync from mywfg.com
- [x] Add production data sync from mywfg.com
- [x] Build sync error handling and retry logic
- [x] Create sync history and audit log view
- [ ] Implement notification system for sync failures
- [x] Add manual sync trigger for admins

## Multi-User & Real-time Features
- [ ] Implement real-time data refresh for shared dashboard
- [ ] Create user presence indicators (who's online)
- [ ] Build activity feed for team visibility
- [ ] Implement data change notifications
- [ ] Add user session management
- [x] Create team member management interface

## Security & Compliance
- [ ] Implement AES-256 encryption for credentials
- [ ] Create audit logging for all data access
- [ ] Build credential rotation mechanism
- [ ] Implement secure session handling with JWT
- [ ] Add rate limiting for API endpoints
- [ ] Create data backup and recovery procedures
- [ ] Implement HTTPS/TLS for all communications

## Testing & Deployment
- [ ] Write unit tests for database procedures
- [ ] Create integration tests for workflow stages
- [ ] Build end-to-end tests for agent lifecycle
- [ ] Test mywfg.com integration with mock data
- [ ] Create deployment documentation
- [ ] Build local hosting setup guide
- [ ] Create admin onboarding documentation
- [ ] Implement error logging and monitoring

## UI/UX Polish
- [x] Design color scheme and visual style
- [x] Create responsive layout for desktop and tablet
- [x] Build consistent component library (using shadcn/ui)
- [x] Add loading states and error messages
- [x] Implement empty states for all views
- [ ] Create keyboard navigation support
- [ ] Add accessibility features (ARIA labels, etc.)
- [x] Build mobile-responsive design

## Documentation
- [ ] Create system architecture documentation
- [ ] Write API documentation for tRPC procedures
- [ ] Build user manual for team members
- [ ] Create admin guide for system management
- [ ] Document mywfg.com integration setup
- [ ] Write deployment and hosting guide
- [ ] Create troubleshooting guide



## Client Management (Completed)
- [x] Create clients list page with filtering and search
- [x] Build client creation form with agent assignment
- [ ] Implement client detail view with policy information
- [ ] Add policy tracking with multiple policies per client
- [ ] Create renewal date management and reminders
- [x] Build client contact history and notes system
- [x] Add client search and advanced filtering

## Production Dashboard & Analytics (Completed)
- [x] Build production leaderboard showing top producers
- [x] Create monthly production trends chart
- [x] Implement commission tracking by agent
- [x] Add production milestone tracking ($1,000 threshold)
- [ ] Build chargeback proof tracking dashboard
- [x] Create team performance analytics
- [ ] Add export functionality for reports

## Email Notifications & Reminders (Completed)
- [x] Set up notification system using Manus built-in notifications
- [x] Create scheduled email reminders for overdue tasks
- [x] Add milestone achievement notifications
- [x] Build policy renewal reminder system
- [x] Create notification settings UI
- [ ] Implement notification history log

## UI/UX Enhancement (Completed)
- [x] Redesign color scheme with modern, professional palette
- [x] Add gradient backgrounds and visual depth
- [x] Implement smooth animations and transitions
- [x] Enhance dashboard cards with better visual hierarchy
- [x] Improve sidebar navigation with icons and hover effects
- [x] Add micro-interactions for better user feedback
- [x] Enhance charts and data visualizations
- [x] Improve form designs with better spacing and styling
- [x] Add skeleton loading states for better UX
- [x] Implement dark mode support

## Functionality Improvements (In Progress)
- [ ] Fix any TypeScript errors or warnings
- [ ] Improve error handling across all pages
- [ ] Enhance data validation in forms
- [ ] Add bulk actions for agents and clients
- [ ] Improve search functionality with debouncing
- [ ] Add pagination for large data sets
- [ ] Enhance filtering options
- [ ] Improve mobile responsiveness

## Code Optimization (Completed)

- [x] Add React.memo for expensive components
- [x] Implement useMemo/useCallback for performance
- [x] Add proper TypeScript types and interfaces
- [ ] Optimize database queries with proper indexing
- [ ] Add input validation with Zod schemas
- [ ] Implement proper error boundaries
- [x] Add loading skeletons for better UX
- [ ] Optimize bundle size with code splitting
- [x] Add proper caching strategies for tRPC queries


## Rebranding (Completed)
- [x] Change "WFG CRM" to "Wealth Builders Haven CRM" throughout the application
- [x] Update sidebar branding
- [x] Update page titles and headers
- [ ] Update any documentation references


## Logo Integration (Completed)
- [x] Copy logo to project public folder
- [x] Add logo to sidebar header
- [x] Add logo to landing page header
- [x] Add logo to landing page footer


## MyWFG Crawler Analysis (Completed)
- [x] Build crawler to login and explore mywfg.com account
- [x] Capture screenshots of key pages
- [x] Analyze HTML structure and data tables
- [x] Document available data fields
- [x] Recommend extraction strategy
- [x] Explore Team Chart hierarchy visualization
- [x] Document Advancement Guidelines (TA to EC)
- [x] Document Commission Guidelines and compensation grid

## WFG Rank Hierarchy & Advancement (New)
- [x] Add WFG rank hierarchy enum to database schema (TA, A, SA, MD, SMD, EMD, CEO_MD, EVC, SEVC, FC, EC)
- [x] Add advancement requirements tracking table
- [x] Add upline/downline relationship tracking to agents table
- [x] Add commission payments table
- [x] Add production record enhancements (company, generation, override %)
- [x] Enhance agent detail page with rank progression visualization
- [x] Add hierarchy tree view component for team visualization
- [x] Build advancement progress tracker showing requirements vs current status

## Commission Structure Integration (New)
- [x] Add commission structure table with generational overrides
- [x] Build commission calculator based on WFG grid (65% base shop payout)
- [x] Track generational overrides (1st: 12%, 2nd: 6%, 3rd: 3.5%, etc.)
- [x] Add bonus pool tracking (6.5% bonus pool, 2.5% executive pools)
- [x] Implement production multiplier calculations for EVCs+

## MyWFG Sync Enhancement (New)
- [x] Update MyWFG sync service with actual report URLs
- [x] Add data parsers for Downline Status report
- [x] Add data parsers for Commissions Summary report
- [x] Add data parsers for Payment Report
- [x] Add data parsers for Total Cash Flow report
- [x] Implement semi-automated sync with OTP code support
- [x] Add payment cycle tracking (Tuesdays/Fridays, 9x/month)
- [x] Add Team Chart hierarchy extraction
- [x] Add WFG rank mapping from display names to internal codes


## Policy Face Amount & Families Protected Tracking (New)
- [x] Add faceAmount field to production_records table
- [x] Add familyId/householdId field to clients table for family grouping
- [x] Create dashboard metrics for total face amount issued
- [x] Create dashboard metrics for total families protected
- [ ] Add face amount input to production record creation form
- [ ] Display face amount in production records list


## MyWFG Policy Data Extraction (Completed)
- [x] Login to MyWFG and navigate to Commission Statements/Summary
- [x] Analyze commission data structure for policy numbers
- [x] Extract total policy count (~77 policies) and dollar amounts (~$175K net commission)
- [x] Document data fields available for import
- [x] Identified that face amounts are NOT available from MyWFG
- [ ] Update dashboard with actual policy data from extracted data
- [ ] Add manual face amount entry option for policies


## Automated MyWFG Sync (Completed)
- [x] Check Total Cash Flow report for accurate team commission ($290,099.22 Super Team)
- [x] Update dashboard to show 77 families protected
- [x] Update dashboard to show total team commission from Total Cash Flow ($290.1K)
- [x] Implement sync data caching module with 6-hour stale detection
- [x] Add payment cycle tracking (Tuesdays/Fridays, 9x/month)
- [x] Add monthly cash flow data storage and charts
- [x] Add sync status indicator to dashboard API
- [x] Create sync history log for audit trail
- [x] Note: Full automation blocked by OTP requirement - semi-automated sync with manual trigger implemented


## Dashboard MyWFG Team Metrics (Completed)
- [x] Update Active Agents to show MyWFG Active Associates (91) instead of local DB count
- [x] Add new Licensed Agents card showing Life Licensed Associates (27)
- [x] Update getDashboardMetrics to include activeAssociates and licensedAgents from MyWFG data


## Import Real Agents from MyWFG (Completed)
- [x] Navigate to MyWFG Downline Status report
- [x] Extract 45 Base Shop team members (names, agent codes, ranks)
- [x] Clear test agent data from CRM database
- [x] Import real agents into CRM with correct WFG ranks
- [x] Verify agents display correctly in Agents page
- Note: 45 agents imported from Base Shop; remaining 46 are in Super Team hierarchy (under other SMDs)


## Clickable Dashboard Metrics & Compliance Tracking (Completed)
- [x] Make "Total Agents" card clickable to navigate to Agents page
- [x] Make "Licensed Agents" card clickable to filter agents by licensed status
- [x] Make "In Training" card clickable to filter agents by training stage
- [x] Make "New This Month" card clickable to filter agents by date
- [x] Add compliance tracking from MyWFG reports:
  - [x] Missing Licenses and Appointments report (11 state jurisdictions)
  - [x] Platform Fee Recurring Enrollment report (15 agents not enrolled)
  - [x] Platform Fee First Notice report (3 agents: Stanley Ejime, Joy Ejime, Bukola Kolawole)
  - [x] Platform Fee Final Notice report (3 agents: Stephen Monye, Esther Aikens, Ese Moses)
- [x] Display agents with commissions on hold with balance owed and email
- [x] Display agents with first notice warning with balance owed and email
- [x] Show "6 pending" badge on Compliance section


## Transamerica Face Amount Extraction (New)
- [x] Login to Transamerica Life Access portal
- [x] Launch Transamerica Life AccessSM
- [x] Navigate to My Book > View My Book for pending policies
- [x] Extract inforce policies with face amounts (Zaid Shopeju book only)
- [x] Calculate total face amount from Zaid Shopeju's inforce policies ($26,025,000 from 52 policies)
- [ ] Check notifications for impending chargebacks
- [ ] Check notifications for premium payment reversals
- [x] Update dashboard Total Face Amount metric with calculated total ($26.02M)
- [ ] Add chargeback/reversal tracking to dashboard
- [ ] Set up email notifications for impending chargebacks to:
  - Zaid Shopeju (zaidshopejuwbh@gmail.com)
  - Oluwaseyi Adepitan (mseyifunmiwbh@gmail.com)
- [ ] Set up email notifications for premium payment reversals

## Full Book of Business Extraction (All Agent Roles) - COMPLETED
- [x] Update Transamerica filter to include Service Agent, Writing, and Overwriting roles
- [x] Confirmed: 52 policies represent complete book of business (Zaid is Writing Agent on all)
- [x] Calculate total face amount for entire book of business: $26,025,000
- [x] Update dashboard with complete book of business total ($26.02M)


## Chargeback Notifications Feature (New)
- [x] Log into Transamerica portal (session expired)
- [x] Navigate to notifications/alerts section
- [x] Extract impending chargeback data (3 reversed premium payments found)
- [x] Extract premium payment reversal data (2 EFT removals found)
- [x] Add chargeback alerts section to dashboard
- [x] Implement Manus notifications for chargebacks (to project owner)
- [x] Create notification trigger when new chargeback alerts are detected
- [x] Test notification system - Send Alert Notification button added to dashboard


## Automated OTP Login System
- [x] Store email credentials securely (MyWFG: zaidshopejuwbh@gmail.com, Transamerica: zaidshopejuwfg@gmail.com)
- [x] Create Gmail IMAP service to read OTP emails automatically
- [x] Implement automated login flow for MyWFG with OTP extraction
- [x] Implement automated login flow for Transamerica with OTP extraction
- [x] Create sync service with API endpoints
- [ ] Add sync controls to dashboard UI
- [ ] Test automated login system end-to-end

- [x] Send email alert to zaidshopejuwbh@gmail.com when OTP is fetched
- [x] Send email alert when login credentials are used
- [x] Send email alert when automated sync is triggered

- [x] Fix branding in email alerts: change "WFG CRM" to "Wealth Builders Haven CRM"

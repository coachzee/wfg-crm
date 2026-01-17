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
- [x] Add sync controls to dashboard UI
- [ ] Test automated login system end-to-end

- [x] Send email alert to zaidshopejuwbh@gmail.com when OTP is fetched
- [x] Send email alert when login credentials are used
- [x] Send email alert when automated sync is triggered

- [x] Fix branding in email alerts: change "WFG CRM" to "Wealth Builders Haven CRM"


## Local/Self-Hosted Deployment
- [ ] Fix MyWFG login URL in auto-login-mywfg.ts (correct URL: https://www.mywfg.com)
- [ ] Verify Transamerica login URL is correct
- [ ] Create comprehensive deployment guide (DEPLOYMENT.md)
- [ ] Document all required environment variables
- [ ] Include Puppeteer/Chrome setup instructions

## Net Licensed Feature Fix - COMPLETED

- [x] Explore MyWFG Custom Report for agent payment data (YTD Cash Flow)
- [x] Extract cash flow data for all agents from Custom Reports
- [x] Calculate net licensed status ($1,000+ total cash flow)
- [x] Exclude Senior Associate (SA) and above from Net Licensed count
- [x] Create clickable Net Licensed modal with detailed agent info
- [x] Show "Working Toward Net Licensed" section with progress bars
- [ ] Create clickable Net Licensed card with detail view
- [ ] Show agent name, net licensed date, payment dates, and totals

- [ ] Make login automation smarter with better error handling and efficient OTP retrieval
- [ ] Exclude Senior Associate (SA) and above from Net Licensed count (only TA and A count)

- [ ] Fix missing Net Licensed agents: Add Francis Ogunlolu ($1,802.15) and Renata Jeroe ($1,245.17)


## Dynamic Net Licensed Data Fetching (Completed)
- [x] Create cashFlowRecords table in database schema for storing YTD cash flow data
- [x] Add tRPC procedures for cash flow data CRUD operations
- [x] Update MyWFG sync service to fetch Custom Reports - Personal Cash Flow YTD
- [x] Remove hardcoded Net Licensed data from db.ts
- [x] Calculate Net Licensed dynamically from database (≥$1,000, TA/A only)
- [x] Add payment date tracking for when agents achieved Net Licensed status
- [x] Write tests for Net Licensed calculation logic


## Agent Data Validation & Update (In Progress)
- [ ] Extract licensed agents list from Downline Status report (LL Flag = Yes)
- [ ] Pull contact details from Hierarchy Tool for each agent:
  - Personal email
  - Mobile phone
  - Home address
- [ ] Update database with correct license status (isLifeLicensed field)
- [ ] Update database with real contact information (no placeholders)
- [ ] Verify all agent data is accurate


## Agent Data Validation & Contact Extraction (Completed)
- [x] Extract licensed agents list from Downline Status report (LL Flag = Yes)
- [x] Pull contact details from Hierarchy Tool for each agent:
  - [x] Personal email - 31 agents updated
  - [x] Mobile phone - 31 agents updated
  - [ ] Home address (pending - need to add address field to schema)
- [x] Update database with correct license status (isLifeLicensed field)
- [x] Update database with real contact information (no placeholders)
- [x] Verify all agent data is accurate
- [x] Fixed OTP retrieval from Gmail (Transamerica format XXXX-XXXXXX)
- [x] Automated MyWFG Hierarchy Tool scraper working
- [x] All 31 licensed agents have real emails and phone numbers


## Agent Data Cleanup & Rank Correction (Completed)
- [x] Remove test agents ("GetById Test", "Test Agent", "Rank Test", "Stage Update") from database - 32 removed
- [x] Correct agent ranks based on MyWFG Downline Status report:
  - Augustina -> SMD (Level 20)
  - Ayodele Okulaja -> SMD (Level 17)
  - Oluwaseyi Adepitan -> SMD (Level 17)
- [x] Verify all agent data is accurate after cleanup - 45 real agents remaining

## Automated MyWFG Agent Data Fetching (Completed)
- [x] Create automated scraper to fetch agent data from MyWFG Downline Status report
- [x] Extract agent names, codes, title levels, and license status directly from MyWFG
- [x] Map MyWFG title levels to WFG ranks (01=TA, 10=MD, 17=SMD, 20=SMD, etc.)
- [x] Auto-update agent ranks when syncing from MyWFG
- [x] Remove dependency on CSV files for agent data
- [x] Automated OTP retrieval from Gmail (Transamerica format XXXX-XXXXXX)
- [x] Full sync script: mywfg-full-sync.mjs
- [x] Contact info sync for all 45 agents (emails and phone numbers)


## Scheduled MyWFG Sync (Completed)
- [x] Set up twice daily sync at 3:30 PM and 6:30 PM
- [x] Run mywfg-full-sync.mjs automatically


## Sync History & Monitoring (New)
- [ ] Create sync_logs database table for storing sync history
- [ ] Build Sync History page with detailed logs
- [ ] Add weekly sync summary section to dashboard bottom
- [ ] Update mywfg-full-sync.mjs to log results to database
- [ ] Show 3:30 PM and 6:30 PM sync status in summary


## Sync History & Weekly Summary (Completed)
- [x] Fix test failures for sync logs functionality (syncType enum, return types)
- [x] Implement getScheduledSyncLogs function with pagination and filtering
- [x] Implement getLatestScheduledSyncLog function
- [x] Implement getTodaySyncLogs function
- [x] Add tRPC procedures for sync logs (getPaginated, getLatest, getToday)
- [x] Create Sync History page UI with filtering (status, type, scheduled time)
- [x] Add pagination to Sync History page
- [x] Add Weekly Sync Summary section to Dashboard
- [x] Add "View Full History" button linking to Sync History page
- [x] Display 3:30 PM and 6:30 PM sync task status breakdown
- [x] Show agents processed, contacts updated, and error counts


## Agent Data Cleanup (In Progress)
- [ ] Fix incorrect position levels (e.g., Okulaja is not SMD)
- [ ] Remove test agents from database
- [ ] Clean up incorrect stage data (getById Test etc.)
- [ ] Verify all agent ranks match MyWFG source data

## MyWFG Sync Fix (In Progress)
- [ ] Fix MyWFG sync to successfully fetch agent data
- [ ] Ensure correct title level to rank mapping (01=TA, 10=A, 15=SA, 17=MD, 20=SMD)
- [ ] Verify all agent ranks are updated automatically from MyWFG source data
- [ ] Remove need for manual rank corrections


## Agent Rank Fix (Completed)
- [x] Fixed incorrect agent position levels
- [x] Armstrong = SMD (only SMD)
- [x] Adepitan and Okulaja = MD (only 2 MDs)
- [x] Adetona, Humphrey, Imasuen, Ogunlolu, Okonofua = SA (Senior Associate)
- [x] Henry, Olaiya = A (Associate)
- [x] Removed test agents created by vitest tests
- [x] Updated title level mapping: 01=TA, 10=A, 15=SA, 17=MD, 20=SMD


## Agent Home Address Extraction (Completed)
- [x] Investigate MyWFG Hierarchy Tool page structure for address data
- [x] Add homeAddress field to agents table schema
- [x] Implement address extraction in MyWFG scraper (fetchAgentAddress, fetchAgentAddresses functions)
- [x] Update sync service to populate agent addresses
- [x] Display addresses in agent detail view with MapPin icon
- [x] Test address extraction with manual sync (requires running sync with addresses)
- [x] Complete address extraction for all 45 Base Shop agents (100% coverage)


## Data Cleanup (Completed)
- [x] Delete test agents (Stage Update deleted)
- [x] Fix incorrect agent ranks (Armstrong=SMD, Adepitan=MD, Okulaja=MD, 5 SAs, 2 As, 35 TAs)


## Agent Rank Filter (In Progress)
- [ ] Add rank filter dropdown to Agents page
- [ ] Filter agents by selected rank (SMD, MD, SA, A, TA, etc.)


## Agent Rank Filter (Completed)
- [x] Add rank filter dropdown to Agents page
- [x] Filter agents by selected rank (SMD, MD, SA, A, TA, etc.)
- [x] Fixed test cleanup to prevent test agents from persisting in database
- [x] Updated agents.test.ts with afterEach cleanup hook


## Super Team Import & Tabs (In Progress)
- [ ] Add teamType field to agents schema (BASE_SHOP, SUPER_TEAM)
- [ ] Fetch and import all Super Team agents from MyWFG
- [ ] Create tabbed interface on Agents page (Super Team / Base Shop tabs)
- [ ] Update agent counts to reflect both teams


## Transamerica Pending Policies Dashboard (New)
- [ ] Explore Transamerica Life Access portal structure
- [ ] Navigate to "My Book" > "Pending" > "View My Book"
- [ ] Extract pending policy data with requirements
- [ ] Create database schema for pending policies
- [ ] Implement tRPC procedures for pending policy data
- [ ] Build Production page dashboard with three categories:
  - [ ] Pending with Producer
  - [ ] Pending with Transamerica
  - [ ] Completed
- [ ] Display policy details including pending requirements
- [ ] Add automated sync for pending policy data


## Transamerica Pending Policies Dashboard (Completed)
- [x] Extract pending policy data from Transamerica Life Access
- [x] Add pendingPolicies and pendingRequirements tables to database schema
- [x] Create tRPC procedures for pending policies CRUD
- [x] Build Pending Policies page with requirements dashboard
- [x] Display requirements by category (Pending with Producer, Pending with Transamerica, Completed)
- [x] Create automated sync script for Transamerica pending policies
- [x] Set up scheduled sync at 3:30 PM EST and 6:30 PM EST daily
- [x] Add sync status indicator to Pending Policies page
- [x] Write vitest tests for pending policies feature


## Comprehensive Code Review & Optimization (Completed)
- [x] Audit project structure and identify cleanup targets
- [x] Fix TypeScript errors and warnings (no errors found)
- [x] Remove unused imports and dead code
- [x] Clean up temporary scripts and test files (removed 26 debug scripts)
- [x] Consolidate duplicate server files (removed mywfg-service v1/v2, gmail-otp-advanced/optimized)
- [x] Remove unused server files (mywfg-automation.ts, seed-cashflow-data.ts)
- [x] Clean up temporary data directories (mywfg-analysis/, data/, .manus/db/)
- [x] Remove unused ComponentShowcase page
- [x] Remove stale dist/ build artifacts
- [x] Verify all tests pass (41 tests passing)
- [x] Final production-ready cleanup

## Documentation for Maintainability (Completed)
- [x] Create ARCHITECTURE.md - System overview, data flow, component relationships
- [x] Create DEVELOPER_GUIDE.md - Setup instructions, code structure, conventions
- [x] Create OPERATIONS_GUIDE.md - Credential management, troubleshooting, monitoring
- [x] Create API_REFERENCE.md - All tRPC procedures with parameters and responses
- [x] Document environment variables and secrets management


## Bug Fixes
- [x] Fix Production page error: Cannot read properties of undefined (reading 'replace') at line 246
- [x] Fix inforce policies data - removed duplicate/fabricated entries, re-imported from Transamerica CSV (97 unique policies)


## Transamerica Production Data Import (Completed)
- [x] Explore Transamerica portal to locate production/commission data
- [x] Extract 95 inforce policies from Transamerica Life Access ($674K total premium)
- [x] Create inforcePolicies database table and seed data
- [x] Update Production dashboard with real data (charts, metrics, policy list)
- [x] Add automated sync service for 3:30 PM and 6:30 PM EST daily
- [x] Write vitest tests for inforce policies feature (13 tests passing)
- [x] Commission calculation: Premium × 125% × Agent Level (55% default)

- [ ] Fix premium values - use Planned Modal Premium instead of annual premium for commission calculations


## Fix Production Dashboard Premium Data (In Progress)
- [ ] Extract Target Premium from Payment > Policy Guidelines for each policy
- [ ] Extract split agent information from General > Agent Information
- [ ] Link production data to chargeback dashboard for context
- [ ] Recalculate commissions using correct Target Premium values
- [ ] Update sync service to extract Target Premium from policy detail pages


## Agent Level & Production Commission Fix
- [ ] Add agentLevel field to agents table (percentage: 25%, 35%, 55%, 65%, etc.)
- [ ] Create UI to manage agent commission levels
- [ ] Extract Target Premium from Payment > Policy Guidelines for all 97 policies
- [ ] Extract Split Agent data from General > Agent Information for all policies
- [ ] Update inforcePolicies table with targetPremium and splitAgents fields
- [ ] Update Production dashboard to use correct commission formula: Target Premium × 125% × Agent Level × Split %
- [ ] Link policies to agents for per-agent production tracking


## Target Premium & Split Agent Commission Calculation (Completed - Jan 8, 2026)
- [x] Add targetPremium field to inforcePolicies table
- [x] Add split agent fields (secondAgentName, secondAgentCode, secondAgentSplit, secondAgentLevel)
- [x] Add writingAgentLevel field for primary agent commission level
- [x] Create updatePolicy mutation for editing Target Premium and Split Agent data
- [x] Build PolicyDetailDialog component for editing policy details
- [x] Implement commission calculation formula: Target Premium × 125% × Agent Level × Split %
- [x] Add live Commission Preview in edit dialog
- [x] Display split indicator (e.g., "Split: 40%/60%") in policy list
- [x] Display "Target" badge for policies with custom Target Premium
- [x] Update Total Commission calculation in Production Dashboard
- [x] Write unit tests for commission calculation (11 tests passing)
- [x] Test policy update with extracted Transamerica data (policy 6602238677)


## Top Agents by Commission Feature (Completed - Jan 8, 2026)
- [x] Add Top Agents section to Production Dashboard showing agents ranked by commission
- [x] Calculate total commission per writing agent from inforce policies (includes split agents)
- [x] Display agent name, agent code, total commission, policy count, and avg commission level
- [x] Add visual ranking indicators (gold, silver, bronze badges with gradients)
- [x] Add getTopAgentsByCommission function in db.ts
- [x] Add router endpoint for getTopAgentsByCommission
- [x] Write unit tests for getTopAgentsByCommission (3 tests passing)


## Top Agents Commission Fix (In Progress - Jan 8, 2026)
- [ ] Extract writing agent data from all 97 Transamerica policy detail pages
- [ ] Extract Target Premium from Policy Guidelines section
- [ ] Extract Split Agent information where applicable
- [ ] Update database with correct agent attribution
- [ ] Recalculate commissions with correct agent levels
- [ ] Verify Top Agents display shows accurate data


## GitHub Repository Setup
- [ ] Login to GitHub
- [ ] Create new repository (wfg-crm)
- [ ] Configure git credentials
- [ ] Push code to GitHub
- [ ] Verify repository is accessible


## GitHub Repository Setup - COMPLETED
- [x] Login to GitHub (zaidshopeju@gmail.com)
- [x] Create new private repository (wfg-crm)
- [x] Create Personal Access Token for git operations
- [x] Configure git remote with PAT authentication
- [x] Push all code to GitHub (756 objects, 835KB)
- [x] Verify repository is accessible at https://github.com/coachzee/wfg-crm
- [x] Set policy: Always push to GitHub after any changes

## Workflow Policy
- [x] GitHub must be kept up to date at all times
- [x] Push to GitHub after every checkpoint or significant change


## Documentation - COMPLETED
- [x] Create comprehensive User Guide (USER_GUIDE.md)
- [x] Create Hostinger deployment documentation (DEPLOYMENT_HOSTINGER.md)
- [x] Document all features and how to use them
- [x] Document environment variables and configuration
- [x] Document database setup and migrations
- [ ] Push documentation to GitHub


## API Documentation & Tutorials - In Progress
- [ ] Create comprehensive API documentation (API_REFERENCE.md)
- [ ] Document all tRPC procedures and endpoints
- [ ] Document request/response schemas
- [ ] Create video tutorial scripts for key features
- [ ] Set up uptime monitoring with UptimeRobot
- [ ] Push all documentation to GitHub


## Health Check Endpoint
- [ ] Create /api/health endpoint that returns 200 OK
- [ ] Update UptimeRobot monitors to use health endpoint
- [ ] Remove invalid API endpoint monitors


## Health Check Endpoint & Monitoring - COMPLETED
- [x] Create /api/health endpoint that returns 200 OK with status, timestamp, uptime, and service name
- [x] Remove invalid tRPC API endpoint monitors from UptimeRobot (agents.getAll, auth.me, inforcePolicies)
- [x] Add health endpoint monitor to UptimeRobot (wealthbuildershaven.com/api/health)
- [x] Verify main site monitor is working (wealthbuildershaven.com - 100% uptime)


## Written Tutorial Guides with Screenshots - In Progress
- [ ] Capture screenshots of all key workflows
- [ ] Create Tutorial 1: Getting Started & Onboarding Guide
- [ ] Create Tutorial 2: Agent Management Guide
- [ ] Create Tutorial 3: Production & Commission Tracking Guide
- [ ] Create Tutorial 4: Task Management Guide
- [ ] Push guides to GitHub


## Written Tutorial Guides with Screenshots - COMPLETED
- [x] Capture screenshots of all key workflows (7 screenshots in docs/screenshots/)
- [x] Create Tutorial 1: Getting Started & Onboarding (TUTORIAL_01_GETTING_STARTED.md)
- [x] Create Tutorial 2: Agent Management (TUTORIAL_02_AGENT_MANAGEMENT.md)
- [x] Create Tutorial 3: Production Tracking (TUTORIAL_03_PRODUCTION_TRACKING.md)
- [x] Create Tutorial 4: Task Management (TUTORIAL_04_TASK_MANAGEMENT.md)
- [x] Create Tutorial 5: Settings & Integration (TUTORIAL_05_SETTINGS_INTEGRATION.md)
- [x] Create docs/README.md index file for all documentation


## Transamerica Auto-Sync with OTP Automation - Completed (Jan 8, 2026)
- [x] Review existing Transamerica login service
- [x] Test browser-based login (session cookies maintained, no OTP needed when device remembered)
- [x] Navigate to Transamerica Life Access portal
- [x] Extract pending policies data (12 policies: 5 Issued, 3 Pending, 2 Post Approval, 2 Incomplete)
- [x] Download CSV export of pending policies
- [x] Import pending policies to database (8 inserted, 4 updated)
- [x] Create import script: scripts/import-pending-policies.mjs
- [ ] Push changes to GitHub

## Key Discovery - Transamerica Login
- Browser session maintains login state (device remembered)
- Direct navigation to Life Access works without OTP/security questions
- Security question automation not needed when using persistent browser session
- Total pending pipeline: $7.25M face amount across 12 policies


## Commission Calculation Fixes (Jan 8, 2026)
- [ ] Review WFG commission structure from MyWFG documentation
- [ ] Fix SMD commission level from 55% to 65%
- [ ] Review and fix all agent commission levels across codebase
- [ ] Update commission calculation formulas
- [ ] Run tests to verify commission calculations

## MyWFG Sync Script Fix (Jan 8, 2026)
- [ ] Fix "repository not available in sandbox" error
- [ ] Ensure wfg-crm project is properly loaded
- [ ] Test MyWFG full sync script execution


## Commission Calculation Fixes - Completed (Jan 14, 2026)
- [x] Review WFG commission structure from official compensation documents (US_Compensation_Brochure.pdf)
- [x] Fix SMD commission level from 55% to 65%
- [x] Confirm all ranks SMD and above are 65% (base commission cap at Total Base Shop level)
- [x] Fix transamerica-inforce-sync.ts DEFAULT_AGENT_LEVEL from 0.55 to 0.65
- [x] Fix schema.ts default writingAgentLevel from 0.55 to 0.65
- [x] Fix routers.ts commission calculations (2 occurrences)
- [x] Fix extract-agent-data.ts commission calculations
- [x] Update USER_GUIDE.md commission table (all ranks SMD+ = 65%)
- [x] Update TUTORIAL_02_AGENT_MANAGEMENT.md rank icons table
- [x] Update TUTORIAL_03_PRODUCTION_TRACKING.md commission examples
- [x] Create WFG_COMMISSION_STRUCTURE.md official documentation
- [x] Update test files to match new commission levels

**Key Finding:** WFG base commission caps at 65% for SMD and all higher ranks. Additional income at higher ranks comes from generational overrides (12% 1st gen, 6% 2nd gen, etc.), bonus pools (6.5%), and executive quarterly pools (2.5%).


## Self-Hosted MyWFG Sync Solution for Hostinger - Completed (Jan 15, 2026)
- [x] Create HTTP endpoint for MyWFG sync (/api/cron/sync)
- [x] Add authentication/secret key for sync endpoint security (SYNC_SECRET env var)
- [x] Create standalone sync script for Hostinger cron jobs (scripts/cron-sync.mjs)
- [x] Update DEPLOYMENT_HOSTINGER.md with cron setup instructions (3:30 PM & 6:30 PM EST)
- [x] Sync history page already exists in dashboard
- [x] Set up Manus scheduled tasks for development environment (3:30 PM & 6:30 PM EST)
- [ ] Test sync endpoint works correctly (pending deployment)


## Dashboard Projected Income Feature - Completed (Jan 15, 2026)
- [x] Review current dashboard metrics and commission calculations
- [x] Add projected income calculation based on 65% SMD rate
- [x] Update dashboard UI to display projected income card
- [x] Include breakdown by pending policies and inforce policies
- [x] Test projected income calculations (7 tests passing)


## Income Tracking Chart Feature - Completed (Jan 15, 2026)
- [x] Design income history data model (projected vs actual over time)
- [x] Create incomeHistory table in database schema
- [x] Add backend functions to store daily income snapshots
- [x] Add backend function to retrieve income history for charting
- [x] Create income tracking chart component using Recharts
- [x] Add chart to dashboard showing projected vs actual income
- [x] Test income tracking functionality (8 tests passing)


## Income Snapshot Auto-Capture - Completed (Jan 15, 2026)
- [x] Integrate saveIncomeSnapshot() into sync-service.ts runFullSync()
- [x] Cron sync endpoint already calls runFullSync() which now saves snapshots
- [x] All 97 tests passing


## Income Discrepancy Chart - Completed (Jan 15, 2026)
- [x] Create IncomeDiscrepancyChart component showing variance between projected and actual
- [x] Add bar chart with positive/negative variance visualization (green for over, red for under)
- [x] Include summary statistics (total variance, avg variance %, over/under counts)
- [x] Add insight text analyzing projection accuracy trend
- [x] Add to dashboard below the Income Tracking chart
- [x] All 97 tests passing


## Clickable Dashboard Items - Completed (Jan 15, 2026)
- [x] Make "Missing Licenses" clickable with agent details modal
- [x] Make "No Recurring" clickable with policy/agent details modal
- [x] Make "Pending (Issued)" clickable with pending policies modal
- [x] Make "In Underwriting" clickable with pending policies modal
- [x] Add backend queries for each item's detailed data
- [x] Test all clickable items (7 tests passing)


## Policy Anniversaries Section - Completed (Jan 16, 2026)
- [x] Design policy anniversaries data model using existing inforce policies
- [x] Create backend query to get upcoming anniversaries (next 30/60/90 days)
- [x] Create Policy Anniversaries page with table view
- [x] Add filters for time period (This Week, This Month, Next 30/60/90 Days)
- [x] Add client contact info (policy owner name, agent info)
- [x] Add "Schedule Review" action button
- [x] Add sidebar navigation link (Anniversaries)
- [x] Test policy anniversaries functionality (8 tests passing, 112 total)


## Policy Anniversaries Improvements - Completed (Jan 16, 2026)
- [x] Rename "Anniversaries" to "Policy Anniversaries" in sidebar navigation
- [x] Fix policy age calculation to use actual Issue Date (upcoming anniversary year - issue year)
- [x] Add Policy Anniversaries summary section to Dashboard landing page
- [x] Test all changes (112 tests passing)


## Schedule Review Task Integration - Completed (Jan 16, 2026)
- [x] Add filter for policy type (IUL, Term, Whole Life, etc.)
- [x] Add filter for premium amount range
- [x] Add filter for anniversary date range
- [x] Create backend endpoint to create policy review tasks (createPolicyReviewTask)
- [x] Update Schedule Review button to call task creation endpoint
- [x] Pre-fill task with policy owner name, policy number, anniversary date, face amount, premium, product type
- [x] Test task creation and filters (116 tests passing)


## Policy Anniversary Email Notifications - Completed (Jan 16, 2026)
- [x] Create email notification function for policy anniversaries (alertPolicyAnniversary)
- [x] Design email template with policy details, face amount, premium, and review tips
- [x] Add function to get policies with anniversaries in exactly 7 days (getPoliciesWithAnniversaryInDays)
- [x] Integrate with daily cron sync to send notifications automatically (in runFullSync)
- [x] Notifications sent during 3:30 PM and 6:30 PM daily syncs
- [x] Test email notification functionality (125 tests passing)


## Client Anniversary Greeting Emails - Completed (Jan 16, 2026)
- [x] Create professional anniversary greeting email template for clients
- [x] Add function to get policies with anniversaries TODAY (getPoliciesWithAnniversaryToday)
- [x] Look up client email from Clients table using policy owner name (getClientEmailByName)
- [x] Create sendClientAnniversaryGreeting function with personalized template
- [x] Integrate with daily sync to send greetings automatically (3:30 PM & 6:30 PM)
- [x] Track sent greetings to avoid duplicate emails (hasAnniversaryGreetingBeenSent, recordAnniversaryGreetingSent)
- [x] Test client greeting email functionality (14 tests passing, 138 total)


## Anniversary Email Tracking Widget - In Progress (Jan 16, 2026)
- [ ] Create emailTracking database table to store sent emails and tracking events
- [ ] Create tracking pixel endpoint (/api/track/open/:trackingId)
- [ ] Create tracked link redirect endpoint (/api/track/click/:trackingId)
- [ ] Update sendClientAnniversaryGreeting to include tracking pixel and tracked links
- [ ] Create dashboard widget showing email statistics (sent, opened, clicked)
- [ ] Add detailed view showing individual email status
- [ ] Test email tracking functionality


## Anniversary Email Tracking Widget - Completed (Jan 16, 2026)
- [x] Create emailTracking database table with open/click tracking fields
- [x] Add tracking pixel endpoint (/api/track/open/:trackingId)
- [x] Add click tracking endpoint (/api/track/click/:trackingId)
- [x] Create email tracking service (server/email-tracking.ts)
- [x] Create dashboard widget showing email stats (sent, opened, clicked)
- [x] Add engagement metrics (open rate, click rate) with progress bars
- [x] Show recent emails with status indicators (Opened, Clicked, Sent badges)
- [x] Add tRPC endpoints for email tracking stats
- [x] Test email tracking functionality (15 new tests, 138 total passing)

import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean, date, uniqueIndex, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// WFG Rank Levels - Official hierarchy from Training Associate to Executive Chairman
export const WFG_RANKS = [
  "TRAINING_ASSOCIATE",  // TA - MyWFG Level 01
  "ASSOCIATE",           // A - MyWFG Level 10
  "SENIOR_ASSOCIATE",    // SA - MyWFG Level 15
  "MARKETING_DIRECTOR",  // MD - MyWFG Level 17
  "SENIOR_MARKETING_DIRECTOR", // SMD - MyWFG Level 20
  "EXECUTIVE_MARKETING_DIRECTOR", // EMD - Level 65
  "CEO_MARKETING_DIRECTOR", // CEO MD - Level 75
  "EXECUTIVE_VICE_CHAIRMAN", // EVC - Level 87
  "SENIOR_EXECUTIVE_VICE_CHAIRMAN", // SEVC - Level 90+
  "FIELD_CHAIRMAN",      // FC - Level 95+
  "EXECUTIVE_CHAIRMAN",  // EC - Level 99
] as const;

export type WfgRank = typeof WFG_RANKS[number];

// Agents (Recruits) - Track newly recruited agents through their lifecycle
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  agentCode: varchar("agentCode", { length: 64 }).unique(),
  mywfgAgentId: varchar("mywfgAgentId", { length: 64 }).unique(), // ID from mywfg.com
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  homeAddress: text("homeAddress"), // Home address from MyWFG Hierarchy Tool
  recruiterUserId: int("recruiterUserId").references(() => users.id),
  
  // Upline/Downline hierarchy
  uplineAgentId: int("uplineAgentId"), // Self-referencing for hierarchy
  
  // WFG Rank tracking
  currentRank: mysqlEnum("currentRank", [
    "TRAINING_ASSOCIATE",
    "ASSOCIATE",
    "SENIOR_ASSOCIATE",
    "MARKETING_DIRECTOR",
    "SENIOR_MARKETING_DIRECTOR",
    "EXECUTIVE_MARKETING_DIRECTOR",
    "CEO_MARKETING_DIRECTOR",
    "EXECUTIVE_VICE_CHAIRMAN",
    "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
    "FIELD_CHAIRMAN",
    "EXECUTIVE_CHAIRMAN",
  ]).default("TRAINING_ASSOCIATE").notNull(),
  rankAchievedDate: date("rankAchievedDate"),
  
  // Workflow stage (internal tracking)
  currentStage: mysqlEnum("currentStage", [
    "RECRUITMENT",
    "EXAM_PREP",
    "LICENSED",
    "PRODUCT_TRAINING",
    "BUSINESS_LAUNCH",
    "NET_LICENSED",
    "CLIENT_TRACKING",
    "CHARGEBACK_PROOF",
  ]).default("RECRUITMENT").notNull(),
  stageEnteredAt: timestamp("stageEnteredAt").defaultNow().notNull(),
  
  // License info
  examDate: date("examDate"),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  isLifeLicensed: boolean("isLifeLicensed").default(false).notNull(),
  isSecuritiesLicensed: boolean("isSecuritiesLicensed").default(false).notNull(),
  licenseApprovalDate: date("licenseApprovalDate"),
  
  // Production tracking
  firstPolicyDate: date("firstPolicyDate"),
  firstProductionAmount: decimal("firstProductionAmount", { precision: 10, scale: 2 }),
  productionMilestoneDate: date("productionMilestoneDate"),
  
  // Commission level (percentage for commission calculations)
  commissionLevel: int("commissionLevel").default(25), // 25%, 35%, 45%, 55%, 65%, etc.
  
  // Cumulative metrics (updated from mywfg sync)
  totalBaseShopPoints: decimal("totalBaseShopPoints", { precision: 15, scale: 2 }).default("0"),
  totalPersonalPoints: decimal("totalPersonalPoints", { precision: 15, scale: 2 }).default("0"),
  totalCashFlow: decimal("totalCashFlow", { precision: 15, scale: 2 }).default("0"),
  directRecruits: int("directRecruits").default(0),
  licensedAgentsInOrg: int("licensedAgentsInOrg").default(0),
  directSmdLegs: int("directSmdLegs").default(0),
  
  notes: text("notes"),
  
  // Team type - Base Shop (direct reports) vs Super Team (entire downline)
  teamType: mysqlEnum("teamType", ["BASE_SHOP", "SUPER_TEAM"]).default("BASE_SHOP").notNull(),
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agentCodeIdx: index("idx_agents_agent_code").on(table.agentCode),
  currentStageIdx: index("idx_agents_current_stage").on(table.currentStage),
  isActiveIdx: index("idx_agents_is_active").on(table.isActive),
  recruiterUserIdIdx: index("idx_agents_recruiter_user_id").on(table.recruiterUserId),
  createdAtIdx: index("idx_agents_created_at").on(table.createdAt),
}));

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// Clients - Track clients and their policies
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").references(() => agents.id).notNull(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: date("dateOfBirth"),
  address: text("address"),
  policyNumbers: json("policyNumbers"),
  policyTypes: json("policyTypes"),
  totalPremium: decimal("totalPremium", { precision: 12, scale: 2 }),
  totalFaceAmount: decimal("totalFaceAmount", { precision: 15, scale: 2 }), // Total face amount of all policies for this client
  renewalDate: date("renewalDate"),
  lastContactDate: timestamp("lastContactDate"),
  householdId: varchar("householdId", { length: 64 }), // Group family members together
  isHeadOfHousehold: boolean("isHeadOfHousehold").default(true), // Primary contact for the family
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// Workflow Tasks / Follow-ups - Track follow-up tasks across all workflow stages
export const workflowTasks = mysqlTable("workflowTasks", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").references(() => agents.id),
  clientId: int("clientId").references(() => clients.id),
  taskType: mysqlEnum("taskType", [
    "EXAM_PREP_FOLLOW_UP",
    "LICENSE_VERIFICATION",
    "PRODUCT_TRAINING",
    "BUSINESS_LAUNCH_PREP",
    "RENEWAL_REMINDER",
    "CHARGEBACK_MONITORING",
    "GENERAL_FOLLOW_UP",
    "ADVANCEMENT_TRACKING",
    "POLICY_REVIEW",
  ]).notNull(),
  dueDate: date("dueDate").notNull(),
  completedAt: timestamp("completedAt"),
  assignedToUserId: int("assignedToUserId").references(() => users.id),
  priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH"]).default("MEDIUM").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowTask = typeof workflowTasks.$inferSelect;
export type InsertWorkflowTask = typeof workflowTasks.$inferInsert;

// Production Records - Track agent production and milestones
export const productionRecords = mysqlTable("productionRecords", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").references(() => agents.id).notNull(),
  clientId: int("clientId").references(() => clients.id), // Link to client for family tracking
  policyNumber: varchar("policyNumber", { length: 100 }).notNull(),
  policyType: varchar("policyType", { length: 50 }).notNull(),
  productCompany: varchar("productCompany", { length: 100 }), // e.g., "Transamerica", "Nationwide"
  customerName: varchar("customerName", { length: 255 }),
  faceAmount: decimal("faceAmount", { precision: 15, scale: 2 }), // Policy face amount (death benefit)
  commissionAmount: decimal("commissionAmount", { precision: 12, scale: 2 }),
  premiumAmount: decimal("premiumAmount", { precision: 12, scale: 2 }),
  basePoints: decimal("basePoints", { precision: 12, scale: 2 }), // Points for advancement tracking
  issueDate: date("issueDate").notNull(),
  chargebackProofDate: date("chargebackProofDate"),
  isChargebackProof: boolean("isChargebackProof").default(false).notNull(),
  
  // Commission breakdown by generation (for override tracking)
  generation: int("generation").default(0), // 0 = personal, 1-6 = generational
  overridePercentage: decimal("overridePercentage", { precision: 5, scale: 2 }),
  
  // Sync metadata
  mywfgSyncId: varchar("mywfgSyncId", { length: 100 }), // Unique ID from mywfg.com
  paymentCycle: varchar("paymentCycle", { length: 50 }), // e.g., "Dec 2025 Cycle 1"
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionRecord = typeof productionRecords.$inferSelect;
export type InsertProductionRecord = typeof productionRecords.$inferInsert;

// Commission Payments - Track actual payments received
export const commissionPayments = mysqlTable("commissionPayments", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").references(() => agents.id).notNull(),
  paymentDate: date("paymentDate").notNull(),
  paymentCycle: varchar("paymentCycle", { length: 50 }).notNull(), // e.g., "Dec 2025 Cycle 1"
  grossAmount: decimal("grossAmount", { precision: 12, scale: 2 }).notNull(),
  netAmount: decimal("netAmount", { precision: 12, scale: 2 }).notNull(),
  deductions: decimal("deductions", { precision: 12, scale: 2 }).default("0"),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // e.g., "Direct Deposit"
  
  // Breakdown
  personalCommission: decimal("personalCommission", { precision: 12, scale: 2 }).default("0"),
  overrideCommission: decimal("overrideCommission", { precision: 12, scale: 2 }).default("0"),
  bonusAmount: decimal("bonusAmount", { precision: 12, scale: 2 }).default("0"),
  
  mywfgSyncId: varchar("mywfgSyncId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommissionPayment = typeof commissionPayments.$inferSelect;
export type InsertCommissionPayment = typeof commissionPayments.$inferInsert;

// Advancement Progress - Track progress toward next rank
export const advancementProgress = mysqlTable("advancementProgress", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").references(() => agents.id).notNull(),
  targetRank: mysqlEnum("targetRank", [
    "ASSOCIATE",
    "SENIOR_ASSOCIATE",
    "MARKETING_DIRECTOR",
    "SENIOR_MARKETING_DIRECTOR",
    "EXECUTIVE_MARKETING_DIRECTOR",
    "CEO_MARKETING_DIRECTOR",
    "EXECUTIVE_VICE_CHAIRMAN",
    "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
    "FIELD_CHAIRMAN",
    "EXECUTIVE_CHAIRMAN",
  ]).notNull(),
  
  // Rolling period tracking
  rollingPeriodStart: date("rollingPeriodStart").notNull(),
  rollingPeriodEnd: date("rollingPeriodEnd").notNull(),
  
  // Progress metrics
  currentRecruits: int("currentRecruits").default(0),
  requiredRecruits: int("requiredRecruits").default(0),
  currentDirectLegs: int("currentDirectLegs").default(0),
  requiredDirectLegs: int("requiredDirectLegs").default(0),
  currentLicensedAgents: int("currentLicensedAgents").default(0),
  requiredLicensedAgents: int("requiredLicensedAgents").default(0),
  currentBaseShopPoints: decimal("currentBaseShopPoints", { precision: 15, scale: 2 }).default("0"),
  requiredBaseShopPoints: decimal("requiredBaseShopPoints", { precision: 15, scale: 2 }).default("0"),
  currentCashFlow: decimal("currentCashFlow", { precision: 15, scale: 2 }).default("0"),
  requiredCashFlow: decimal("requiredCashFlow", { precision: 15, scale: 2 }).default("0"),
  currentSmdLegs: int("currentSmdLegs").default(0),
  requiredSmdLegs: int("requiredSmdLegs").default(0),
  
  // Training requirement
  trainingCompleted: boolean("trainingCompleted").default(false),
  trainingCompletedDate: date("trainingCompletedDate"),
  
  // Overall progress percentage
  progressPercentage: decimal("progressPercentage", { precision: 5, scale: 2 }).default("0"),
  
  isQualified: boolean("isQualified").default(false).notNull(),
  qualifiedDate: date("qualifiedDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdvancementProgress = typeof advancementProgress.$inferSelect;
export type InsertAdvancementProgress = typeof advancementProgress.$inferInsert;

// MyWFG Integration Logs - Track automated data syncs from mywfg.com
export const mywfgSyncLogs = mysqlTable("mywfgSyncLogs", {
  id: int("id").autoincrement().primaryKey(),
  syncDate: timestamp("syncDate").defaultNow().notNull(),
  syncType: mysqlEnum("syncType", [
    "FULL",
    "DOWNLINE_STATUS",
    "COMMISSIONS",
    "PAYMENTS",
    "CASH_FLOW",
    "TEAM_CHART",
  ]).default("FULL").notNull(),
  status: mysqlEnum("status", ["SUCCESS", "FAILED", "PARTIAL", "PENDING_OTP"]).notNull(),
  recordsProcessed: int("recordsProcessed").default(0),
  errorMessage: text("errorMessage"),
  syncedAgentCodes: json("syncedAgentCodes"),
  reportUrl: varchar("reportUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MywfgSyncLog = typeof mywfgSyncLogs.$inferSelect;
export type InsertMywfgSyncLog = typeof mywfgSyncLogs.$inferInsert;

// Credentials (Encrypted) - Securely store mywfg.com credentials
export const credentials = mysqlTable("credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id).notNull(),
  encryptedUsername: text("encryptedUsername").notNull(),
  encryptedPassword: text("encryptedPassword").notNull(),
  encryptedApiKey: text("encryptedApiKey"),
  isActive: boolean("isActive").default(true).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = typeof credentials.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  agentsRecruited: many(agents, { relationName: "recruiter" }),
  tasksAssigned: many(workflowTasks, { relationName: "assignee" }),
  credentials: many(credentials),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  recruiter: one(users, {
    fields: [agents.recruiterUserId],
    references: [users.id],
    relationName: "recruiter",
  }),
  upline: one(agents, {
    fields: [agents.uplineAgentId],
    references: [agents.id],
    relationName: "uplineDownline",
  }),
  downline: many(agents, { relationName: "uplineDownline" }),
  clients: many(clients),
  tasks: many(workflowTasks),
  productionRecords: many(productionRecords),
  commissionPayments: many(commissionPayments),
  advancementProgress: many(advancementProgress),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  agent: one(agents, {
    fields: [clients.agentId],
    references: [agents.id],
  }),
  tasks: many(workflowTasks),
}));

export const workflowTasksRelations = relations(workflowTasks, ({ one }) => ({
  agent: one(agents, {
    fields: [workflowTasks.agentId],
    references: [agents.id],
  }),
  client: one(clients, {
    fields: [workflowTasks.clientId],
    references: [clients.id],
  }),
  assignedTo: one(users, {
    fields: [workflowTasks.assignedToUserId],
    references: [users.id],
    relationName: "assignee",
  }),
}));

export const productionRecordsRelations = relations(productionRecords, ({ one }) => ({
  agent: one(agents, {
    fields: [productionRecords.agentId],
    references: [agents.id],
  }),
}));

export const commissionPaymentsRelations = relations(commissionPayments, ({ one }) => ({
  agent: one(agents, {
    fields: [commissionPayments.agentId],
    references: [agents.id],
  }),
}));

export const advancementProgressRelations = relations(advancementProgress, ({ one }) => ({
  agent: one(agents, {
    fields: [advancementProgress.agentId],
    references: [agents.id],
  }),
}));

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}));

// Agent Cash Flow History - Track individual cash flow payments for Net Licensed tracking
export const agentCashFlowHistory = mysqlTable("agentCashFlowHistory", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").references(() => agents.id),
  agentCode: varchar("agentCode", { length: 64 }).notNull(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  titleLevel: varchar("titleLevel", { length: 50 }),
  uplineSMD: varchar("uplineSMD", { length: 255 }),
  
  // Cash flow data
  cashFlowAmount: decimal("cashFlowAmount", { precision: 15, scale: 2 }).notNull(),
  cumulativeCashFlow: decimal("cumulativeCashFlow", { precision: 15, scale: 2 }).notNull(),
  paymentDate: date("paymentDate"),
  paymentCycle: varchar("paymentCycle", { length: 100 }),
  
  // Net Licensed tracking
  isNetLicensed: boolean("isNetLicensed").default(false).notNull(),
  netLicensedDate: date("netLicensedDate"), // Date when agent reached $1,000
  
  // Sync metadata
  reportPeriod: varchar("reportPeriod", { length: 100 }), // e.g., "January 2025 - December 2025"
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentCashFlowHistory = typeof agentCashFlowHistory.$inferSelect;
export type InsertAgentCashFlowHistory = typeof agentCashFlowHistory.$inferInsert;

export const agentCashFlowHistoryRelations = relations(agentCashFlowHistory, ({ one }) => ({
  agent: one(agents, {
    fields: [agentCashFlowHistory.agentId],
    references: [agents.id],
  }),
}));


// Sync Logs - Track MyWFG sync history for monitoring
export const syncLogs = mysqlTable("syncLogs", {
  id: int("id").autoincrement().primaryKey(),
  syncType: mysqlEnum("syncType", [
    "FULL_SYNC",
    "DOWNLINE_STATUS",
    "CONTACT_INFO",
    "CASH_FLOW",
    "PRODUCTION",
    "TRANSAMERICA_PENDING",
    "TRANSAMERICA_INFORCE",
    "TRANSAMERICA_ALERTS",
  ]).notNull(),
  scheduledTime: varchar("scheduledTime", { length: 20 }), // "3:30 PM" or "6:30 PM"
  status: mysqlEnum("status", ["PENDING", "RUNNING", "SUCCESS", "FAILED", "PARTIAL"]).default("PENDING").notNull(),
  
  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  durationSeconds: int("durationSeconds"),
  
  // Results
  agentsProcessed: int("agentsProcessed").default(0),
  agentsUpdated: int("agentsUpdated").default(0),
  agentsCreated: int("agentsCreated").default(0),
  contactsUpdated: int("contactsUpdated").default(0),
  errorsCount: int("errorsCount").default(0),
  
  // Details
  errorMessages: json("errorMessages"), // Array of error messages
  summary: text("summary"), // Human-readable summary
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  syncTypeIdx: index("idx_sync_logs_sync_type").on(table.syncType),
  statusIdx: index("idx_sync_logs_status").on(table.status),
  createdAtIdx: index("idx_sync_logs_created_at").on(table.createdAt),
}));

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;


// Transamerica Pending Policies - Track pending policy requirements from Transamerica Life Access
export const pendingPolicies = mysqlTable("pendingPolicies", {
  id: int("id").autoincrement().primaryKey(),
  policyNumber: varchar("policyNumber", { length: 50 }).notNull().unique(),
  ownerName: varchar("ownerName", { length: 255 }).notNull(),
  productType: varchar("productType", { length: 100 }),
  faceAmount: varchar("faceAmount", { length: 50 }),
  deathBenefitOption: varchar("deathBenefitOption", { length: 50 }),
  moneyReceived: varchar("moneyReceived", { length: 50 }),
  premium: varchar("premium", { length: 50 }),
  premiumFrequency: varchar("premiumFrequency", { length: 50 }),
  issueDate: varchar("issueDate", { length: 20 }),
  submittedDate: varchar("submittedDate", { length: 20 }),
  policyClosureDate: varchar("policyClosureDate", { length: 20 }),
  policyDeliveryTrackingNumber: varchar("policyDeliveryTrackingNumber", { length: 100 }),
  
  // Status tracking
  status: mysqlEnum("status", [
    "Pending",
    "Issued",
    "Incomplete",
    "Post Approval Processing",
    "Declined",
    "Withdrawn",
  ]).notNull(),
  statusAsOf: varchar("statusAsOf", { length: 20 }),
  
  // Underwriting info
  underwritingDecision: varchar("underwritingDecision", { length: 100 }),
  underwriter: varchar("underwriter", { length: 100 }),
  riskClass: varchar("riskClass", { length: 50 }),
  
  // Agent info
  agentCode: varchar("agentCode", { length: 20 }),
  agentName: varchar("agentName", { length: 255 }),
  
  // Sync metadata
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("idx_pending_policies_status").on(table.status),
  agentCodeIdx: index("idx_pending_policies_agent_code").on(table.agentCode),
  createdAtIdx: index("idx_pending_policies_created_at").on(table.createdAt),
}));

export type PendingPolicy = typeof pendingPolicies.$inferSelect;
export type InsertPendingPolicy = typeof pendingPolicies.$inferInsert;

// Pending Policy Requirements - Track individual requirements for each pending policy
export const pendingRequirements = mysqlTable("pendingRequirements", {
  id: int("id").autoincrement().primaryKey(),
  policyId: int("policyId").references(() => pendingPolicies.id).notNull(),
  
  // Requirement category
  category: mysqlEnum("category", [
    "Pending with Producer",
    "Pending with Transamerica",
    "Completed",
  ]).notNull(),
  
  // Requirement details
  dateRequested: varchar("dateRequested", { length: 20 }),
  requirementOn: varchar("requirementOn", { length: 255 }),
  status: varchar("status", { length: 50 }), // Add, Outstanding, Received, Waived, etc.
  requirement: varchar("requirement", { length: 255 }),
  instruction: text("instruction"),
  comments: text("comments"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PendingRequirement = typeof pendingRequirements.$inferSelect;
export type InsertPendingRequirement = typeof pendingRequirements.$inferInsert;

// Relations for pending policies
export const pendingPoliciesRelations = relations(pendingPolicies, ({ many }) => ({
  requirements: many(pendingRequirements),
}));

export const pendingRequirementsRelations = relations(pendingRequirements, ({ one }) => ({
  policy: one(pendingPolicies, {
    fields: [pendingRequirements.policyId],
    references: [pendingPolicies.id],
  }),
}));


// Transamerica Inforce Policies - Track active/issued policies for production tracking
export const inforcePolicies = mysqlTable("inforcePolicies", {
  id: int("id").autoincrement().primaryKey(),
  policyNumber: varchar("policyNumber", { length: 50 }).notNull().unique(),
  
  // Policy holder info
  ownerName: varchar("ownerName", { length: 255 }).notNull(),
  issueState: varchar("issueState", { length: 10 }),
  
  // Product info
  productType: varchar("productType", { length: 100 }),
  
  // Financial info
  faceAmount: decimal("faceAmount", { precision: 15, scale: 2 }),
  premium: decimal("premium", { precision: 12, scale: 2 }), // Premium from list view (may be annual or modal)
  targetPremium: decimal("targetPremium", { precision: 12, scale: 2 }), // Actual Target Premium from Policy Guidelines
  premiumFrequency: varchar("premiumFrequency", { length: 20 }), // Monthly, Annual, Flexible
  annualPremium: decimal("annualPremium", { precision: 12, scale: 2 }), // Calculated annual premium
  
  // Commission calculation
  // Commission = Target Premium × 125% × Agent Level × Split
  transamericaMultiplier: decimal("transamericaMultiplier", { precision: 5, scale: 2 }).default("1.25"), // 125%
  calculatedCommission: decimal("calculatedCommission", { precision: 12, scale: 2 }),
  
  // Agent info (primary writing agent)
  writingAgentName: varchar("writingAgentName", { length: 255 }),
  writingAgentCode: varchar("writingAgentCode", { length: 50 }),
  writingAgentSplit: int("writingAgentSplit").default(100), // Percentage split (0-100)
  writingAgentLevel: decimal("writingAgentLevel", { precision: 5, scale: 2 }).default("0.65"), // Agent commission level (e.g., 0.65 = 65% for SMD)
  writingAgentCommission: decimal("writingAgentCommission", { precision: 12, scale: 2 }), // Calculated commission for this agent
  
  // Link to our agents table
  agentId: int("agentId").references(() => agents.id),
  
  // Secondary writing agent (for split policies)
  secondAgentName: varchar("secondAgentName", { length: 255 }),
  secondAgentCode: varchar("secondAgentCode", { length: 50 }),
  secondAgentSplit: int("secondAgentSplit").default(0), // Percentage split (0-100)
  secondAgentLevel: decimal("secondAgentLevel", { precision: 5, scale: 2 }).default("0.25"), // Agent commission level
  secondAgentCommission: decimal("secondAgentCommission", { precision: 12, scale: 2 }), // Calculated commission for this agent
  secondAgentId: int("secondAgentId").references(() => agents.id),
  
  // Dates
  premiumDueDate: varchar("premiumDueDate", { length: 20 }),
  expiryDate: varchar("expiryDate", { length: 20 }),
  issueDate: varchar("issueDate", { length: 20 }),
  
  // Status
  status: mysqlEnum("status", [
    "Active",
    "Surrendered",
    "Free Look Surrender",
    "Lapsed",
    "Terminated",
  ]).default("Active").notNull(),
  
  // Overwriting agents (JSON array for hierarchy)
  overwritingAgents: json("overwritingAgents"), // [{name, code, split, role}]
  
  // Sync metadata
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("idx_inforce_policies_status").on(table.status),
  writingAgentCodeIdx: index("idx_inforce_policies_writing_agent_code").on(table.writingAgentCode),
  agentIdIdx: index("idx_inforce_policies_agent_id").on(table.agentId),
  createdAtIdx: index("idx_inforce_policies_created_at").on(table.createdAt),
}));

export type InforcePolicy = typeof inforcePolicies.$inferSelect;
export type InsertInforcePolicy = typeof inforcePolicies.$inferInsert;

// Relations for inforce policies
export const inforcePoliciesRelations = relations(inforcePolicies, ({ one }) => ({
  agent: one(agents, {
    fields: [inforcePolicies.agentId],
    references: [agents.id],
  }),
}));

// Update syncLogs to include TRANSAMERICA_INFORCE sync type
// Note: This is handled by adding the enum value in the existing syncLogs table


// Income History - Track projected vs actual income over time for accuracy analysis
export const incomeHistory = mysqlTable("incomeHistory", {
  id: int("id").autoincrement().primaryKey(),
  
  // Date of the snapshot (stored as date for grouping by day/week/month)
  snapshotDate: timestamp("snapshotDate").notNull(),
  
  // Projected income values (calculated at time of snapshot)
  projectedTotal: decimal("projectedTotal", { precision: 12, scale: 2 }).notNull(),
  projectedFromPending: decimal("projectedFromPending", { precision: 12, scale: 2 }).default("0"),
  projectedFromInforce: decimal("projectedFromInforce", { precision: 12, scale: 2 }).default("0"),
  
  // Breakdown of projected income
  projectedPendingIssued: decimal("projectedPendingIssued", { precision: 12, scale: 2 }).default("0"),
  projectedPendingUnderwriting: decimal("projectedPendingUnderwriting", { precision: 12, scale: 2 }).default("0"),
  projectedInforceActive: decimal("projectedInforceActive", { precision: 12, scale: 2 }).default("0"),
  
  // Actual income (updated when commission is received)
  actualIncome: decimal("actualIncome", { precision: 12, scale: 2 }).default("0"),
  
  // Policy counts at time of snapshot
  pendingPoliciesCount: int("pendingPoliciesCount").default(0),
  inforcePoliciesCount: int("inforcePoliciesCount").default(0),
  
  // Commission parameters used for calculation
  agentLevel: decimal("agentLevel", { precision: 4, scale: 2 }).default("0.65"), // 65% for SMD
  transamericaConstant: decimal("transamericaConstant", { precision: 4, scale: 2 }).default("1.25"), // 125%
  
  // Source of actual income data (for tracking where the actual number came from)
  actualIncomeSource: varchar("actualIncomeSource", { length: 100 }), // e.g., "MyWFG Commission Statement", "Manual Entry"
  actualIncomeUpdatedAt: timestamp("actualIncomeUpdatedAt"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IncomeHistory = typeof incomeHistory.$inferSelect;
export type InsertIncomeHistory = typeof incomeHistory.$inferInsert;


// Email Tracking - Track sent emails and engagement (opens, clicks)
export const emailTracking = mysqlTable("emailTracking", {
  id: int("id").autoincrement().primaryKey(),
  trackingId: varchar("trackingId", { length: 64 }).notNull().unique(), // UUID for tracking
  
  // Email details
  emailType: mysqlEnum("emailType", [
    "ANNIVERSARY_GREETING",
    "ANNIVERSARY_REMINDER",
    "POLICY_REVIEW_REMINDER",
    "CHARGEBACK_ALERT",
    "GENERAL_NOTIFICATION",
  ]).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 255 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  subject: varchar("subject", { length: 500 }),
  
  // Related entity (e.g., policy number for anniversary emails)
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // "policy", "agent", "client"
  relatedEntityId: varchar("relatedEntityId", { length: 100 }), // policy number, agent code, etc.
  
  // Sending status
  sentAt: timestamp("sentAt"),
  sendStatus: mysqlEnum("sendStatus", ["PENDING", "SENT", "FAILED", "BOUNCED"]).default("PENDING"),
  sendError: text("sendError"),
  
  // Engagement tracking
  openedAt: timestamp("openedAt"),
  openCount: int("openCount").default(0),
  lastOpenedAt: timestamp("lastOpenedAt"),
  
  clickedAt: timestamp("clickedAt"),
  clickCount: int("clickCount").default(0),
  lastClickedAt: timestamp("lastClickedAt"),
  clickedLinks: json("clickedLinks"), // Array of clicked link URLs
  
  // User agent info (for analytics)
  lastUserAgent: varchar("lastUserAgent", { length: 500 }),
  lastIpAddress: varchar("lastIpAddress", { length: 50 }),
  
  // Resend tracking
  resendCount: int("resendCount").default(0),
  lastResendAt: timestamp("lastResendAt"),
  
  // Metadata
  metadata: json("metadata"), // Additional context (policy details, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTracking = typeof emailTracking.$inferSelect;
export type InsertEmailTracking = typeof emailTracking.$inferInsert;


// Scheduled Emails - For emails scheduled to be sent at a future time
export const scheduledEmails = mysqlTable("scheduledEmails", {
  id: int("id").autoincrement().primaryKey(),
  
  // Reference to original email tracking (for resends)
  originalTrackingId: varchar("originalTrackingId", { length: 64 }),
  
  // Email details
  emailType: mysqlEnum("emailType", [
    "ANNIVERSARY_GREETING",
    "ANNIVERSARY_REMINDER",
    "POLICY_REVIEW_REMINDER",
    "CHARGEBACK_ALERT",
    "GENERAL_NOTIFICATION",
  ]).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 255 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  
  // Related entity
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: varchar("relatedEntityId", { length: 100 }),
  
  // Custom content (for edited emails)
  customContent: json("customContent"), // { greetingMessage, personalNote, closingMessage }
  
  // Scheduling
  scheduledFor: timestamp("scheduledFor").notNull(),
  status: mysqlEnum("status", ["PENDING", "SENT", "CANCELLED", "FAILED"]).default("PENDING").notNull(),
  
  // Processing info
  processedAt: timestamp("processedAt"),
  newTrackingId: varchar("newTrackingId", { length: 64 }), // Tracking ID of the sent email
  errorMessage: text("errorMessage"),
  
  // Metadata (policy details, agent info, etc.)
  metadata: json("metadata"),
  
  // Audit
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledEmail = typeof scheduledEmails.$inferSelect;
export type InsertScheduledEmail = typeof scheduledEmails.$inferInsert;


// Agent Exam Prep Status - Track agents studying for license exams via XCEL Solutions
export const agentExamPrep = mysqlTable("agentExamPrep", {
  id: int("id").autoincrement().primaryKey(),
  
  // Agent reference (matched by name)
  agentId: int("agentId").references(() => agents.id),
  
  // Raw name from XCEL Solutions (for matching)
  xcelFirstName: varchar("xcelFirstName", { length: 255 }).notNull(),
  xcelLastName: varchar("xcelLastName", { length: 255 }).notNull(),
  
  // Course info
  course: varchar("course", { length: 255 }).notNull(), // e.g., "Texas Life & Health"
  state: varchar("state", { length: 50 }), // Extracted state from course name
  
  // Progress tracking
  dateEnrolled: date("dateEnrolled"),
  lastLogin: timestamp("lastLogin"),
  pleCompletePercent: int("pleCompletePercent").default(0), // 0-100
  preparedToPass: varchar("preparedToPass", { length: 50 }), // e.g., "Yes", "No", "In Progress"
  
  // Sync metadata
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  emailSubject: varchar("emailSubject", { length: 500 }), // Original email subject for reference
  emailReceivedAt: timestamp("emailReceivedAt"), // When the XCEL email was received
  
  // Status
  isActive: boolean("isActive").default(true).notNull(), // Still actively studying
  completedAt: timestamp("completedAt"), // When they finished/passed
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentExamPrep = typeof agentExamPrep.$inferSelect;
export type InsertAgentExamPrep = typeof agentExamPrep.$inferInsert;


// Monthly Team Cash Flow - Track monthly cash flow for Super Team and Personal
export const monthlyTeamCashFlow = mysqlTable("monthlyTeamCashFlow", {
  id: int("id").autoincrement().primaryKey(),
  
  // Period
  monthYear: varchar("monthYear", { length: 10 }).notNull(), // e.g., "2/2025"
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(), // e.g., 2025
  
  // Cash flow amounts
  superTeamCashFlow: decimal("superTeamCashFlow", { precision: 15, scale: 2 }).notNull(),
  personalCashFlow: decimal("personalCashFlow", { precision: 15, scale: 2 }).notNull(),
  
  // Agent info
  agentCode: varchar("agentCode", { length: 64 }).notNull().default("73DXR"),
  agentName: varchar("agentName", { length: 255 }).notNull().default("SHOPEJU, ZAID"),
  
  // Sync metadata
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueMonthYearIdx: uniqueIndex("unique_month_year_agent").on(table.monthYear, table.agentCode),
}));

export type MonthlyTeamCashFlow = typeof monthlyTeamCashFlow.$inferSelect;
export type InsertMonthlyTeamCashFlow = typeof monthlyTeamCashFlow.$inferInsert;


// Dismissed Alerts - Track acknowledged chargeback alerts to prevent repeated notifications
export const dismissedAlerts = mysqlTable("dismissedAlerts", {
  id: int("id").autoincrement().primaryKey(),
  
  // Alert identification
  alertType: mysqlEnum("alertType", [
    "REVERSED_PREMIUM_PAYMENT",
    "EFT_REMOVAL",
    "CHARGEBACK",
    "OTHER",
  ]).notNull(),
  policyNumber: varchar("policyNumber", { length: 50 }).notNull(),
  ownerName: varchar("ownerName", { length: 255 }),
  alertDate: varchar("alertDate", { length: 50 }), // Original alert date from Transamerica
  
  // Dismissal info
  dismissedBy: int("dismissedBy").references(() => users.id),
  dismissedAt: timestamp("dismissedAt").defaultNow().notNull(),
  dismissReason: text("dismissReason"), // Optional reason for dismissal
  
  // Metadata
  originalAlertData: json("originalAlertData"), // Store full alert data for reference
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  policyAlertIdx: uniqueIndex("unique_policy_alert").on(table.policyNumber, table.alertType, table.alertDate),
  alertTypeIdx: index("idx_dismissed_alerts_type").on(table.alertType),
  dismissedAtIdx: index("idx_dismissed_alerts_dismissed_at").on(table.dismissedAt),
}));

export type DismissedAlert = typeof dismissedAlerts.$inferSelect;
export type InsertDismissedAlert = typeof dismissedAlerts.$inferInsert;

export const dismissedAlertsRelations = relations(dismissedAlerts, ({ one }) => ({
  dismissedByUser: one(users, {
    fields: [dismissedAlerts.dismissedBy],
    references: [users.id],
  }),
}));


// Query Metrics History - Store periodic snapshots of database performance metrics
export const queryMetricsHistory = mysqlTable("queryMetricsHistory", {
  id: int("id").autoincrement().primaryKey(),
  
  // Snapshot timestamp
  snapshotAt: timestamp("snapshotAt").defaultNow().notNull(),
  
  // Aggregate metrics
  totalQueries: int("totalQueries").default(0).notNull(),
  totalDurationMs: decimal("totalDurationMs", { precision: 15, scale: 2 }).default("0").notNull(),
  avgDurationMs: decimal("avgDurationMs", { precision: 10, scale: 2 }).default("0").notNull(),
  maxDurationMs: decimal("maxDurationMs", { precision: 10, scale: 2 }).default("0").notNull(),
  minDurationMs: decimal("minDurationMs", { precision: 10, scale: 2 }).default("0").notNull(),
  
  // Query counts by type
  selectCount: int("selectCount").default(0).notNull(),
  insertCount: int("insertCount").default(0).notNull(),
  updateCount: int("updateCount").default(0).notNull(),
  deleteCount: int("deleteCount").default(0).notNull(),
  otherCount: int("otherCount").default(0).notNull(),
  
  // Performance indicators
  slowQueryCount: int("slowQueryCount").default(0).notNull(), // Queries > 1000ms
  failedQueryCount: int("failedQueryCount").default(0).notNull(),
  
  // Slow query details (top 5 slowest)
  slowQueries: json("slowQueries"), // Array of { query, duration, timestamp }
  
  // Period info (for aggregation)
  periodType: mysqlEnum("periodType", ["HOURLY", "DAILY", "WEEKLY"]).default("HOURLY").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  snapshotAtIdx: index("idx_query_metrics_snapshot_at").on(table.snapshotAt),
  periodTypeIdx: index("idx_query_metrics_period_type").on(table.periodType),
}));

export type QueryMetricsHistory = typeof queryMetricsHistory.$inferSelect;
export type InsertQueryMetricsHistory = typeof queryMetricsHistory.$inferInsert;


// ============================================
// Job Locking - Prevent overlapping sync runs
// ============================================
export const jobLocks = mysqlTable("job_locks", {
  name: varchar("name", { length: 128 }).primaryKey(),
  ownerId: varchar("ownerId", { length: 64 }).notNull(),
  lockedAt: timestamp("lockedAt").defaultNow().notNull(),
  lockedUntil: timestamp("lockedUntil").notNull(),
  heartbeatAt: timestamp("heartbeatAt").defaultNow().notNull(),
});

export type JobLock = typeof jobLocks.$inferSelect;
export type InsertJobLock = typeof jobLocks.$inferInsert;

// ============================================
// Sync Runs - Track sync job execution history
// ============================================
export const syncRuns = mysqlTable("sync_runs", {
  id: varchar("id", { length: 64 }).primaryKey(), // UUID
  jobName: varchar("jobName", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["running", "success", "failed", "cancelled"]).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
  durationMs: int("durationMs"),
  errorSummary: text("errorSummary"),
  metrics: json("metrics"), // { agentsUpdated, policiesUpdated, etc. }
  artifactsPath: varchar("artifactsPath", { length: 512 }), // Path to screenshots/logs
  triggeredBy: varchar("triggeredBy", { length: 64 }), // "cron", "manual", "api"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  jobNameIdx: index("idx_sync_runs_job_name").on(table.jobName),
  statusIdx: index("idx_sync_runs_status").on(table.status),
  startedAtIdx: index("idx_sync_runs_started_at").on(table.startedAt),
}));

export type SyncRun = typeof syncRuns.$inferSelect;
export type InsertSyncRun = typeof syncRuns.$inferInsert;


// ============================================
// Notifications - Real-time user notifications
// ============================================
export const NOTIFICATION_TYPES = [
  "SYNC_COMPLETED",       // Sync job finished successfully
  "SYNC_FAILED",          // Sync job failed
  "POLICY_ANNIVERSARY",   // Policy anniversary approaching
  "AGENT_MILESTONE",      // Agent reached a milestone (net licensed, rank up)
  "CHARGEBACK_ALERT",     // Potential chargeback detected
  "NEW_POLICY",           // New policy issued
  "SYSTEM_ALERT",         // System-level alerts
  "TASK_DUE",             // Task due reminder
  "WELCOME",              // Welcome notification for new users
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  
  // Target user (null = broadcast to all)
  userId: int("userId").references(() => users.id),
  
  // Notification content
  type: mysqlEnum("type", [
    "SYNC_COMPLETED",
    "SYNC_FAILED",
    "POLICY_ANNIVERSARY",
    "AGENT_MILESTONE",
    "CHARGEBACK_ALERT",
    "NEW_POLICY",
    "SYSTEM_ALERT",
    "TASK_DUE",
    "WELCOME",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Optional link to related entity
  linkUrl: varchar("linkUrl", { length: 512 }),
  linkLabel: varchar("linkLabel", { length: 100 }),
  
  // Related entity references (for filtering/grouping)
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // "agent", "policy", "sync", etc.
  relatedEntityId: varchar("relatedEntityId", { length: 100 }),
  
  // Priority and status
  priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  
  // Dismissal
  isDismissed: boolean("isDismissed").default(false).notNull(),
  dismissedAt: timestamp("dismissedAt"),
  
  // Metadata
  metadata: json("metadata"), // Additional context data
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiration for time-sensitive notifications
}, (table) => ({
  userIdIdx: index("idx_notifications_user_id").on(table.userId),
  typeIdx: index("idx_notifications_type").on(table.type),
  isReadIdx: index("idx_notifications_is_read").on(table.isRead),
  createdAtIdx: index("idx_notifications_created_at").on(table.createdAt),
  userUnreadIdx: index("idx_notifications_user_unread").on(table.userId, table.isRead, table.isDismissed),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

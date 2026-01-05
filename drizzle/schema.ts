import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean, date } from "drizzle-orm/mysql-core";
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
  
  // Cumulative metrics (updated from mywfg sync)
  totalBaseShopPoints: decimal("totalBaseShopPoints", { precision: 15, scale: 2 }).default("0"),
  totalPersonalPoints: decimal("totalPersonalPoints", { precision: 15, scale: 2 }).default("0"),
  totalCashFlow: decimal("totalCashFlow", { precision: 15, scale: 2 }).default("0"),
  directRecruits: int("directRecruits").default(0),
  licensedAgentsInOrg: int("licensedAgentsInOrg").default(0),
  directSmdLegs: int("directSmdLegs").default(0),
  
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

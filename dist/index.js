var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  NOTIFICATION_TYPES: () => NOTIFICATION_TYPES,
  WFG_RANKS: () => WFG_RANKS,
  advancementProgress: () => advancementProgress,
  advancementProgressRelations: () => advancementProgressRelations,
  agentCashFlowHistory: () => agentCashFlowHistory,
  agentCashFlowHistoryRelations: () => agentCashFlowHistoryRelations,
  agentExamPrep: () => agentExamPrep,
  agents: () => agents,
  agentsRelations: () => agentsRelations,
  clients: () => clients,
  clientsRelations: () => clientsRelations,
  commissionPayments: () => commissionPayments,
  commissionPaymentsRelations: () => commissionPaymentsRelations,
  credentials: () => credentials,
  credentialsRelations: () => credentialsRelations,
  dismissedAlerts: () => dismissedAlerts,
  dismissedAlertsRelations: () => dismissedAlertsRelations,
  emailTracking: () => emailTracking,
  goals: () => goals,
  goalsRelations: () => goalsRelations,
  incomeHistory: () => incomeHistory,
  inforcePolicies: () => inforcePolicies,
  inforcePoliciesRelations: () => inforcePoliciesRelations,
  jobLocks: () => jobLocks,
  monthlyTeamCashFlow: () => monthlyTeamCashFlow,
  mywfgSyncLogs: () => mywfgSyncLogs,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  pendingPolicies: () => pendingPolicies,
  pendingPoliciesRelations: () => pendingPoliciesRelations,
  pendingRequirements: () => pendingRequirements,
  pendingRequirementsRelations: () => pendingRequirementsRelations,
  productionRecords: () => productionRecords,
  productionRecordsRelations: () => productionRecordsRelations,
  queryMetricsHistory: () => queryMetricsHistory,
  scheduledEmails: () => scheduledEmails,
  syncLogs: () => syncLogs,
  syncRuns: () => syncRuns,
  users: () => users,
  usersRelations: () => usersRelations,
  workflowTasks: () => workflowTasks,
  workflowTasksRelations: () => workflowTasksRelations
});
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean, date, uniqueIndex, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var users, WFG_RANKS, agents, clients, workflowTasks, productionRecords, commissionPayments, advancementProgress, mywfgSyncLogs, credentials, usersRelations, agentsRelations, clientsRelations, workflowTasksRelations, productionRecordsRelations, commissionPaymentsRelations, advancementProgressRelations, credentialsRelations, agentCashFlowHistory, agentCashFlowHistoryRelations, syncLogs, pendingPolicies, pendingRequirements, pendingPoliciesRelations, pendingRequirementsRelations, inforcePolicies, inforcePoliciesRelations, incomeHistory, emailTracking, scheduledEmails, agentExamPrep, monthlyTeamCashFlow, dismissedAlerts, dismissedAlertsRelations, queryMetricsHistory, jobLocks, syncRuns, NOTIFICATION_TYPES, notifications, notificationsRelations, goals, goalsRelations;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
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
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    WFG_RANKS = [
      "TRAINING_ASSOCIATE",
      // TA - MyWFG Level 01
      "ASSOCIATE",
      // A - MyWFG Level 10
      "SENIOR_ASSOCIATE",
      // SA - MyWFG Level 15
      "MARKETING_DIRECTOR",
      // MD - MyWFG Level 17
      "SENIOR_MARKETING_DIRECTOR",
      // SMD - MyWFG Level 20
      "EXECUTIVE_MARKETING_DIRECTOR",
      // EMD - Level 65
      "CEO_MARKETING_DIRECTOR",
      // CEO MD - Level 75
      "EXECUTIVE_VICE_CHAIRMAN",
      // EVC - Level 87
      "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
      // SEVC - Level 90+
      "FIELD_CHAIRMAN",
      // FC - Level 95+
      "EXECUTIVE_CHAIRMAN"
      // EC - Level 99
    ];
    agents = mysqlTable("agents", {
      id: int("id").autoincrement().primaryKey(),
      agentCode: varchar("agentCode", { length: 64 }).unique(),
      mywfgAgentId: varchar("mywfgAgentId", { length: 64 }).unique(),
      // ID from mywfg.com
      firstName: varchar("firstName", { length: 255 }).notNull(),
      lastName: varchar("lastName", { length: 255 }).notNull(),
      email: varchar("email", { length: 320 }),
      phone: varchar("phone", { length: 20 }),
      homeAddress: text("homeAddress"),
      // Home address from MyWFG Hierarchy Tool
      recruiterUserId: int("recruiterUserId").references(() => users.id),
      // Upline/Downline hierarchy
      uplineAgentId: int("uplineAgentId"),
      // Self-referencing for hierarchy
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
        "EXECUTIVE_CHAIRMAN"
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
        "CHARGEBACK_PROOF"
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
      commissionLevel: int("commissionLevel").default(25),
      // 25%, 35%, 45%, 55%, 65%, etc.
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
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      agentCodeIdx: index("idx_agents_agent_code").on(table.agentCode),
      currentStageIdx: index("idx_agents_current_stage").on(table.currentStage),
      isActiveIdx: index("idx_agents_is_active").on(table.isActive),
      recruiterUserIdIdx: index("idx_agents_recruiter_user_id").on(table.recruiterUserId),
      createdAtIdx: index("idx_agents_created_at").on(table.createdAt)
    }));
    clients = mysqlTable("clients", {
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
      totalFaceAmount: decimal("totalFaceAmount", { precision: 15, scale: 2 }),
      // Total face amount of all policies for this client
      renewalDate: date("renewalDate"),
      lastContactDate: timestamp("lastContactDate"),
      householdId: varchar("householdId", { length: 64 }),
      // Group family members together
      isHeadOfHousehold: boolean("isHeadOfHousehold").default(true),
      // Primary contact for the family
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    workflowTasks = mysqlTable("workflowTasks", {
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
        "POLICY_REVIEW"
      ]).notNull(),
      dueDate: date("dueDate").notNull(),
      completedAt: timestamp("completedAt"),
      assignedToUserId: int("assignedToUserId").references(() => users.id),
      priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH"]).default("MEDIUM").notNull(),
      description: text("description"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    productionRecords = mysqlTable("productionRecords", {
      id: int("id").autoincrement().primaryKey(),
      agentId: int("agentId").references(() => agents.id).notNull(),
      clientId: int("clientId").references(() => clients.id),
      // Link to client for family tracking
      policyNumber: varchar("policyNumber", { length: 100 }).notNull(),
      policyType: varchar("policyType", { length: 50 }).notNull(),
      productCompany: varchar("productCompany", { length: 100 }),
      // e.g., "Transamerica", "Nationwide"
      customerName: varchar("customerName", { length: 255 }),
      faceAmount: decimal("faceAmount", { precision: 15, scale: 2 }),
      // Policy face amount (death benefit)
      commissionAmount: decimal("commissionAmount", { precision: 12, scale: 2 }),
      premiumAmount: decimal("premiumAmount", { precision: 12, scale: 2 }),
      basePoints: decimal("basePoints", { precision: 12, scale: 2 }),
      // Points for advancement tracking
      issueDate: date("issueDate").notNull(),
      chargebackProofDate: date("chargebackProofDate"),
      isChargebackProof: boolean("isChargebackProof").default(false).notNull(),
      // Commission breakdown by generation (for override tracking)
      generation: int("generation").default(0),
      // 0 = personal, 1-6 = generational
      overridePercentage: decimal("overridePercentage", { precision: 5, scale: 2 }),
      // Sync metadata
      mywfgSyncId: varchar("mywfgSyncId", { length: 100 }),
      // Unique ID from mywfg.com
      paymentCycle: varchar("paymentCycle", { length: 50 }),
      // e.g., "Dec 2025 Cycle 1"
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    commissionPayments = mysqlTable("commissionPayments", {
      id: int("id").autoincrement().primaryKey(),
      agentId: int("agentId").references(() => agents.id).notNull(),
      paymentDate: date("paymentDate").notNull(),
      paymentCycle: varchar("paymentCycle", { length: 50 }).notNull(),
      // e.g., "Dec 2025 Cycle 1"
      grossAmount: decimal("grossAmount", { precision: 12, scale: 2 }).notNull(),
      netAmount: decimal("netAmount", { precision: 12, scale: 2 }).notNull(),
      deductions: decimal("deductions", { precision: 12, scale: 2 }).default("0"),
      paymentMethod: varchar("paymentMethod", { length: 50 }),
      // e.g., "Direct Deposit"
      // Breakdown
      personalCommission: decimal("personalCommission", { precision: 12, scale: 2 }).default("0"),
      overrideCommission: decimal("overrideCommission", { precision: 12, scale: 2 }).default("0"),
      bonusAmount: decimal("bonusAmount", { precision: 12, scale: 2 }).default("0"),
      mywfgSyncId: varchar("mywfgSyncId", { length: 100 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    advancementProgress = mysqlTable("advancementProgress", {
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
        "EXECUTIVE_CHAIRMAN"
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
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    mywfgSyncLogs = mysqlTable("mywfgSyncLogs", {
      id: int("id").autoincrement().primaryKey(),
      syncDate: timestamp("syncDate").defaultNow().notNull(),
      syncType: mysqlEnum("syncType", [
        "FULL",
        "DOWNLINE_STATUS",
        "COMMISSIONS",
        "PAYMENTS",
        "CASH_FLOW",
        "TEAM_CHART"
      ]).default("FULL").notNull(),
      status: mysqlEnum("status", ["SUCCESS", "FAILED", "PARTIAL", "PENDING_OTP"]).notNull(),
      recordsProcessed: int("recordsProcessed").default(0),
      errorMessage: text("errorMessage"),
      syncedAgentCodes: json("syncedAgentCodes"),
      reportUrl: varchar("reportUrl", { length: 500 }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    credentials = mysqlTable("credentials", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").references(() => users.id).notNull(),
      encryptedUsername: text("encryptedUsername").notNull(),
      encryptedPassword: text("encryptedPassword").notNull(),
      encryptedApiKey: text("encryptedApiKey"),
      isActive: boolean("isActive").default(true).notNull(),
      lastUsedAt: timestamp("lastUsedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    usersRelations = relations(users, ({ many }) => ({
      agentsRecruited: many(agents, { relationName: "recruiter" }),
      tasksAssigned: many(workflowTasks, { relationName: "assignee" }),
      credentials: many(credentials)
    }));
    agentsRelations = relations(agents, ({ one, many }) => ({
      recruiter: one(users, {
        fields: [agents.recruiterUserId],
        references: [users.id],
        relationName: "recruiter"
      }),
      upline: one(agents, {
        fields: [agents.uplineAgentId],
        references: [agents.id],
        relationName: "uplineDownline"
      }),
      downline: many(agents, { relationName: "uplineDownline" }),
      clients: many(clients),
      tasks: many(workflowTasks),
      productionRecords: many(productionRecords),
      commissionPayments: many(commissionPayments),
      advancementProgress: many(advancementProgress)
    }));
    clientsRelations = relations(clients, ({ one, many }) => ({
      agent: one(agents, {
        fields: [clients.agentId],
        references: [agents.id]
      }),
      tasks: many(workflowTasks)
    }));
    workflowTasksRelations = relations(workflowTasks, ({ one }) => ({
      agent: one(agents, {
        fields: [workflowTasks.agentId],
        references: [agents.id]
      }),
      client: one(clients, {
        fields: [workflowTasks.clientId],
        references: [clients.id]
      }),
      assignedTo: one(users, {
        fields: [workflowTasks.assignedToUserId],
        references: [users.id],
        relationName: "assignee"
      })
    }));
    productionRecordsRelations = relations(productionRecords, ({ one }) => ({
      agent: one(agents, {
        fields: [productionRecords.agentId],
        references: [agents.id]
      })
    }));
    commissionPaymentsRelations = relations(commissionPayments, ({ one }) => ({
      agent: one(agents, {
        fields: [commissionPayments.agentId],
        references: [agents.id]
      })
    }));
    advancementProgressRelations = relations(advancementProgress, ({ one }) => ({
      agent: one(agents, {
        fields: [advancementProgress.agentId],
        references: [agents.id]
      })
    }));
    credentialsRelations = relations(credentials, ({ one }) => ({
      user: one(users, {
        fields: [credentials.userId],
        references: [users.id]
      })
    }));
    agentCashFlowHistory = mysqlTable("agentCashFlowHistory", {
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
      netLicensedDate: date("netLicensedDate"),
      // Date when agent reached $1,000
      // Sync metadata
      reportPeriod: varchar("reportPeriod", { length: 100 }),
      // e.g., "January 2025 - December 2025"
      syncedAt: timestamp("syncedAt").defaultNow().notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    agentCashFlowHistoryRelations = relations(agentCashFlowHistory, ({ one }) => ({
      agent: one(agents, {
        fields: [agentCashFlowHistory.agentId],
        references: [agents.id]
      })
    }));
    syncLogs = mysqlTable("syncLogs", {
      id: int("id").autoincrement().primaryKey(),
      syncType: mysqlEnum("syncType", [
        "FULL_SYNC",
        "DOWNLINE_STATUS",
        "CONTACT_INFO",
        "CASH_FLOW",
        "PRODUCTION",
        "TRANSAMERICA_PENDING",
        "TRANSAMERICA_INFORCE",
        "TRANSAMERICA_ALERTS"
      ]).notNull(),
      scheduledTime: varchar("scheduledTime", { length: 20 }),
      // "3:30 PM" or "6:30 PM"
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
      errorMessages: json("errorMessages"),
      // Array of error messages
      summary: text("summary"),
      // Human-readable summary
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      syncTypeIdx: index("idx_sync_logs_sync_type").on(table.syncType),
      statusIdx: index("idx_sync_logs_status").on(table.status),
      createdAtIdx: index("idx_sync_logs_created_at").on(table.createdAt)
    }));
    pendingPolicies = mysqlTable("pendingPolicies", {
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
        "Withdrawn"
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
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      statusIdx: index("idx_pending_policies_status").on(table.status),
      agentCodeIdx: index("idx_pending_policies_agent_code").on(table.agentCode),
      createdAtIdx: index("idx_pending_policies_created_at").on(table.createdAt)
    }));
    pendingRequirements = mysqlTable("pendingRequirements", {
      id: int("id").autoincrement().primaryKey(),
      policyId: int("policyId").references(() => pendingPolicies.id).notNull(),
      // Requirement category
      category: mysqlEnum("category", [
        "Pending with Producer",
        "Pending with Transamerica",
        "Completed"
      ]).notNull(),
      // Requirement details
      dateRequested: varchar("dateRequested", { length: 20 }),
      requirementOn: varchar("requirementOn", { length: 255 }),
      status: varchar("status", { length: 50 }),
      // Add, Outstanding, Received, Waived, etc.
      requirement: varchar("requirement", { length: 255 }),
      instruction: text("instruction"),
      comments: text("comments"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    pendingPoliciesRelations = relations(pendingPolicies, ({ many }) => ({
      requirements: many(pendingRequirements)
    }));
    pendingRequirementsRelations = relations(pendingRequirements, ({ one }) => ({
      policy: one(pendingPolicies, {
        fields: [pendingRequirements.policyId],
        references: [pendingPolicies.id]
      })
    }));
    inforcePolicies = mysqlTable("inforcePolicies", {
      id: int("id").autoincrement().primaryKey(),
      policyNumber: varchar("policyNumber", { length: 50 }).notNull().unique(),
      // Policy holder info
      ownerName: varchar("ownerName", { length: 255 }).notNull(),
      issueState: varchar("issueState", { length: 10 }),
      // Product info
      productType: varchar("productType", { length: 100 }),
      // Financial info
      faceAmount: decimal("faceAmount", { precision: 15, scale: 2 }),
      premium: decimal("premium", { precision: 12, scale: 2 }),
      // Premium from list view (may be annual or modal)
      targetPremium: decimal("targetPremium", { precision: 12, scale: 2 }),
      // Actual Target Premium from Policy Guidelines
      premiumFrequency: varchar("premiumFrequency", { length: 20 }),
      // Monthly, Annual, Flexible
      annualPremium: decimal("annualPremium", { precision: 12, scale: 2 }),
      // Calculated annual premium
      // Commission calculation
      // Commission = Target Premium × 125% × Agent Level × Split
      transamericaMultiplier: decimal("transamericaMultiplier", { precision: 5, scale: 2 }).default("1.25"),
      // 125%
      calculatedCommission: decimal("calculatedCommission", { precision: 12, scale: 2 }),
      // Agent info (primary writing agent)
      writingAgentName: varchar("writingAgentName", { length: 255 }),
      writingAgentCode: varchar("writingAgentCode", { length: 50 }),
      writingAgentSplit: int("writingAgentSplit").default(100),
      // Percentage split (0-100)
      writingAgentLevel: decimal("writingAgentLevel", { precision: 5, scale: 2 }).default("0.65"),
      // Agent commission level (e.g., 0.65 = 65% for SMD)
      writingAgentCommission: decimal("writingAgentCommission", { precision: 12, scale: 2 }),
      // Calculated commission for this agent
      // Link to our agents table
      agentId: int("agentId").references(() => agents.id),
      // Secondary writing agent (for split policies)
      secondAgentName: varchar("secondAgentName", { length: 255 }),
      secondAgentCode: varchar("secondAgentCode", { length: 50 }),
      secondAgentSplit: int("secondAgentSplit").default(0),
      // Percentage split (0-100)
      secondAgentLevel: decimal("secondAgentLevel", { precision: 5, scale: 2 }).default("0.25"),
      // Agent commission level
      secondAgentCommission: decimal("secondAgentCommission", { precision: 12, scale: 2 }),
      // Calculated commission for this agent
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
        "Terminated"
      ]).default("Active").notNull(),
      // Overwriting agents (JSON array for hierarchy)
      overwritingAgents: json("overwritingAgents"),
      // [{name, code, split, role}]
      // Sync metadata
      lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      statusIdx: index("idx_inforce_policies_status").on(table.status),
      writingAgentCodeIdx: index("idx_inforce_policies_writing_agent_code").on(table.writingAgentCode),
      agentIdIdx: index("idx_inforce_policies_agent_id").on(table.agentId),
      createdAtIdx: index("idx_inforce_policies_created_at").on(table.createdAt)
    }));
    inforcePoliciesRelations = relations(inforcePolicies, ({ one }) => ({
      agent: one(agents, {
        fields: [inforcePolicies.agentId],
        references: [agents.id]
      })
    }));
    incomeHistory = mysqlTable("incomeHistory", {
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
      agentLevel: decimal("agentLevel", { precision: 4, scale: 2 }).default("0.65"),
      // 65% for SMD
      transamericaConstant: decimal("transamericaConstant", { precision: 4, scale: 2 }).default("1.25"),
      // 125%
      // Source of actual income data (for tracking where the actual number came from)
      actualIncomeSource: varchar("actualIncomeSource", { length: 100 }),
      // e.g., "MyWFG Commission Statement", "Manual Entry"
      actualIncomeUpdatedAt: timestamp("actualIncomeUpdatedAt"),
      // Metadata
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    emailTracking = mysqlTable("emailTracking", {
      id: int("id").autoincrement().primaryKey(),
      trackingId: varchar("trackingId", { length: 64 }).notNull().unique(),
      // UUID for tracking
      // Email details
      emailType: mysqlEnum("emailType", [
        "ANNIVERSARY_GREETING",
        "ANNIVERSARY_REMINDER",
        "POLICY_REVIEW_REMINDER",
        "CHARGEBACK_ALERT",
        "GENERAL_NOTIFICATION"
      ]).notNull(),
      recipientEmail: varchar("recipientEmail", { length: 255 }).notNull(),
      recipientName: varchar("recipientName", { length: 255 }),
      subject: varchar("subject", { length: 500 }),
      // Related entity (e.g., policy number for anniversary emails)
      relatedEntityType: varchar("relatedEntityType", { length: 50 }),
      // "policy", "agent", "client"
      relatedEntityId: varchar("relatedEntityId", { length: 100 }),
      // policy number, agent code, etc.
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
      clickedLinks: json("clickedLinks"),
      // Array of clicked link URLs
      // User agent info (for analytics)
      lastUserAgent: varchar("lastUserAgent", { length: 500 }),
      lastIpAddress: varchar("lastIpAddress", { length: 50 }),
      // Resend tracking
      resendCount: int("resendCount").default(0),
      lastResendAt: timestamp("lastResendAt"),
      // Metadata
      metadata: json("metadata"),
      // Additional context (policy details, etc.)
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    scheduledEmails = mysqlTable("scheduledEmails", {
      id: int("id").autoincrement().primaryKey(),
      // Reference to original email tracking (for resends)
      originalTrackingId: varchar("originalTrackingId", { length: 64 }),
      // Email details
      emailType: mysqlEnum("emailType", [
        "ANNIVERSARY_GREETING",
        "ANNIVERSARY_REMINDER",
        "POLICY_REVIEW_REMINDER",
        "CHARGEBACK_ALERT",
        "GENERAL_NOTIFICATION"
      ]).notNull(),
      recipientEmail: varchar("recipientEmail", { length: 255 }).notNull(),
      recipientName: varchar("recipientName", { length: 255 }),
      // Related entity
      relatedEntityType: varchar("relatedEntityType", { length: 50 }),
      relatedEntityId: varchar("relatedEntityId", { length: 100 }),
      // Custom content (for edited emails)
      customContent: json("customContent"),
      // { greetingMessage, personalNote, closingMessage }
      // Scheduling
      scheduledFor: timestamp("scheduledFor").notNull(),
      status: mysqlEnum("status", ["PENDING", "SENT", "CANCELLED", "FAILED"]).default("PENDING").notNull(),
      // Processing info
      processedAt: timestamp("processedAt"),
      newTrackingId: varchar("newTrackingId", { length: 64 }),
      // Tracking ID of the sent email
      errorMessage: text("errorMessage"),
      // Metadata (policy details, agent info, etc.)
      metadata: json("metadata"),
      // Audit
      createdBy: int("createdBy").references(() => users.id),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    agentExamPrep = mysqlTable("agentExamPrep", {
      id: int("id").autoincrement().primaryKey(),
      // Agent reference (matched by name)
      agentId: int("agentId").references(() => agents.id),
      // Raw name from XCEL Solutions (for matching)
      xcelFirstName: varchar("xcelFirstName", { length: 255 }).notNull(),
      xcelLastName: varchar("xcelLastName", { length: 255 }).notNull(),
      // Course info
      course: varchar("course", { length: 255 }).notNull(),
      // e.g., "Texas Life & Health"
      state: varchar("state", { length: 50 }),
      // Extracted state from course name
      // Progress tracking
      dateEnrolled: date("dateEnrolled"),
      lastLogin: timestamp("lastLogin"),
      pleCompletePercent: int("pleCompletePercent").default(0),
      // 0-100
      preparedToPass: varchar("preparedToPass", { length: 50 }),
      // e.g., "Yes", "No", "In Progress"
      // Sync metadata
      lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
      emailSubject: varchar("emailSubject", { length: 500 }),
      // Original email subject for reference
      emailReceivedAt: timestamp("emailReceivedAt"),
      // When the XCEL email was received
      // Status
      isActive: boolean("isActive").default(true).notNull(),
      // Still actively studying
      completedAt: timestamp("completedAt"),
      // When they finished/passed
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    monthlyTeamCashFlow = mysqlTable("monthlyTeamCashFlow", {
      id: int("id").autoincrement().primaryKey(),
      // Period
      monthYear: varchar("monthYear", { length: 10 }).notNull(),
      // e.g., "2/2025"
      month: int("month").notNull(),
      // 1-12
      year: int("year").notNull(),
      // e.g., 2025
      // Cash flow amounts
      superTeamCashFlow: decimal("superTeamCashFlow", { precision: 15, scale: 2 }).notNull(),
      personalCashFlow: decimal("personalCashFlow", { precision: 15, scale: 2 }).notNull(),
      // Agent info
      agentCode: varchar("agentCode", { length: 64 }).notNull().default("73DXR"),
      agentName: varchar("agentName", { length: 255 }).notNull().default("SHOPEJU, ZAID"),
      // Sync metadata
      syncedAt: timestamp("syncedAt").defaultNow().notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      uniqueMonthYearIdx: uniqueIndex("unique_month_year_agent").on(table.monthYear, table.agentCode)
    }));
    dismissedAlerts = mysqlTable("dismissedAlerts", {
      id: int("id").autoincrement().primaryKey(),
      // Alert identification
      alertType: mysqlEnum("alertType", [
        "REVERSED_PREMIUM_PAYMENT",
        "EFT_REMOVAL",
        "CHARGEBACK",
        "OTHER"
      ]).notNull(),
      policyNumber: varchar("policyNumber", { length: 50 }).notNull(),
      ownerName: varchar("ownerName", { length: 255 }),
      alertDate: varchar("alertDate", { length: 50 }),
      // Original alert date from Transamerica
      // Dismissal info
      dismissedBy: int("dismissedBy").references(() => users.id),
      dismissedAt: timestamp("dismissedAt").defaultNow().notNull(),
      dismissReason: text("dismissReason"),
      // Optional reason for dismissal
      // Metadata
      originalAlertData: json("originalAlertData"),
      // Store full alert data for reference
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      policyAlertIdx: uniqueIndex("unique_policy_alert").on(table.policyNumber, table.alertType, table.alertDate),
      alertTypeIdx: index("idx_dismissed_alerts_type").on(table.alertType),
      dismissedAtIdx: index("idx_dismissed_alerts_dismissed_at").on(table.dismissedAt)
    }));
    dismissedAlertsRelations = relations(dismissedAlerts, ({ one }) => ({
      dismissedByUser: one(users, {
        fields: [dismissedAlerts.dismissedBy],
        references: [users.id]
      })
    }));
    queryMetricsHistory = mysqlTable("queryMetricsHistory", {
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
      slowQueryCount: int("slowQueryCount").default(0).notNull(),
      // Queries > 1000ms
      failedQueryCount: int("failedQueryCount").default(0).notNull(),
      // Slow query details (top 5 slowest)
      slowQueries: json("slowQueries"),
      // Array of { query, duration, timestamp }
      // Period info (for aggregation)
      periodType: mysqlEnum("periodType", ["HOURLY", "DAILY", "WEEKLY"]).default("HOURLY").notNull(),
      periodStart: timestamp("periodStart").notNull(),
      periodEnd: timestamp("periodEnd").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      snapshotAtIdx: index("idx_query_metrics_snapshot_at").on(table.snapshotAt),
      periodTypeIdx: index("idx_query_metrics_period_type").on(table.periodType)
    }));
    jobLocks = mysqlTable("job_locks", {
      name: varchar("name", { length: 128 }).primaryKey(),
      ownerId: varchar("ownerId", { length: 64 }).notNull(),
      lockedAt: timestamp("lockedAt").defaultNow().notNull(),
      lockedUntil: timestamp("lockedUntil").notNull(),
      heartbeatAt: timestamp("heartbeatAt").defaultNow().notNull()
    });
    syncRuns = mysqlTable("sync_runs", {
      id: varchar("id", { length: 64 }).primaryKey(),
      // UUID
      jobName: varchar("jobName", { length: 128 }).notNull(),
      status: mysqlEnum("status", ["running", "success", "failed", "cancelled"]).notNull(),
      startedAt: timestamp("startedAt").defaultNow().notNull(),
      finishedAt: timestamp("finishedAt"),
      durationMs: int("durationMs"),
      errorSummary: text("errorSummary"),
      metrics: json("metrics"),
      // { agentsUpdated, policiesUpdated, etc. }
      artifactsPath: varchar("artifactsPath", { length: 512 }),
      // Path to screenshots/logs
      triggeredBy: varchar("triggeredBy", { length: 64 }),
      // "cron", "manual", "api"
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      jobNameIdx: index("idx_sync_runs_job_name").on(table.jobName),
      statusIdx: index("idx_sync_runs_status").on(table.status),
      startedAtIdx: index("idx_sync_runs_started_at").on(table.startedAt)
    }));
    NOTIFICATION_TYPES = [
      "SYNC_COMPLETED",
      // Sync job finished successfully
      "SYNC_FAILED",
      // Sync job failed
      "POLICY_ANNIVERSARY",
      // Policy anniversary approaching
      "AGENT_MILESTONE",
      // Agent reached a milestone (net licensed, rank up)
      "CHARGEBACK_ALERT",
      // Potential chargeback detected
      "NEW_POLICY",
      // New policy issued
      "SYSTEM_ALERT",
      // System-level alerts
      "TASK_DUE",
      // Task due reminder
      "WELCOME"
      // Welcome notification for new users
    ];
    notifications = mysqlTable("notifications", {
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
        "WELCOME"
      ]).notNull(),
      title: varchar("title", { length: 255 }).notNull(),
      message: text("message").notNull(),
      // Optional link to related entity
      linkUrl: varchar("linkUrl", { length: 512 }),
      linkLabel: varchar("linkLabel", { length: 100 }),
      // Related entity references (for filtering/grouping)
      relatedEntityType: varchar("relatedEntityType", { length: 50 }),
      // "agent", "policy", "sync", etc.
      relatedEntityId: varchar("relatedEntityId", { length: 100 }),
      // Priority and status
      priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM").notNull(),
      isRead: boolean("isRead").default(false).notNull(),
      readAt: timestamp("readAt"),
      // Dismissal
      isDismissed: boolean("isDismissed").default(false).notNull(),
      dismissedAt: timestamp("dismissedAt"),
      // Metadata
      metadata: json("metadata"),
      // Additional context data
      // Timestamps
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      expiresAt: timestamp("expiresAt")
      // Optional expiration for time-sensitive notifications
    }, (table) => ({
      userIdIdx: index("idx_notifications_user_id").on(table.userId),
      typeIdx: index("idx_notifications_type").on(table.type),
      isReadIdx: index("idx_notifications_is_read").on(table.isRead),
      createdAtIdx: index("idx_notifications_created_at").on(table.createdAt),
      userUnreadIdx: index("idx_notifications_user_unread").on(table.userId, table.isRead, table.isDismissed)
    }));
    notificationsRelations = relations(notifications, ({ one }) => ({
      user: one(users, {
        fields: [notifications.userId],
        references: [users.id]
      })
    }));
    goals = mysqlTable("goals", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").references(() => users.id).notNull(),
      // Goal definition
      metricKey: varchar("metricKey", { length: 64 }).notNull(),
      // e.g., "new_agents", "policies_written", "cash_flow", "families_protected"
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      // Target and progress
      targetValue: decimal("targetValue", { precision: 15, scale: 2 }).notNull(),
      currentValue: decimal("currentValue", { precision: 15, scale: 2 }).default("0").notNull(),
      unit: varchar("unit", { length: 32 }).default("count").notNull(),
      // "count", "currency", "percentage"
      // Time period
      periodType: mysqlEnum("periodType", ["MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY").notNull(),
      periodMonth: int("periodMonth"),
      // 1-12 for monthly goals
      periodQuarter: int("periodQuarter"),
      // 1-4 for quarterly goals
      periodYear: int("periodYear").notNull(),
      // Status
      status: mysqlEnum("status", ["ACTIVE", "COMPLETED", "MISSED", "ARCHIVED"]).default("ACTIVE").notNull(),
      completedAt: timestamp("completedAt"),
      // Display
      color: varchar("color", { length: 32 }).default("primary"),
      // Tailwind color name for progress bar
      icon: varchar("icon", { length: 64 }),
      // Lucide icon name
      sortOrder: int("sortOrder").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      userIdIdx: index("idx_goals_user_id").on(table.userId),
      periodIdx: index("idx_goals_period").on(table.periodYear, table.periodMonth),
      statusIdx: index("idx_goals_status").on(table.status),
      metricKeyIdx: index("idx_goals_metric_key").on(table.metricKey)
    }));
    goalsRelations = relations(goals, ({ one }) => ({
      user: one(users, {
        fields: [goals.userId],
        references: [users.id]
      })
    }));
  }
});

// server/_core/env.schema.ts
import { z } from "zod";
function validateEnv() {
  const isProduction2 = process.env.NODE_ENV === "production";
  try {
    const result = envSchema.parse(process.env);
    console.log(`[ENV] Environment validated successfully (${result.NODE_ENV} mode)`);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      console.error(`
\u274C Environment validation failed:
${issues}
`);
      if (isProduction2) {
        console.error("FATAL: Cannot start in production with invalid environment configuration.");
        process.exit(1);
      }
    }
    throw error;
  }
}
function getEnv(name, defaultValue = "") {
  return process.env[name] ?? defaultValue;
}
var baseSchema, envSchema;
var init_env_schema = __esm({
  "server/_core/env.schema.ts"() {
    "use strict";
    baseSchema = z.object({
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      PORT: z.coerce.number().int().positive().default(3e3),
      // Core required variables
      DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
      JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
      // Encryption key - required for credential storage
      ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters").optional(),
      // Sync secret - required for cron endpoint authentication
      SYNC_SECRET: z.string().min(16, "SYNC_SECRET must be at least 16 characters").optional(),
      // OAuth configuration
      VITE_APP_ID: z.string().min(1, "VITE_APP_ID is required"),
      OAUTH_SERVER_URL: z.string().min(1, "OAUTH_SERVER_URL is required"),
      VITE_OAUTH_PORTAL_URL: z.string().optional().default(""),
      // Owner info
      OWNER_OPEN_ID: z.string().optional().default(""),
      OWNER_NAME: z.string().optional().default(""),
      // Forge API
      BUILT_IN_FORGE_API_URL: z.string().optional().default(""),
      BUILT_IN_FORGE_API_KEY: z.string().optional().default(""),
      VITE_FRONTEND_FORGE_API_URL: z.string().optional().default(""),
      VITE_FRONTEND_FORGE_API_KEY: z.string().optional().default(""),
      // App branding
      VITE_APP_TITLE: z.string().optional().default("Wealth Builders Haven CRM"),
      VITE_APP_LOGO: z.string().optional().default(""),
      // Analytics
      VITE_ANALYTICS_ENDPOINT: z.string().optional().default(""),
      VITE_ANALYTICS_WEBSITE_ID: z.string().optional().default(""),
      // Logging
      LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
      LOG_FORMAT: z.enum(["json", "pretty"]).default("pretty"),
      // MyWFG credentials (optional in dev, validated in prod for unattended sync)
      MYWFG_USERNAME: z.string().optional().default(""),
      MYWFG_PASSWORD: z.string().optional().default(""),
      MYWFG_EMAIL: z.string().optional().default(""),
      MYWFG_APP_PASSWORD: z.string().optional().default(""),
      // Transamerica credentials (optional in dev, validated in prod for unattended sync)
      TRANSAMERICA_USERNAME: z.string().optional().default(""),
      TRANSAMERICA_PASSWORD: z.string().optional().default(""),
      TRANSAMERICA_EMAIL: z.string().optional().default(""),
      TRANSAMERICA_APP_PASSWORD: z.string().optional().default(""),
      TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY: z.string().optional().default(""),
      TRANSAMERICA_SECURITY_Q_PET_NAME: z.string().optional().default(""),
      // Enable legacy GET method for cron endpoints (deprecated, use POST)
      ENABLE_CRON_GET_SECRET: z.string().optional().transform((v) => v ? ["1", "true", "yes", "on"].includes(v.toLowerCase()) : false),
      // Enable portal sync - when true, portal credentials are required in production
      ENABLE_PORTAL_SYNC: z.string().optional().transform((v) => v ? ["1", "true", "yes", "on"].includes(v.toLowerCase()) : true)
      // Default to true
    });
    envSchema = baseSchema.superRefine((env, ctx) => {
      if (env.NODE_ENV === "production") {
        if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "JWT_SECRET must be at least 16 characters in production",
            path: ["JWT_SECRET"]
          });
        }
        if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY.length < 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "ENCRYPTION_KEY is required in production and must be at least 32 characters",
            path: ["ENCRYPTION_KEY"]
          });
        }
        if (!env.SYNC_SECRET || env.SYNC_SECRET.length < 16) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "SYNC_SECRET is required in production and must be at least 16 characters",
            path: ["SYNC_SECRET"]
          });
        }
        if (env.ENABLE_PORTAL_SYNC) {
          const requiredTransamericaCreds = [
            ["TRANSAMERICA_USERNAME", env.TRANSAMERICA_USERNAME],
            ["TRANSAMERICA_PASSWORD", env.TRANSAMERICA_PASSWORD]
          ];
          for (const [key, value] of requiredTransamericaCreds) {
            if (!value || value === "") {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${key} is required in production for unattended sync (set ENABLE_PORTAL_SYNC=false to disable)`,
                path: [key]
              });
            }
          }
          if ((!env.TRANSAMERICA_SECURITY_Q_PET_NAME || env.TRANSAMERICA_SECURITY_Q_PET_NAME === "") && (!env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY || env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY === "")) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "At least one Transamerica security answer is required for unattended sync",
              path: ["TRANSAMERICA_SECURITY_Q_PET_NAME"]
            });
          }
          if (!env.MYWFG_USERNAME || !env.MYWFG_PASSWORD) {
            console.warn(
              "[ENV] Warning: MyWFG credentials not configured. MyWFG sync will be skipped."
            );
          }
        } else {
          console.warn(
            "[ENV] Warning: ENABLE_PORTAL_SYNC=false - portal credentials not validated. Unattended sync will not work."
          );
        }
      }
    });
  }
});

// server/_core/env.ts
var validatedEnv, ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    init_env_schema();
    validatedEnv = validateEnv();
    ENV = {
      // Core app config
      nodeEnv: validatedEnv.NODE_ENV,
      isProduction: validatedEnv.NODE_ENV === "production",
      port: validatedEnv.PORT,
      appId: validatedEnv.VITE_APP_ID,
      cookieSecret: validatedEnv.JWT_SECRET,
      databaseUrl: validatedEnv.DATABASE_URL,
      oAuthServerUrl: validatedEnv.OAUTH_SERVER_URL,
      ownerOpenId: validatedEnv.OWNER_OPEN_ID,
      ownerName: validatedEnv.OWNER_NAME,
      // Forge API
      forgeApiUrl: validatedEnv.BUILT_IN_FORGE_API_URL,
      forgeApiKey: validatedEnv.BUILT_IN_FORGE_API_KEY,
      // App branding
      appTitle: validatedEnv.VITE_APP_TITLE,
      appLogo: validatedEnv.VITE_APP_LOGO,
      // Cron / automation controls
      enableCronGetSecret: validatedEnv.ENABLE_CRON_GET_SECRET
    };
  }
});

// server/_core/logger.ts
import { AsyncLocalStorage } from "async_hooks";
function generateRequestId() {
  const timestamp2 = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp2}-${random}`;
}
function runWithRequestContext(context, fn) {
  const fullContext = {
    requestId: context.requestId || generateRequestId(),
    userId: context.userId,
    userEmail: context.userEmail,
    path: context.path,
    method: context.method,
    startTime: Date.now()
  };
  return requestContext.run(fullContext, fn);
}
function getRequestContext() {
  return requestContext.getStore();
}
function formatLogEntry(entry) {
  if (useJsonFormat) {
    return JSON.stringify(entry);
  }
  const { timestamp: timestamp2, level, message, requestId, userId, path: path4, duration, data, error } = entry;
  const levelColor = {
    debug: "\x1B[36m",
    // cyan
    info: "\x1B[32m",
    // green
    warn: "\x1B[33m",
    // yellow
    error: "\x1B[31m"
    // red
  }[level];
  const reset = "\x1B[0m";
  let output = `${timestamp2} ${levelColor}[${level.toUpperCase()}]${reset}`;
  if (requestId) {
    output += ` [${requestId}]`;
  }
  if (path4) {
    output += ` ${path4}`;
  }
  output += ` ${message}`;
  if (duration !== void 0) {
    output += ` (${duration}ms)`;
  }
  if (userId) {
    output += ` user:${userId}`;
  }
  if (data && Object.keys(data).length > 0) {
    output += ` ${JSON.stringify(data)}`;
  }
  if (error) {
    output += `
  Error: ${error.name}: ${error.message}`;
    if (error.stack && !isProduction) {
      output += `
  ${error.stack.split("\n").slice(1, 4).join("\n  ")}`;
    }
  }
  return output;
}
function log(level, message, data, error) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel]) {
    return;
  }
  const context = getRequestContext();
  const now = /* @__PURE__ */ new Date();
  const entry = {
    timestamp: now.toISOString(),
    level,
    message,
    requestId: context?.requestId,
    userId: context?.userId,
    path: context?.path,
    duration: context ? Date.now() - context.startTime : void 0,
    data,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : void 0
  };
  const output = formatLogEntry(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}
function requestCorrelationMiddleware() {
  return (req, res, next) => {
    const requestId = req.headers["x-request-id"] || generateRequestId();
    res.setHeader("x-request-id", requestId);
    runWithRequestContext(
      {
        requestId,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        userEmail: req.user?.email
      },
      () => {
        logger.info(`${req.method} ${req.path}`, {
          query: Object.keys(req.query).length > 0 ? req.query : void 0,
          userAgent: req.headers["user-agent"]?.substring(0, 100)
        });
        res.on("finish", () => {
          const context = getRequestContext();
          const duration = context ? Date.now() - context.startTime : 0;
          const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
          if (logLevel === "error") {
            logger.error(`${req.method} ${req.path} ${res.statusCode}`, void 0, { statusCode: res.statusCode, duration });
          } else if (logLevel === "warn") {
            logger.warn(`${req.method} ${req.path} ${res.statusCode}`, { statusCode: res.statusCode, duration });
          } else {
            logger.info(`${req.method} ${req.path} ${res.statusCode}`, { statusCode: res.statusCode, duration });
          }
        });
        next();
      }
    );
  };
}
var requestContext, LOG_LEVELS, currentLogLevel, logFormat, isProduction, useJsonFormat, logger;
var init_logger = __esm({
  "server/_core/logger.ts"() {
    "use strict";
    requestContext = new AsyncLocalStorage();
    LOG_LEVELS = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    currentLogLevel = process.env.LOG_LEVEL || "info";
    logFormat = process.env.LOG_FORMAT || "pretty";
    isProduction = process.env.NODE_ENV === "production";
    useJsonFormat = logFormat === "json" || isProduction;
    logger = {
      debug: (message, data) => log("debug", message, data),
      info: (message, data) => log("info", message, data),
      warn: (message, data) => log("warn", message, data),
      error: (message, error, data) => log("error", message, data, error),
      /**
       * Create a child logger with additional context
       */
      child: (context) => ({
        debug: (message, data) => log("debug", message, { ...context, ...data }),
        info: (message, data) => log("info", message, { ...context, ...data }),
        warn: (message, data) => log("warn", message, { ...context, ...data }),
        error: (message, error, data) => log("error", message, { ...context, ...data }, error)
      })
    };
  }
});

// server/repositories/agents.ts
var agents_exports = {};
__export(agents_exports, {
  bulkUpsertCashFlowRecords: () => bulkUpsertCashFlowRecords,
  clearAllCashFlowRecords: () => clearAllCashFlowRecords,
  createAgent: () => createAgent,
  getAgentById: () => getAgentById,
  getAgentCashFlowHistory: () => getAgentCashFlowHistory,
  getAgentContactInfo: () => getAgentContactInfo,
  getAgents: () => getAgents,
  getAllCashFlowRecords: () => getAllCashFlowRecords,
  getNetLicensedAgents: () => getNetLicensedAgents,
  initAgentsRepository: () => initAgentsRepository,
  updateAgent: () => updateAgent,
  upsertCashFlowRecord: () => upsertCashFlowRecord
});
import { eq, desc } from "drizzle-orm";
function initAgentsRepository(getDb3) {
  _getDb = getDb3;
}
async function getAgents(filters) {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get agents: database not available");
    return [];
  }
  let query = db.select().from(agents);
  if (filters?.stage) {
    query = query.where(eq(agents.currentStage, filters.stage));
  }
  if (filters?.isActive !== void 0) {
    query = query.where(eq(agents.isActive, filters.isActive));
  }
  logger.debug("Fetching agents", { filters });
  return query;
}
async function getAgentById(id) {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get agent: database not available");
    return null;
  }
  logger.debug("Fetching agent by ID", { agentId: id });
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0] || null;
}
async function createAgent(data) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  logger.info("Creating new agent", { firstName: data.firstName, lastName: data.lastName });
  const insertResult = await db.insert(agents).values(data);
  const insertId = insertResult[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to get inserted agent ID");
  }
  const created = await db.select().from(agents).where(eq(agents.id, insertId)).limit(1);
  return created[0];
}
async function updateAgent(id, data) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  logger.info("Updating agent", { agentId: id });
  await db.update(agents).set(data).where(eq(agents.id, id));
  const updated = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return updated[0];
}
async function getAgentCashFlowHistory(agentCode) {
  const db = await _getDb();
  if (!db) return [];
  logger.debug("Fetching agent cash flow history", { agentCode });
  return db.select().from(agentCashFlowHistory).where(eq(agentCashFlowHistory.agentCode, agentCode)).orderBy(desc(agentCashFlowHistory.syncedAt));
}
async function getAllCashFlowRecords() {
  const db = await _getDb();
  if (!db) return [];
  logger.debug("Fetching all cash flow records");
  return db.select().from(agentCashFlowHistory).orderBy(desc(agentCashFlowHistory.cumulativeCashFlow));
}
async function getNetLicensedAgents() {
  const db = await _getDb();
  if (!db) {
    return {
      netLicensedAgents: [],
      notNetLicensedAgents: [],
      totalNetLicensed: 0,
      reportPeriod: "N/A",
      lastSyncDate: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  logger.debug("Fetching net licensed agents");
  const allRecords = await db.select().from(agentCashFlowHistory).orderBy(desc(agentCashFlowHistory.cumulativeCashFlow));
  const netLicensedAgents = allRecords.filter((r) => {
    const cashFlow = parseFloat(r.cumulativeCashFlow?.toString() || "0");
    const title = r.titleLevel?.toUpperCase() || "";
    return cashFlow >= 1e3 && (title === "TA" || title === "A");
  }).map((r, index2) => ({
    rank: index2 + 1,
    name: r.agentName,
    code: r.agentCode,
    titleLevel: r.titleLevel || "TA",
    totalCashFlow: parseFloat(r.cumulativeCashFlow?.toString() || "0"),
    uplineSMD: r.uplineSMD || "Unknown",
    netLicensedDate: r.netLicensedDate || null
  }));
  const notNetLicensedAgents = allRecords.filter((r) => {
    const cashFlow = parseFloat(r.cumulativeCashFlow?.toString() || "0");
    const title = r.titleLevel?.toUpperCase() || "";
    return cashFlow < 1e3 && cashFlow > 0 && (title === "TA" || title === "A");
  }).map((r) => ({
    name: r.agentName,
    code: r.agentCode,
    titleLevel: r.titleLevel || "TA",
    totalCashFlow: parseFloat(r.cumulativeCashFlow?.toString() || "0"),
    uplineSMD: r.uplineSMD || "Unknown",
    amountToNetLicensed: 1e3 - parseFloat(r.cumulativeCashFlow?.toString() || "0")
  })).slice(0, 10);
  return {
    netLicensedAgents,
    notNetLicensedAgents,
    totalNetLicensed: netLicensedAgents.length,
    reportPeriod: allRecords[0]?.reportPeriod || "N/A",
    lastSyncDate: allRecords[0]?.syncedAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function upsertCashFlowRecord(data) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  logger.info("Upserting cash flow record", { agentCode: data.agentCode });
  const existing = await db.select().from(agentCashFlowHistory).where(eq(agentCashFlowHistory.agentCode, data.agentCode)).limit(1);
  if (existing.length > 0) {
    await db.update(agentCashFlowHistory).set({
      agentName: data.agentName,
      titleLevel: data.titleLevel,
      uplineSMD: data.uplineSMD,
      cashFlowAmount: data.cashFlowAmount,
      cumulativeCashFlow: data.cumulativeCashFlow,
      paymentDate: data.paymentDate,
      paymentCycle: data.paymentCycle,
      isNetLicensed: parseFloat(data.cumulativeCashFlow?.toString() || "0") >= 1e3,
      netLicensedDate: parseFloat(data.cumulativeCashFlow?.toString() || "0") >= 1e3 ? existing[0].netLicensedDate || data.paymentDate : null,
      reportPeriod: data.reportPeriod,
      syncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(agentCashFlowHistory.agentCode, data.agentCode));
    const updated = await db.select().from(agentCashFlowHistory).where(eq(agentCashFlowHistory.agentCode, data.agentCode)).limit(1);
    return updated[0];
  } else {
    const isNetLicensed = parseFloat(data.cumulativeCashFlow?.toString() || "0") >= 1e3;
    const insertResult = await db.insert(agentCashFlowHistory).values({
      ...data,
      isNetLicensed,
      netLicensedDate: isNetLicensed ? data.paymentDate : null,
      syncedAt: /* @__PURE__ */ new Date()
    });
    const insertId = insertResult[0]?.insertId;
    if (!insertId) {
      throw new Error("Failed to get inserted cash flow record ID");
    }
    const created = await db.select().from(agentCashFlowHistory).where(eq(agentCashFlowHistory.id, insertId)).limit(1);
    return created[0];
  }
}
async function bulkUpsertCashFlowRecords(records) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  logger.info("Bulk upserting cash flow records", { count: records.length });
  const results = [];
  for (const record of records) {
    try {
      const insertData = {
        agentCode: record.agentCode,
        agentName: record.agentName,
        titleLevel: record.titleLevel,
        uplineSMD: record.uplineSMD,
        cashFlowAmount: record.cashFlowAmount,
        cumulativeCashFlow: record.cumulativeCashFlow,
        paymentDate: record.paymentDate ? new Date(record.paymentDate) : void 0,
        paymentCycle: record.paymentCycle,
        reportPeriod: record.reportPeriod
      };
      await upsertCashFlowRecord(insertData);
      results.push({ agentCode: record.agentCode, success: true });
    } catch (error) {
      results.push({ agentCode: record.agentCode, success: false, error: String(error) });
    }
  }
  return results;
}
async function clearAllCashFlowRecords() {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  logger.warn("Clearing all cash flow records");
  await db.delete(agentCashFlowHistory);
  return { success: true };
}
async function getAgentContactInfo(agentCode) {
  const db = await _getDb();
  if (!db) return null;
  logger.debug("Fetching agent contact info", { agentCode });
  const result = await db.select({
    firstName: agents.firstName,
    lastName: agents.lastName,
    phone: agents.phone,
    email: agents.email
  }).from(agents).where(eq(agents.agentCode, agentCode)).limit(1);
  if (result.length === 0) return null;
  const agent = result[0];
  return {
    name: `${agent.firstName} ${agent.lastName}`,
    phone: agent.phone,
    email: agent.email
  };
}
var _getDb;
var init_agents = __esm({
  "server/repositories/agents.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/repositories/clients.ts
import { eq as eq2 } from "drizzle-orm";
function initClientsRepository(getDb3) {
  _getDb2 = getDb3;
}
async function getClients(agentId) {
  const db = await _getDb2();
  if (!db) {
    logger.warn("Cannot get clients: database not available");
    return [];
  }
  logger.debug("Fetching clients", { agentId });
  if (agentId) {
    return db.select().from(clients).where(eq2(clients.agentId, agentId));
  }
  return db.select().from(clients);
}
async function getClientById(id) {
  const db = await _getDb2();
  if (!db) {
    logger.warn("Cannot get client: database not available");
    return null;
  }
  logger.debug("Fetching client by ID", { clientId: id });
  const result = await db.select().from(clients).where(eq2(clients.id, id)).limit(1);
  return result[0] || null;
}
async function createClient(data) {
  const db = await _getDb2();
  if (!db) throw new Error("Database not available");
  logger.info("Creating new client", { firstName: data.firstName, lastName: data.lastName });
  return db.insert(clients).values(data);
}
async function updateClient(id, data) {
  const db = await _getDb2();
  if (!db) throw new Error("Database not available");
  logger.info("Updating client", { clientId: id });
  await db.update(clients).set(data).where(eq2(clients.id, id));
  const updated = await db.select().from(clients).where(eq2(clients.id, id)).limit(1);
  return updated[0];
}
async function getClientEmailByName(firstName, lastName) {
  const db = await _getDb2();
  if (!db) {
    logger.warn("Cannot get client email: database not available");
    return null;
  }
  logger.debug("Fetching client email by name", { firstName, lastName });
  const exactMatch = await db.select({ email: clients.email }).from(clients).where(eq2(clients.firstName, firstName)).limit(1);
  if (exactMatch.length > 0 && exactMatch[0].email) {
    return exactMatch[0].email;
  }
  const allClients = await db.select({
    firstName: clients.firstName,
    lastName: clients.lastName,
    email: clients.email
  }).from(clients);
  for (const client of allClients) {
    if (client.firstName?.toLowerCase() === firstName.toLowerCase() && client.lastName?.toLowerCase() === lastName.toLowerCase() && client.email) {
      return client.email;
    }
  }
  return null;
}
var _getDb2;
var init_clients = __esm({
  "server/repositories/clients.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/repositories/tasks.ts
import { eq as eq3, and as and2, isNull, isNotNull } from "drizzle-orm";
function initTasksRepository(getDb3) {
  _getDb3 = getDb3;
}
async function getWorkflowTasks(filters) {
  const db = await _getDb3();
  if (!db) {
    logger.warn("Cannot get workflow tasks: database not available");
    return [];
  }
  logger.debug("Fetching workflow tasks", { filters });
  const conditions = [];
  if (filters?.agentId) {
    conditions.push(eq3(workflowTasks.agentId, filters.agentId));
  }
  if (filters?.clientId) {
    conditions.push(eq3(workflowTasks.clientId, filters.clientId));
  }
  if (filters?.completed !== void 0) {
    if (filters.completed) {
      conditions.push(isNotNull(workflowTasks.completedAt));
    } else {
      conditions.push(isNull(workflowTasks.completedAt));
    }
  }
  if (conditions.length > 0) {
    return db.select().from(workflowTasks).where(and2(...conditions));
  }
  return db.select().from(workflowTasks);
}
async function createWorkflowTask(data) {
  const db = await _getDb3();
  if (!db) throw new Error("Database not available");
  logger.info("Creating workflow task", { taskType: data.taskType, agentId: data.agentId });
  return db.insert(workflowTasks).values(data);
}
async function updateWorkflowTask(id, data) {
  const db = await _getDb3();
  if (!db) throw new Error("Database not available");
  logger.info("Updating workflow task", { taskId: id });
  await db.update(workflowTasks).set(data).where(eq3(workflowTasks.id, id));
  const updated = await db.select().from(workflowTasks).where(eq3(workflowTasks.id, id)).limit(1);
  return updated[0];
}
async function getTaskById(id) {
  const db = await _getDb3();
  if (!db) {
    logger.warn("Cannot get task: database not available");
    return null;
  }
  logger.debug("Fetching task by ID", { taskId: id });
  const result = await db.select().from(workflowTasks).where(eq3(workflowTasks.id, id)).limit(1);
  return result[0] || null;
}
async function completeTask(id) {
  const db = await _getDb3();
  if (!db) throw new Error("Database not available");
  logger.info("Completing task", { taskId: id });
  await db.update(workflowTasks).set({ completedAt: /* @__PURE__ */ new Date() }).where(eq3(workflowTasks.id, id));
  const updated = await db.select().from(workflowTasks).where(eq3(workflowTasks.id, id)).limit(1);
  return updated[0];
}
async function getTaskStats() {
  const db = await _getDb3();
  if (!db) {
    return { total: 0, completed: 0, pending: 0 };
  }
  logger.debug("Fetching task statistics");
  const allTasks = await db.select().from(workflowTasks);
  const completed = allTasks.filter((t2) => t2.completedAt !== null);
  return {
    total: allTasks.length,
    completed: completed.length,
    pending: allTasks.length - completed.length
  };
}
var _getDb3;
var init_tasks = __esm({
  "server/repositories/tasks.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/repositories/dashboard.ts
import { eq as eq4, count, sum } from "drizzle-orm";
function initDashboardRepository(getDb3) {
  _getDb4 = getDb3;
}
async function getMonthOverMonthComparison() {
  const db = await _getDb4();
  if (!db) {
    return {
      activeAssociates: { current: 0, previous: 0, change: 0, changePercent: 0 },
      licensedAgents: { current: 0, previous: 0, change: 0, changePercent: 0 },
      totalPolicies: { current: 0, previous: 0, change: 0, changePercent: 0 },
      familiesProtected: { current: 0, previous: 0, change: 0, changePercent: 0 },
      superTeamCashFlow: { current: 0, previous: 0, change: 0, changePercent: 0 },
      totalFaceAmount: { current: 0, previous: 0, change: 0, changePercent: 0 }
    };
  }
  logger.debug("Calculating month-over-month comparison");
  const now = /* @__PURE__ */ new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const previousMonthStart = new Date(prevYear, prevMonth - 1, 1);
  const previousMonthEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59);
  const allAgents = await db.select().from(agents);
  const currentActive = allAgents.filter((a) => a.isActive).length;
  const previousActive = allAgents.filter((a) => a.isActive && new Date(a.createdAt) < currentMonthStart).length;
  const cashFlowRecords = await db.select().from(agentCashFlowHistory);
  const cashFlowMap = /* @__PURE__ */ new Map();
  for (const record of cashFlowRecords) {
    const current = cashFlowMap.get(record.agentCode) || 0;
    const recordValue = parseFloat(String(record.cumulativeCashFlow || 0));
    if (recordValue > current) {
      cashFlowMap.set(record.agentCode, recordValue);
    }
  }
  const currentLicensed = allAgents.filter((agent) => {
    if (!agent.isActive || !agent.agentCode) return false;
    const cf = cashFlowMap.get(agent.agentCode) || 0;
    if (["SMD", "EMD", "CEO"].includes(agent.currentRank || "")) return false;
    return cf >= 1e3;
  }).length;
  const previousLicensed = allAgents.filter((agent) => {
    if (!agent.isActive || !agent.agentCode) return false;
    if (new Date(agent.createdAt) >= currentMonthStart) return false;
    const cf = cashFlowMap.get(agent.agentCode) || 0;
    if (["SMD", "EMD", "CEO"].includes(agent.currentRank || "")) return false;
    return cf >= 1e3;
  }).length;
  const allPolicies = await db.select().from(inforcePolicies).where(eq4(inforcePolicies.status, "Active"));
  const currentPolicies = allPolicies.length;
  const previousPolicies = allPolicies.filter((p) => {
    const issueDate = p.issueDate ? new Date(p.issueDate) : null;
    return !issueDate || issueDate < currentMonthStart;
  }).length;
  const currentFamilies = new Set(allPolicies.map((p) => p.ownerName)).size;
  const prevPolicies = allPolicies.filter((p) => {
    const issueDate = p.issueDate ? new Date(p.issueDate) : null;
    return !issueDate || issueDate < currentMonthStart;
  });
  const previousFamilies = new Set(prevPolicies.map((p) => p.ownerName)).size;
  const currentFaceAmount = allPolicies.reduce((sum2, p) => sum2 + parseFloat(String(p.faceAmount || 0)), 0);
  const previousFaceAmount = prevPolicies.reduce((sum2, p) => sum2 + parseFloat(String(p.faceAmount || 0)), 0);
  const cashFlowData = await db.select().from(monthlyTeamCashFlow).where(eq4(monthlyTeamCashFlow.agentCode, "73DXR"));
  const currentCashFlow = cashFlowData.find((r) => r.month === currentMonth && r.year === currentYear);
  const previousCashFlow = cashFlowData.find((r) => r.month === prevMonth && r.year === prevYear);
  const currentSuperTeam = parseFloat(String(currentCashFlow?.superTeamCashFlow || 0));
  const previousSuperTeam = parseFloat(String(previousCashFlow?.superTeamCashFlow || 0));
  function calcChange(current, previous) {
    const change = current - previous;
    const changePercent = previous > 0 ? Math.round(change / previous * 100) : current > 0 ? 100 : 0;
    return { current, previous, change, changePercent };
  }
  return {
    activeAssociates: calcChange(currentActive, previousActive),
    licensedAgents: calcChange(currentLicensed, previousLicensed),
    totalPolicies: calcChange(currentPolicies, previousPolicies),
    familiesProtected: calcChange(currentFamilies, previousFamilies),
    superTeamCashFlow: calcChange(currentSuperTeam, previousSuperTeam),
    totalFaceAmount: calcChange(currentFaceAmount, previousFaceAmount)
  };
}
async function getAgentStats() {
  const db = await _getDb4();
  if (!db) {
    return { total: 0, active: 0, inactive: 0, byStage: {} };
  }
  logger.debug("Fetching agent statistics");
  const allAgents = await db.select().from(agents);
  const active = allAgents.filter((a) => a.isActive);
  const inactive = allAgents.filter((a) => !a.isActive);
  const byStage = {};
  for (const agent of allAgents) {
    const stage = agent.currentStage || "UNKNOWN";
    byStage[stage] = (byStage[stage] || 0) + 1;
  }
  return {
    total: allAgents.length,
    active: active.length,
    inactive: inactive.length,
    byStage
  };
}
async function getProductionStats() {
  const db = await _getDb4();
  if (!db) {
    return { totalPremium: 0, totalCommission: 0, policyCount: 0 };
  }
  logger.debug("Fetching production statistics");
  const metrics = await db.select({
    totalPremium: sum(inforcePolicies.targetPremium),
    totalCommission: sum(inforcePolicies.calculatedCommission),
    count: count()
  }).from(inforcePolicies).where(eq4(inforcePolicies.status, "Active"));
  return {
    totalPremium: parseFloat(String(metrics[0]?.totalPremium || 0)),
    totalCommission: parseFloat(String(metrics[0]?.totalCommission || 0)),
    policyCount: metrics[0]?.count || 0
  };
}
async function getMonthlyTeamCashFlow(agentCode = "73DXR") {
  const db = await _getDb4();
  if (!db) return [];
  logger.debug("Fetching monthly team cash flow", { agentCode });
  return db.select().from(monthlyTeamCashFlow).where(eq4(monthlyTeamCashFlow.agentCode, agentCode));
}
async function upsertMonthlyTeamCashFlow(data) {
  const db = await _getDb4();
  if (!db) throw new Error("Database not available");
  logger.info("Upserting monthly team cash flow", { agentCode: data.agentCode, monthYear: data.monthYear });
  return db.insert(monthlyTeamCashFlow).values(data).onDuplicateKeyUpdate({
    set: {
      superTeamCashFlow: data.superTeamCashFlow,
      personalCashFlow: data.personalCashFlow
    }
  });
}
async function bulkUpsertMonthlyTeamCashFlow(records) {
  const db = await _getDb4();
  if (!db) throw new Error("Database not available");
  logger.info("Bulk upserting monthly team cash flow", { count: records.length });
  const results = [];
  for (const record of records) {
    const result = await upsertMonthlyTeamCashFlow(record);
    results.push(result);
  }
  return results;
}
async function getCashFlowTotals(agentCode = "73DXR") {
  const db = await _getDb4();
  if (!db) {
    return { superTeamTotal: 0, personalTotal: 0 };
  }
  logger.debug("Fetching cash flow totals", { agentCode });
  const records = await db.select().from(monthlyTeamCashFlow).where(eq4(monthlyTeamCashFlow.agentCode, agentCode));
  let superTeamTotal = 0;
  let personalTotal = 0;
  for (const record of records) {
    superTeamTotal += parseFloat(String(record.superTeamCashFlow || 0));
    personalTotal += parseFloat(String(record.personalCashFlow || 0));
  }
  return { superTeamTotal, personalTotal };
}
var _getDb4;
var init_dashboard = __esm({
  "server/repositories/dashboard.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/repositories/syncLogs.ts
import { eq as eq5, and as and4, desc as desc2, sql as sql3 } from "drizzle-orm";
function initSyncLogsRepository(getDb3) {
  _getDb5 = getDb3;
}
async function createScheduledSyncLog(data) {
  const db = await _getDb5();
  if (!db) throw new Error("Database not available");
  logger.info("Creating sync log", { syncType: data.syncType });
  const result = await db.insert(syncLogs).values({
    syncType: data.syncType,
    scheduledTime: data.scheduledTime,
    status: data.status || "RUNNING",
    startedAt: data.startedAt || /* @__PURE__ */ new Date()
  });
  const insertId = Number(result[0].insertId);
  const [syncLog] = await db.select().from(syncLogs).where(eq5(syncLogs.id, insertId));
  return syncLog;
}
async function updateScheduledSyncLog(id, data) {
  const db = await _getDb5();
  if (!db) throw new Error("Database not available");
  logger.info("Updating sync log", { syncLogId: id, status: data.status });
  const completedAt = /* @__PURE__ */ new Date();
  const startedAt = await db.select({ startedAt: syncLogs.startedAt }).from(syncLogs).where(eq5(syncLogs.id, id)).limit(1);
  const durationSeconds = startedAt[0]?.startedAt ? Math.round((completedAt.getTime() - startedAt[0].startedAt.getTime()) / 1e3) : 0;
  return db.update(syncLogs).set({
    status: data.status,
    completedAt,
    durationSeconds,
    agentsProcessed: data.agentsProcessed,
    agentsUpdated: data.agentsUpdated,
    agentsCreated: data.agentsCreated,
    contactsUpdated: data.contactsUpdated,
    errorsCount: data.errorsCount,
    errorMessages: data.errorMessages,
    summary: data.summary
  }).where(eq5(syncLogs.id, id));
}
async function getRecentScheduledSyncLogs(limit = 20) {
  const db = await _getDb5();
  if (!db) return [];
  logger.debug("Fetching recent sync logs", { limit });
  return db.select().from(syncLogs).orderBy(desc2(syncLogs.createdAt)).limit(limit);
}
async function getScheduledSyncLogsByPeriod(startDate, endDate) {
  const db = await _getDb5();
  if (!db) return [];
  logger.debug("Fetching sync logs by period", { startDate, endDate });
  return db.select().from(syncLogs).where(sql3`${syncLogs.createdAt} >= ${startDate} AND ${syncLogs.createdAt} <= ${endDate}`).orderBy(desc2(syncLogs.createdAt));
}
async function getWeeklySyncSummary() {
  const db = await _getDb5();
  if (!db) {
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      partialSyncs: 0,
      totalAgentsProcessed: 0,
      totalAgentsUpdated: 0,
      totalContactsUpdated: 0,
      totalErrors: 0,
      averageDuration: 0,
      syncsByTime: [],
      recentLogs: []
    };
  }
  const sevenDaysAgo = /* @__PURE__ */ new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const logs = await db.select().from(syncLogs).where(sql3`${syncLogs.createdAt} >= ${sevenDaysAgo}`).orderBy(desc2(syncLogs.createdAt));
  const successfulSyncs = logs.filter((l) => l.status === "SUCCESS").length;
  const failedSyncs = logs.filter((l) => l.status === "FAILED").length;
  const partialSyncs = logs.filter((l) => l.status === "PARTIAL").length;
  const totalAgentsProcessed = logs.reduce((sum2, l) => sum2 + (l.agentsProcessed || 0), 0);
  const totalAgentsUpdated = logs.reduce((sum2, l) => sum2 + (l.agentsUpdated || 0), 0);
  const totalContactsUpdated = logs.reduce((sum2, l) => sum2 + (l.contactsUpdated || 0), 0);
  const totalErrors = logs.reduce((sum2, l) => sum2 + (l.errorsCount || 0), 0);
  const completedLogs = logs.filter((l) => l.durationSeconds);
  const averageDuration = completedLogs.length > 0 ? Math.round(completedLogs.reduce((sum2, l) => sum2 + (l.durationSeconds || 0), 0) / completedLogs.length) : 0;
  const syncsByTime = [
    {
      time: "3:30 PM",
      success: logs.filter((l) => l.scheduledTime === "3:30 PM" && l.status === "SUCCESS").length,
      failed: logs.filter((l) => l.scheduledTime === "3:30 PM" && l.status !== "SUCCESS").length
    },
    {
      time: "6:30 PM",
      success: logs.filter((l) => l.scheduledTime === "6:30 PM" && l.status === "SUCCESS").length,
      failed: logs.filter((l) => l.scheduledTime === "6:30 PM" && l.status !== "SUCCESS").length
    }
  ];
  return {
    totalSyncs: logs.length,
    successfulSyncs,
    failedSyncs,
    partialSyncs,
    totalAgentsProcessed,
    totalAgentsUpdated,
    totalContactsUpdated,
    totalErrors,
    averageDuration,
    syncsByTime,
    recentLogs: logs.slice(0, 10)
  };
}
async function getScheduledSyncLogs(options) {
  const db = await _getDb5();
  if (!db) {
    return { logs: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const conditions = [];
  if (options.status) conditions.push(eq5(syncLogs.status, options.status));
  if (options.syncType) conditions.push(eq5(syncLogs.syncType, options.syncType));
  if (options.scheduledTime) conditions.push(eq5(syncLogs.scheduledTime, options.scheduledTime));
  if (options.startDate) conditions.push(sql3`${syncLogs.createdAt} >= ${options.startDate}`);
  if (options.endDate) conditions.push(sql3`${syncLogs.createdAt} <= ${options.endDate}`);
  const whereClause = conditions.length > 0 ? and4(...conditions) : void 0;
  const countResult = await db.select({ count: sql3`COUNT(*)` }).from(syncLogs).where(whereClause);
  const total = Number(countResult[0]?.count || 0);
  const logs = await db.select().from(syncLogs).where(whereClause).orderBy(desc2(syncLogs.createdAt)).limit(pageSize).offset(offset);
  return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
async function getLatestScheduledSyncLog() {
  const db = await _getDb5();
  if (!db) return null;
  const [log2] = await db.select().from(syncLogs).orderBy(desc2(syncLogs.createdAt)).limit(1);
  return log2 || null;
}
async function getTodaySyncLogs() {
  const db = await _getDb5();
  if (!db) return [];
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return db.select().from(syncLogs).where(sql3`${syncLogs.createdAt} >= ${today} AND ${syncLogs.createdAt} < ${tomorrow}`).orderBy(desc2(syncLogs.createdAt));
}
var _getDb5;
var init_syncLogs = __esm({
  "server/repositories/syncLogs.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/repositories/policies.ts
import { eq as eq6, desc as desc3 } from "drizzle-orm";
function initPoliciesRepository(getDb3) {
  _getDb6 = getDb3;
}
async function getPendingPolicies(filters) {
  const db = await _getDb6();
  if (!db) return [];
  logger.debug("Fetching pending policies", { filters });
  let query = db.select().from(pendingPolicies);
  if (filters?.status) {
    query = query.where(eq6(pendingPolicies.status, filters.status));
  }
  if (filters?.agentCode) {
    query = query.where(eq6(pendingPolicies.agentCode, filters.agentCode));
  }
  return query.orderBy(desc3(pendingPolicies.updatedAt));
}
async function getPendingPolicyByNumber(policyNumber) {
  const db = await _getDb6();
  if (!db) return null;
  const result = await db.select().from(pendingPolicies).where(eq6(pendingPolicies.policyNumber, policyNumber)).limit(1);
  return result[0] || null;
}
async function upsertPendingPolicy(data) {
  const db = await _getDb6();
  if (!db) throw new Error("Database not available");
  logger.info("Upserting pending policy", { policyNumber: data.policyNumber });
  const existing = await getPendingPolicyByNumber(data.policyNumber);
  if (existing) {
    await db.update(pendingPolicies).set({ ...data, lastSyncedAt: /* @__PURE__ */ new Date() }).where(eq6(pendingPolicies.policyNumber, data.policyNumber));
    return getPendingPolicyByNumber(data.policyNumber);
  } else {
    const result = await db.insert(pendingPolicies).values({ ...data, lastSyncedAt: /* @__PURE__ */ new Date() });
    const insertId = result[0]?.insertId;
    if (!insertId) throw new Error("Failed to insert pending policy");
    const created = await db.select().from(pendingPolicies).where(eq6(pendingPolicies.id, insertId)).limit(1);
    return created[0];
  }
}
async function getPendingRequirementsByPolicyId(policyId) {
  const db = await _getDb6();
  if (!db) return [];
  return db.select().from(pendingRequirements).where(eq6(pendingRequirements.policyId, policyId));
}
async function clearPendingRequirements(policyId) {
  const db = await _getDb6();
  if (!db) throw new Error("Database not available");
  await db.delete(pendingRequirements).where(eq6(pendingRequirements.policyId, policyId));
}
async function insertPendingRequirement(data) {
  const db = await _getDb6();
  if (!db) throw new Error("Database not available");
  return db.insert(pendingRequirements).values(data);
}
async function bulkInsertPendingRequirements(requirements) {
  const db = await _getDb6();
  if (!db) throw new Error("Database not available");
  if (requirements.length === 0) return;
  return db.insert(pendingRequirements).values(requirements);
}
async function getPendingPoliciesWithRequirements() {
  const db = await _getDb6();
  if (!db) return [];
  const policies = await db.select().from(pendingPolicies).orderBy(desc3(pendingPolicies.updatedAt));
  const policiesWithRequirements = await Promise.all(
    policies.map(async (policy) => {
      const requirements = await getPendingRequirementsByPolicyId(policy.id);
      return {
        ...policy,
        requirements: {
          pendingWithProducer: requirements.filter((r) => r.category === "Pending with Producer"),
          pendingWithTransamerica: requirements.filter((r) => r.category === "Pending with Transamerica"),
          completed: requirements.filter((r) => r.category === "Completed")
        }
      };
    })
  );
  return policiesWithRequirements;
}
async function getPendingPolicySummary() {
  const db = await _getDb6();
  if (!db) return { total: 0, byStatus: {}, totalPendingRequirements: 0 };
  const policies = await db.select().from(pendingPolicies);
  const requirements = await db.select().from(pendingRequirements);
  const byStatus = {};
  policies.forEach((p) => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });
  const pendingWithProducerCount = requirements.filter((r) => r.category === "Pending with Producer").length;
  const pendingWithTransamericaCount = requirements.filter((r) => r.category === "Pending with Transamerica").length;
  return {
    total: policies.length,
    byStatus,
    totalPendingRequirements: pendingWithProducerCount + pendingWithTransamericaCount,
    pendingWithProducerCount,
    pendingWithTransamericaCount
  };
}
async function getInforcePolicies(filters) {
  const db = await _getDb6();
  if (!db) return [];
  logger.debug("Fetching inforce policies", { filters });
  let query = db.select().from(inforcePolicies);
  if (filters?.status) {
    query = query.where(eq6(inforcePolicies.status, filters.status));
  }
  if (filters?.agentId) {
    query = query.where(eq6(inforcePolicies.agentId, filters.agentId));
  }
  return query.orderBy(desc3(inforcePolicies.updatedAt));
}
async function getInforcePolicyByNumber(policyNumber) {
  const db = await _getDb6();
  if (!db) return null;
  const result = await db.select().from(inforcePolicies).where(eq6(inforcePolicies.policyNumber, policyNumber)).limit(1);
  return result[0] || null;
}
async function upsertInforcePolicy(data) {
  const db = await _getDb6();
  if (!db) throw new Error("Database not available");
  logger.info("Upserting inforce policy", { policyNumber: data.policyNumber });
  const existing = await getInforcePolicyByNumber(data.policyNumber);
  if (existing) {
    await db.update(inforcePolicies).set({ ...data, lastSyncedAt: /* @__PURE__ */ new Date() }).where(eq6(inforcePolicies.policyNumber, data.policyNumber));
    return getInforcePolicyByNumber(data.policyNumber);
  } else {
    const result = await db.insert(inforcePolicies).values({ ...data, lastSyncedAt: /* @__PURE__ */ new Date() });
    const insertId = result[0]?.insertId;
    if (!insertId) throw new Error("Failed to insert inforce policy");
    const created = await db.select().from(inforcePolicies).where(eq6(inforcePolicies.id, insertId)).limit(1);
    return created[0];
  }
}
async function getProductionSummary() {
  const db = await _getDb6();
  if (!db) return {
    totalPolicies: 0,
    activePolicies: 0,
    totalPremium: 0,
    totalCommission: 0,
    totalFaceAmount: 0,
    byStatus: {}
  };
  const policies = await db.select().from(inforcePolicies);
  const activePolicies = policies.filter((p) => p.status === "Active");
  const totalPremium = policies.reduce((sum2, p) => sum2 + parseFloat(p.premium?.toString() || "0"), 0);
  const totalCommission = policies.reduce((sum2, p) => sum2 + parseFloat(p.calculatedCommission?.toString() || "0"), 0);
  const totalFaceAmount = policies.reduce((sum2, p) => sum2 + parseFloat(p.faceAmount?.toString() || "0"), 0);
  const byStatus = {};
  policies.forEach((p) => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });
  return { totalPolicies: policies.length, activePolicies: activePolicies.length, totalPremium, totalCommission, totalFaceAmount, byStatus };
}
async function getTopProducersByPremium(limit = 10) {
  const db = await _getDb6();
  if (!db) return [];
  const policies = await db.select().from(inforcePolicies).where(eq6(inforcePolicies.status, "Active"));
  const producerMap = /* @__PURE__ */ new Map();
  for (const policy of policies) {
    const name = policy.ownerName;
    const existing = producerMap.get(name) || { name, totalPremium: 0, totalCommission: 0, policyCount: 0, totalFaceAmount: 0 };
    existing.totalPremium += parseFloat(policy.premium?.toString() || "0");
    existing.totalCommission += parseFloat(policy.calculatedCommission?.toString() || "0");
    existing.totalFaceAmount += parseFloat(policy.faceAmount?.toString() || "0");
    existing.policyCount += 1;
    producerMap.set(name, existing);
  }
  return Array.from(producerMap.values()).sort((a, b) => b.totalPremium - a.totalPremium).slice(0, limit);
}
async function getProductionByWritingAgent() {
  const db = await _getDb6();
  if (!db) return [];
  const policies = await db.select().from(inforcePolicies).where(eq6(inforcePolicies.status, "Active"));
  const agentMap = /* @__PURE__ */ new Map();
  for (const policy of policies) {
    const name = policy.writingAgentName || "Unknown";
    const existing = agentMap.get(name) || { name, totalPremium: 0, totalCommission: 0, policyCount: 0 };
    existing.totalPremium += parseFloat(policy.premium?.toString() || "0");
    existing.totalCommission += parseFloat(policy.calculatedCommission?.toString() || "0");
    existing.policyCount += 1;
    agentMap.set(name, existing);
  }
  return Array.from(agentMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);
}
async function getTopAgentsByCommission(limit = 10) {
  const db = await _getDb6();
  if (!db) return [];
  const policies = await db.select().from(inforcePolicies).where(eq6(inforcePolicies.status, "Active"));
  const agentMap = /* @__PURE__ */ new Map();
  for (const policy of policies) {
    const targetPremium = parseFloat(policy.targetPremium?.toString() || policy.premium?.toString() || "0");
    const multiplier = 1.25;
    const primaryName = policy.writingAgentName || "Unknown";
    const primaryCode = policy.writingAgentCode || "";
    const primarySplit = Number(policy.writingAgentSplit) || 100;
    const primaryLevel = Number(policy.writingAgentLevel) || 55;
    const primaryCommission = targetPremium * multiplier * (primaryLevel / 100) * (primarySplit / 100);
    const existingPrimary = agentMap.get(primaryName) || {
      name: primaryName,
      agentCode: primaryCode,
      totalCommission: 0,
      totalPremium: 0,
      policyCount: 0,
      totalFaceAmount: 0,
      avgCommissionLevel: 0,
      commissionLevelSum: 0
    };
    existingPrimary.totalCommission += primaryCommission;
    existingPrimary.totalPremium += targetPremium * (primarySplit / 100);
    existingPrimary.totalFaceAmount += parseFloat(policy.faceAmount?.toString() || "0");
    existingPrimary.policyCount += 1;
    existingPrimary.commissionLevelSum += Number(primaryLevel);
    existingPrimary.avgCommissionLevel = existingPrimary.commissionLevelSum / existingPrimary.policyCount;
    if (!existingPrimary.agentCode && primaryCode) {
      existingPrimary.agentCode = primaryCode;
    }
    agentMap.set(primaryName, existingPrimary);
    if (policy.secondAgentName && policy.secondAgentSplit && Number(policy.secondAgentSplit) > 0) {
      const secondaryName = policy.secondAgentName;
      const secondaryCode = policy.secondAgentCode || "";
      const secondarySplit = Number(policy.secondAgentSplit);
      const secondaryLevel = Number(policy.secondAgentLevel) || 25;
      const secondaryCommission = targetPremium * multiplier * (secondaryLevel / 100) * (secondarySplit / 100);
      const existingSecondary = agentMap.get(secondaryName) || {
        name: secondaryName,
        agentCode: secondaryCode,
        totalCommission: 0,
        totalPremium: 0,
        policyCount: 0,
        totalFaceAmount: 0,
        avgCommissionLevel: 0,
        commissionLevelSum: 0
      };
      existingSecondary.totalCommission += secondaryCommission;
      existingSecondary.totalPremium += targetPremium * (secondarySplit / 100);
      existingSecondary.policyCount += 1;
      existingSecondary.commissionLevelSum += Number(secondaryLevel);
      existingSecondary.avgCommissionLevel = existingSecondary.commissionLevelSum / existingSecondary.policyCount;
      if (!existingSecondary.agentCode && secondaryCode) {
        existingSecondary.agentCode = secondaryCode;
      }
      agentMap.set(secondaryName, existingSecondary);
    }
  }
  return Array.from(agentMap.values()).sort((a, b) => b.totalCommission - a.totalCommission).slice(0, limit);
}
var _getDb6;
var init_policies = __esm({
  "server/repositories/policies.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/repositories/income.ts
import { eq as eq7, and as and5, sql as sql5 } from "drizzle-orm";
function initIncomeRepository(getDb3, getDashboardMetrics2) {
  _getDb7 = getDb3;
  _getDashboardMetrics = getDashboardMetrics2;
}
async function saveIncomeSnapshot() {
  const db = await _getDb7();
  if (!db) return null;
  try {
    const metrics = await _getDashboardMetrics();
    const projectedIncome = metrics.projectedIncome;
    if (!projectedIncome) {
      logger.warn("[saveIncomeSnapshot] No projected income data available");
      return null;
    }
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const existingSnapshot = await db.select().from(incomeHistory).where(and5(
      sql5`${incomeHistory.snapshotDate} >= ${today}`,
      sql5`${incomeHistory.snapshotDate} < ${tomorrow}`
    )).limit(1);
    const snapshotData = {
      snapshotDate: /* @__PURE__ */ new Date(),
      projectedTotal: projectedIncome.totalProjected.toString(),
      projectedFromPending: projectedIncome.fromPendingPolicies.toString(),
      projectedFromInforce: projectedIncome.fromInforcePolicies.toString(),
      projectedPendingIssued: projectedIncome.breakdown.pendingIssued.toString(),
      projectedPendingUnderwriting: projectedIncome.breakdown.pendingUnderwriting.toString(),
      projectedInforceActive: projectedIncome.breakdown.inforceActive.toString(),
      pendingPoliciesCount: projectedIncome.pendingPoliciesCount,
      inforcePoliciesCount: projectedIncome.inforcePoliciesCount,
      agentLevel: projectedIncome.agentLevel.toString(),
      transamericaConstant: projectedIncome.transamericaConstant.toString()
    };
    if (existingSnapshot.length > 0) {
      await db.update(incomeHistory).set(snapshotData).where(eq7(incomeHistory.id, existingSnapshot[0].id));
      return existingSnapshot[0].id;
    } else {
      const result = await db.insert(incomeHistory).values(snapshotData);
      return result[0]?.insertId;
    }
  } catch (error) {
    logger.error("[saveIncomeSnapshot] Error", error instanceof Error ? error : void 0);
    return null;
  }
}
async function updateActualIncome(date2, actualIncome, source) {
  const db = await _getDb7();
  if (!db) return false;
  try {
    const startOfDay = new Date(date2);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    await db.update(incomeHistory).set({
      actualIncome: actualIncome.toString(),
      actualIncomeSource: source,
      actualIncomeUpdatedAt: /* @__PURE__ */ new Date()
    }).where(and5(
      sql5`${incomeHistory.snapshotDate} >= ${startOfDay}`,
      sql5`${incomeHistory.snapshotDate} < ${endOfDay}`
    ));
    return true;
  } catch (error) {
    logger.error("[updateActualIncome] Error", error instanceof Error ? error : void 0);
    return false;
  }
}
async function getIncomeHistory(period = "month") {
  const db = await _getDb7();
  if (!db) return [];
  try {
    const now = /* @__PURE__ */ new Date();
    let startDate;
    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
        break;
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1e3);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3);
        break;
    }
    const history = await db.select().from(incomeHistory).where(sql5`${incomeHistory.snapshotDate} >= ${startDate}`).orderBy(incomeHistory.snapshotDate);
    return history.map((h) => ({
      date: h.snapshotDate,
      projectedTotal: parseFloat(h.projectedTotal?.toString() || "0"),
      projectedFromPending: parseFloat(h.projectedFromPending?.toString() || "0"),
      projectedFromInforce: parseFloat(h.projectedFromInforce?.toString() || "0"),
      actualIncome: parseFloat(h.actualIncome?.toString() || "0"),
      pendingPoliciesCount: h.pendingPoliciesCount || 0,
      inforcePoliciesCount: h.inforcePoliciesCount || 0,
      accuracy: h.actualIncome && parseFloat(h.actualIncome.toString()) > 0 ? Math.round(parseFloat(h.actualIncome.toString()) / parseFloat(h.projectedTotal?.toString() || "1") * 100) : null
    }));
  } catch (error) {
    logger.error("[getIncomeHistory] Error", error instanceof Error ? error : void 0);
    return [];
  }
}
async function getIncomeAccuracyStats() {
  const db = await _getDb7();
  if (!db) return null;
  try {
    const history = await db.select().from(incomeHistory).where(sql5`${incomeHistory.actualIncome} > 0`);
    if (history.length === 0) {
      return {
        totalSnapshots: 0,
        snapshotsWithActual: 0,
        averageAccuracy: null,
        totalProjected: 0,
        totalActual: 0
      };
    }
    let totalProjected = 0;
    let totalActual = 0;
    let accuracySum = 0;
    for (const h of history) {
      const projected = parseFloat(h.projectedTotal?.toString() || "0");
      const actual = parseFloat(h.actualIncome?.toString() || "0");
      totalProjected += projected;
      totalActual += actual;
      if (projected > 0) {
        accuracySum += actual / projected * 100;
      }
    }
    const allSnapshots = await db.select({ count: sql5`COUNT(*)` }).from(incomeHistory);
    return {
      totalSnapshots: allSnapshots[0]?.count || 0,
      snapshotsWithActual: history.length,
      averageAccuracy: Math.round(accuracySum / history.length),
      totalProjected: Math.round(totalProjected * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100
    };
  } catch (error) {
    logger.error("[getIncomeAccuracyStats] Error", error instanceof Error ? error : void 0);
    return null;
  }
}
var _getDb7, _getDashboardMetrics;
var init_income = __esm({
  "server/repositories/income.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/repositories/goals.ts
import { eq as eq8, and as and6, desc as desc5 } from "drizzle-orm";
function initGoalsRepository(getDb3) {
  _getDb8 = getDb3;
}
async function getGoals(userId, filters) {
  const db = await _getDb8();
  if (!db) return [];
  logger.debug("Fetching goals", { userId, filters });
  let query = db.select().from(goals).where(eq8(goals.userId, userId));
  const allGoals = await query.orderBy(goals.sortOrder, desc5(goals.updatedAt));
  let filtered = allGoals;
  if (filters?.periodYear) {
    filtered = filtered.filter((g) => g.periodYear === filters.periodYear);
  }
  if (filters?.periodMonth) {
    filtered = filtered.filter((g) => g.periodMonth === filters.periodMonth);
  }
  if (filters?.periodQuarter) {
    filtered = filtered.filter((g) => g.periodQuarter === filters.periodQuarter);
  }
  if (filters?.status) {
    filtered = filtered.filter((g) => g.status === filters.status);
  }
  return filtered;
}
async function getGoalById(id) {
  const db = await _getDb8();
  if (!db) return null;
  const result = await db.select().from(goals).where(eq8(goals.id, id));
  return result[0] || null;
}
async function createGoal(data) {
  const db = await _getDb8();
  if (!db) throw new Error("Database not available");
  logger.info("Creating goal", { title: data.title, metricKey: data.metricKey });
  const result = await db.insert(goals).values(data);
  const insertId = result[0].insertId;
  return getGoalById(insertId);
}
async function updateGoal(id, data) {
  const db = await _getDb8();
  if (!db) throw new Error("Database not available");
  logger.info("Updating goal", { id, ...data });
  await db.update(goals).set(data).where(eq8(goals.id, id));
  return getGoalById(id);
}
async function updateGoalProgress(id, currentValue) {
  const db = await _getDb8();
  if (!db) throw new Error("Database not available");
  logger.info("Updating goal progress", { id, currentValue });
  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");
  const target = parseFloat(String(goal.targetValue));
  const current = parseFloat(currentValue);
  const updates = { currentValue };
  if (current >= target && goal.status === "ACTIVE") {
    updates.status = "COMPLETED";
    updates.completedAt = /* @__PURE__ */ new Date();
  }
  await db.update(goals).set(updates).where(eq8(goals.id, id));
  return getGoalById(id);
}
async function deleteGoal(id) {
  const db = await _getDb8();
  if (!db) throw new Error("Database not available");
  logger.info("Deleting goal", { id });
  await db.delete(goals).where(eq8(goals.id, id));
  return { success: true };
}
async function getActiveGoals(userId) {
  const db = await _getDb8();
  if (!db) return [];
  const now = /* @__PURE__ */ new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil(currentMonth / 3);
  const allGoals = await db.select().from(goals).where(and6(eq8(goals.userId, userId), eq8(goals.status, "ACTIVE"))).orderBy(goals.sortOrder);
  return allGoals.filter((g) => {
    if (g.periodYear !== currentYear) return false;
    if (g.periodType === "MONTHLY" && g.periodMonth !== currentMonth) return false;
    if (g.periodType === "QUARTERLY" && g.periodQuarter !== currentQuarter) return false;
    return true;
  });
}
async function archiveExpiredGoals(userId) {
  const db = await _getDb8();
  if (!db) return;
  const now = /* @__PURE__ */ new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const activeGoals = await db.select().from(goals).where(and6(eq8(goals.userId, userId), eq8(goals.status, "ACTIVE")));
  for (const goal of activeGoals) {
    let isExpired = false;
    if (goal.periodType === "MONTHLY") {
      if (goal.periodYear < currentYear || goal.periodYear === currentYear && (goal.periodMonth || 0) < currentMonth) {
        isExpired = true;
      }
    } else if (goal.periodType === "QUARTERLY") {
      const currentQuarter = Math.ceil(currentMonth / 3);
      if (goal.periodYear < currentYear || goal.periodYear === currentYear && (goal.periodQuarter || 0) < currentQuarter) {
        isExpired = true;
      }
    } else if (goal.periodType === "YEARLY") {
      if (goal.periodYear < currentYear) {
        isExpired = true;
      }
    }
    if (isExpired) {
      const current = parseFloat(String(goal.currentValue));
      const target = parseFloat(String(goal.targetValue));
      const newStatus = current >= target ? "COMPLETED" : "MISSED";
      await db.update(goals).set({ status: newStatus }).where(eq8(goals.id, goal.id));
    }
  }
}
var _getDb8;
var init_goals = __esm({
  "server/repositories/goals.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/repositories/index.ts
var init_repositories = __esm({
  "server/repositories/index.ts"() {
    "use strict";
    init_agents();
    init_clients();
    init_tasks();
    init_dashboard();
    init_syncLogs();
    init_policies();
    init_income();
    init_goals();
  }
});

// server/repositories/syncRuns.ts
import { eq as eq9, desc as desc6, and as and7, gte as gte2, lte as lte2, sql as sql6 } from "drizzle-orm";
function initSyncRunsRepository(getDb3) {
  _getDb9 = getDb3;
}
function getDb() {
  if (!_getDb9) {
    throw new Error("SyncRuns repository not initialized. Call initSyncRunsRepository first.");
  }
  return _getDb9();
}
async function createSyncRun(data) {
  const db = await getDb();
  if (!db) return;
  await db.insert(syncRuns).values({
    id: data.id,
    jobName: data.jobName,
    status: "running",
    triggeredBy: data.triggeredBy ?? "unknown"
  });
}
async function finishSyncRun(data) {
  const db = await getDb();
  if (!db) return;
  await db.update(syncRuns).set({
    status: data.status,
    finishedAt: /* @__PURE__ */ new Date(),
    durationMs: data.durationMs,
    errorSummary: data.errorSummary,
    metrics: data.metrics,
    artifactsPath: data.artifactsPath
  }).where(eq9(syncRuns.id, data.id));
}
async function getAllRecentSyncRuns(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(syncRuns).orderBy(desc6(syncRuns.startedAt)).limit(limit);
}
var _getDb9;
var init_syncRuns = __esm({
  "server/repositories/syncRuns.ts"() {
    "use strict";
    init_schema();
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  archiveExpiredGoals: () => archiveExpiredGoals,
  bulkInsertPendingRequirements: () => bulkInsertPendingRequirements,
  bulkUpsertCashFlowRecords: () => bulkUpsertCashFlowRecords,
  bulkUpsertMonthlyTeamCashFlow: () => bulkUpsertMonthlyTeamCashFlow,
  clearAllCashFlowRecords: () => clearAllCashFlowRecords,
  clearPendingRequirements: () => clearPendingRequirements,
  closeDb: () => closeDb,
  completeTask: () => completeTask,
  createAgent: () => createAgent,
  createClient: () => createClient,
  createGoal: () => createGoal,
  createOrUpdateCredential: () => createOrUpdateCredential,
  createProductionRecord: () => createProductionRecord,
  createScheduledSyncLog: () => createScheduledSyncLog,
  createSyncLog: () => createSyncLog,
  createWorkflowTask: () => createWorkflowTask,
  deleteGoal: () => deleteGoal,
  getActiveGoals: () => getActiveGoals,
  getAgentById: () => getAgentById,
  getAgentCashFlowHistory: () => getAgentCashFlowHistory,
  getAgentContactInfo: () => getAgentContactInfo,
  getAgentStats: () => getAgentStats,
  getAgents: () => getAgents,
  getAllCashFlowRecords: () => getAllCashFlowRecords,
  getAllProductionRecords: () => getAllProductionRecords,
  getAllUsers: () => getAllUsers,
  getAnniversarySummary: () => getAnniversarySummary,
  getCashFlowTotals: () => getCashFlowTotals,
  getClientById: () => getClientById,
  getClientEmailByName: () => getClientEmailByName,
  getClients: () => getClients,
  getCredentialsByUserId: () => getCredentialsByUserId,
  getDashboardMetrics: () => getDashboardMetrics,
  getDb: () => getDb2,
  getGoalById: () => getGoalById,
  getGoals: () => getGoals,
  getIncomeAccuracyStats: () => getIncomeAccuracyStats,
  getIncomeHistory: () => getIncomeHistory,
  getInforcePolicies: () => getInforcePolicies,
  getInforcePolicyByNumber: () => getInforcePolicyByNumber,
  getLatestScheduledSyncLog: () => getLatestScheduledSyncLog,
  getLatestSyncLog: () => getLatestSyncLog,
  getMonthOverMonthComparison: () => getMonthOverMonthComparison,
  getMonthlyTeamCashFlow: () => getMonthlyTeamCashFlow,
  getNetLicensedAgents: () => getNetLicensedAgents,
  getPendingPolicies: () => getPendingPolicies,
  getPendingPoliciesWithRequirements: () => getPendingPoliciesWithRequirements,
  getPendingPolicyByNumber: () => getPendingPolicyByNumber,
  getPendingPolicySummary: () => getPendingPolicySummary,
  getPendingRequirementsByPolicyId: () => getPendingRequirementsByPolicyId,
  getPoliciesWithAnniversaryInDays: () => getPoliciesWithAnniversaryInDays,
  getPoliciesWithAnniversaryToday: () => getPoliciesWithAnniversaryToday,
  getPolicyAnniversaries: () => getPolicyAnniversaries,
  getProductionByWritingAgent: () => getProductionByWritingAgent,
  getProductionRecords: () => getProductionRecords,
  getProductionStats: () => getProductionStats,
  getProductionSummary: () => getProductionSummary,
  getRecentScheduledSyncLogs: () => getRecentScheduledSyncLogs,
  getScheduledSyncLogs: () => getScheduledSyncLogs,
  getScheduledSyncLogsByPeriod: () => getScheduledSyncLogsByPeriod,
  getTaskById: () => getTaskById,
  getTaskStats: () => getTaskStats,
  getTodaySyncLogs: () => getTodaySyncLogs,
  getTopAgentsByCommission: () => getTopAgentsByCommission,
  getTopProducersByPremium: () => getTopProducersByPremium,
  getUserByOpenId: () => getUserByOpenId,
  getWeeklySyncSummary: () => getWeeklySyncSummary,
  getWorkflowTasks: () => getWorkflowTasks,
  hasAnniversaryGreetingBeenSent: () => hasAnniversaryGreetingBeenSent,
  insertPendingRequirement: () => insertPendingRequirement,
  recordAnniversaryGreetingSent: () => recordAnniversaryGreetingSent,
  saveIncomeSnapshot: () => saveIncomeSnapshot,
  updateActualIncome: () => updateActualIncome,
  updateAgent: () => updateAgent,
  updateClient: () => updateClient,
  updateGoal: () => updateGoal,
  updateGoalProgress: () => updateGoalProgress,
  updateScheduledSyncLog: () => updateScheduledSyncLog,
  updateWorkflowTask: () => updateWorkflowTask,
  upsertCashFlowRecord: () => upsertCashFlowRecord,
  upsertInforcePolicy: () => upsertInforcePolicy,
  upsertMonthlyTeamCashFlow: () => upsertMonthlyTeamCashFlow,
  upsertPendingPolicy: () => upsertPendingPolicy,
  upsertUser: () => upsertUser
});
import { eq as eq10, and as and8, desc as desc7, sql as sql7 } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
function initializeRepositories() {
  if (_repositoriesInitialized) return;
  _repositoriesInitialized = true;
  initAgentsRepository(getDb2);
  initClientsRepository(getDb2);
  initTasksRepository(getDb2);
  initDashboardRepository(getDb2);
  initSyncLogsRepository(getDb2);
  initPoliciesRepository(getDb2);
  initIncomeRepository(getDb2, getDashboardMetrics);
  initSyncRunsRepository(getDb2);
  initGoalsRepository(getDb2);
}
async function getDb2() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (ENV.isProduction) {
      throw new Error("DATABASE_URL is required in production");
    }
    console.warn("[Database] DATABASE_URL not set \u2014 DB unavailable");
    return null;
  }
  try {
    _pool = mysql.createPool(url);
    _db = drizzle(_pool);
    return _db;
  } catch (error) {
    console.error("[Database] Failed to create pool:", error);
    if (ENV.isProduction) {
      throw error;
    }
    return null;
  }
}
async function closeDb() {
  await _pool?.end();
  _pool = null;
  _db = null;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb2();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = { openId: user.openId };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb2();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq10(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllUsers() {
  const db = await getDb2();
  if (!db) return [];
  return db.select().from(users);
}
async function getProductionRecords(agentId) {
  const db = await getDb2();
  if (!db) return [];
  return db.select().from(productionRecords).where(eq10(productionRecords.agentId, agentId));
}
async function createProductionRecord(data) {
  const db = await getDb2();
  if (!db) throw new Error("Database not available");
  return db.insert(productionRecords).values(data);
}
async function getAllProductionRecords() {
  const db = await getDb2();
  if (!db) return [];
  return db.select().from(productionRecords).orderBy(desc7(productionRecords.issueDate));
}
async function getCredentialsByUserId(userId) {
  const db = await getDb2();
  if (!db) return void 0;
  const result = await db.select().from(credentials).where(eq10(credentials.userId, userId)).limit(1);
  return result[0];
}
async function createOrUpdateCredential(data) {
  const db = await getDb2();
  if (!db) throw new Error("Database not available");
  return db.insert(credentials).values(data).onDuplicateKeyUpdate({
    set: {
      encryptedUsername: data.encryptedUsername,
      encryptedPassword: data.encryptedPassword,
      encryptedApiKey: data.encryptedApiKey,
      isActive: data.isActive,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function createSyncLog(data) {
  const db = await getDb2();
  if (!db) throw new Error("Database not available");
  return db.insert(mywfgSyncLogs).values(data);
}
async function getLatestSyncLog() {
  const db = await getDb2();
  if (!db) return null;
  const result = await db.select().from(mywfgSyncLogs).orderBy(desc7(mywfgSyncLogs.syncDate)).limit(1);
  return result[0] || null;
}
async function calculateProjectedIncome(db) {
  const SMD_AGENT_LEVEL = 0.65;
  const TRANSAMERICA_CONSTANT = 1.25;
  const defaultResult = {
    fromPendingPolicies: 0,
    fromInforcePolicies: 0,
    totalProjected: 0,
    pendingPoliciesCount: 0,
    inforcePoliciesCount: 0,
    breakdown: { pendingIssued: 0, pendingUnderwriting: 0, inforceActive: 0 },
    agentLevel: SMD_AGENT_LEVEL,
    transamericaConstant: TRANSAMERICA_CONSTANT
  };
  if (!db) return defaultResult;
  try {
    const pending = await db.select().from(pendingPolicies);
    const inforce = await db.select().from(inforcePolicies);
    const pendingIssued = pending.filter((p) => p.status === "Issued");
    const pendingUnderwriting = pending.filter((p) => ["Pending", "Post Approval Processing"].includes(p.status));
    let pendingIssuedIncome = 0;
    let pendingUnderwritingIncome = 0;
    pendingIssued.forEach((p) => {
      const targetPremium = parseFloat(p.premium?.toString() || "0");
      if (targetPremium > 0) {
        pendingIssuedIncome += targetPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL;
      } else {
        const faceAmount = parseFloat(p.faceAmount?.toString() || "0");
        const estimatedPremium = faceAmount / 1e3 * 10;
        pendingIssuedIncome += estimatedPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL;
      }
    });
    pendingUnderwriting.forEach((p) => {
      const targetPremium = parseFloat(p.premium?.toString() || "0");
      if (targetPremium > 0) {
        pendingUnderwritingIncome += targetPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL * 0.7;
      } else {
        const faceAmount = parseFloat(p.faceAmount?.toString() || "0");
        const estimatedPremium = faceAmount / 1e3 * 10;
        pendingUnderwritingIncome += estimatedPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL * 0.7;
      }
    });
    const inforceActive = inforce.filter((p) => p.status === "Active");
    const inforceCommission = inforceActive.reduce((sum2, p) => {
      return sum2 + parseFloat(p.calculatedCommission?.toString() || "0");
    }, 0);
    const fromPendingPolicies = pendingIssuedIncome + pendingUnderwritingIncome;
    return {
      fromPendingPolicies: Math.round(fromPendingPolicies * 100) / 100,
      fromInforcePolicies: Math.round(inforceCommission * 100) / 100,
      totalProjected: Math.round((fromPendingPolicies + inforceCommission) * 100) / 100,
      pendingPoliciesCount: pending.length,
      inforcePoliciesCount: inforce.length,
      breakdown: {
        pendingIssued: Math.round(pendingIssuedIncome * 100) / 100,
        pendingUnderwriting: Math.round(pendingUnderwritingIncome * 100) / 100,
        inforceActive: Math.round(inforceCommission * 100) / 100
      },
      agentLevel: SMD_AGENT_LEVEL,
      transamericaConstant: TRANSAMERICA_CONSTANT
    };
  } catch (error) {
    console.error("[calculateProjectedIncome] Error:", error);
    return defaultResult;
  }
}
async function getDashboardMetrics() {
  const db = await getDb2();
  const mywfgData = {
    superTeamCashFlow: 319570.24,
    personalCashFlow: 210864.8,
    familiesProtected: 77,
    totalPolicies: 77,
    securitiesLicensed: 0
  };
  let activeAssociates = 0;
  let licensedAgents = 0;
  if (db) {
    const agentCounts = await db.select({
      total: sql7`COUNT(*)`,
      active: sql7`SUM(CASE WHEN ${agents.isActive} = true THEN 1 ELSE 0 END)`,
      licensed: sql7`SUM(CASE WHEN ${agents.isLifeLicensed} = true AND ${agents.isActive} = true THEN 1 ELSE 0 END)`,
      inactive: sql7`SUM(CASE WHEN ${agents.isActive} = false THEN 1 ELSE 0 END)`
    }).from(agents);
    activeAssociates = Number(agentCounts[0]?.active || 0);
    licensedAgents = Number(agentCounts[0]?.licensed || 0);
  }
  let transamericaTotalFaceAmount = 0;
  let transamericaTotalPolicies = 0;
  if (db) {
    const inforceSummary = await db.select({
      totalFaceAmount: sql7`COALESCE(SUM(${inforcePolicies.faceAmount}), 0)`,
      totalPolicies: sql7`COUNT(*)`
    }).from(inforcePolicies);
    transamericaTotalFaceAmount = parseFloat(inforceSummary[0]?.totalFaceAmount || "0");
    transamericaTotalPolicies = Number(inforceSummary[0]?.totalPolicies || 0);
  }
  const transamericaData = { totalFaceAmount: transamericaTotalFaceAmount, totalPolicies: transamericaTotalPolicies };
  const transamericaAlerts = {
    totalUnreadAlerts: 39,
    reversedPremiumPayments: [
      { policyNumber: "6602249306", ownerName: "OLUWAMUYIWA ONAMUTI", alertDate: "01/01/2026", alertType: "Reversed premium payment" },
      { policyNumber: "6602037542", ownerName: "OLATUNDE OYEWANDE", alertDate: "12/27/2025", alertType: "Reversed premium payment" },
      { policyNumber: "6602103743", ownerName: "BEN WALKER", alertDate: "12/25/2025", alertType: "Reversed premium payment" }
    ],
    eftRemovals: [
      { policyNumber: "6602249306", ownerName: "OLUWAMUYIWA ONAMUTI", alertDate: "01/01/2026", alertType: "Policy removed from Electronic Funds Transfer" },
      { policyNumber: "6602122713", ownerName: "OLUWAKEMISOLA OYEWANDE", alertDate: "01/01/2026", alertType: "Policy removed from Electronic Funds Transfer" }
    ],
    lastSyncDate: "2026-01-04T23:58:00Z"
  };
  const { getNetLicensedAgents: getNetLicensedAgents2 } = await Promise.resolve().then(() => (init_agents(), agents_exports));
  const netLicensedData = await getNetLicensedAgents2();
  const complianceData = {
    missingLicenses: 11,
    notEnrolledRecurring: 15,
    complianceFirstNotice: 3,
    complianceFinalNotice: 3,
    commissionsOnHold: [
      { agentCode: "C8U78", name: "STEPHEN MONYE", balance: 45, email: "STEVEN.MONYE@GMAIL.COM" },
      { agentCode: "D3Y01", name: "Esther Aikens", balance: 45, email: "estherunba111@gmail.com" },
      { agentCode: "D3U63", name: "ESE MOSES", balance: 30.58, email: "ESEMOSES2001@GMAIL.COM" }
    ],
    firstNoticeAgents: [
      { agentCode: "D3C5U", name: "STANLEY EJIME", balance: 30, email: "EJIMSTAN@YAHOO.COM" },
      { agentCode: "D3C69", name: "JOY EJIME", balance: 30, email: "JOYEJIME@YAHOO.COM" },
      { agentCode: "E1U8L", name: "BUKOLA JUMOKE KOLAWOLE", balance: 30, email: "JUMOK2018@GMAIL.COM" }
    ]
  };
  if (!db) return {
    totalFaceAmount: transamericaData.totalFaceAmount,
    totalPolicies: mywfgData.totalPolicies + transamericaData.totalPolicies,
    familiesProtected: mywfgData.familiesProtected,
    totalClients: 0,
    superTeamCashFlow: mywfgData.superTeamCashFlow,
    personalCashFlow: mywfgData.personalCashFlow,
    activeAssociates,
    licensedAgents,
    missingLicenses: complianceData.missingLicenses,
    notEnrolledRecurring: complianceData.notEnrolledRecurring,
    complianceFirstNotice: complianceData.complianceFirstNotice,
    complianceFinalNotice: complianceData.complianceFinalNotice,
    commissionsOnHold: complianceData.commissionsOnHold,
    firstNoticeAgents: complianceData.firstNoticeAgents,
    transamericaAlerts,
    netLicensedData,
    projectedIncome: null
  };
  const faceAmountResult = await db.select({
    totalFaceAmount: sql7`COALESCE(SUM(${productionRecords.faceAmount}), 0)`,
    dbPolicies: sql7`COUNT(*)`
  }).from(productionRecords);
  const familiesResult = await db.select({
    dbFamilies: sql7`COUNT(DISTINCT CASE WHEN ${clients.householdId} IS NOT NULL THEN ${clients.householdId} ELSE ${clients.id} END)`,
    totalClients: sql7`COUNT(*)`
  }).from(clients);
  const dbPolicies = Number(faceAmountResult[0]?.dbPolicies || 0);
  const dbFamilies = Number(familiesResult[0]?.dbFamilies || 0);
  const dbFaceAmount = parseFloat(faceAmountResult[0]?.totalFaceAmount || "0");
  return {
    totalFaceAmount: transamericaData.totalFaceAmount + dbFaceAmount,
    totalPolicies: Math.max(mywfgData.totalPolicies + transamericaData.totalPolicies, dbPolicies),
    familiesProtected: Math.max(mywfgData.familiesProtected, dbFamilies),
    totalClients: Number(familiesResult[0]?.totalClients || 0),
    superTeamCashFlow: mywfgData.superTeamCashFlow,
    personalCashFlow: mywfgData.personalCashFlow,
    activeAssociates,
    licensedAgents,
    missingLicenses: complianceData.missingLicenses,
    notEnrolledRecurring: complianceData.notEnrolledRecurring,
    complianceFirstNotice: complianceData.complianceFirstNotice,
    complianceFinalNotice: complianceData.complianceFinalNotice,
    commissionsOnHold: complianceData.commissionsOnHold,
    firstNoticeAgents: complianceData.firstNoticeAgents,
    transamericaAlerts,
    netLicensedData,
    projectedIncome: await calculateProjectedIncome(db)
  };
}
async function getPolicyAnniversaries(daysAhead = 30) {
  const db = await getDb2();
  if (!db) return [];
  try {
    const policies = await db.select().from(inforcePolicies).where(eq10(inforcePolicies.status, "Active"));
    const today = /* @__PURE__ */ new Date();
    const currentYear = today.getFullYear();
    const anniversaries = policies.filter((policy) => policy.issueDate).map((policy) => {
      let issueDate;
      const issueDateStr = policy.issueDate;
      if (issueDateStr.includes("/")) {
        const [month, day, year] = issueDateStr.split("/");
        issueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        issueDate = new Date(issueDateStr);
      }
      if (isNaN(issueDate.getTime())) return null;
      let anniversaryDate = new Date(currentYear, issueDate.getMonth(), issueDate.getDate());
      if (anniversaryDate < today) {
        anniversaryDate = new Date(currentYear + 1, issueDate.getMonth(), issueDate.getDate());
      }
      const daysUntil = Math.ceil((anniversaryDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
      const policyAge = anniversaryDate.getFullYear() - issueDate.getFullYear();
      return {
        id: policy.id,
        policyNumber: policy.policyNumber,
        ownerName: policy.ownerName,
        productType: policy.productType,
        faceAmount: parseFloat(policy.faceAmount?.toString() || "0"),
        premium: parseFloat(policy.premium?.toString() || "0"),
        issueDate: issueDateStr,
        anniversaryDate: anniversaryDate.toISOString().split("T")[0],
        daysUntilAnniversary: daysUntil,
        policyAge,
        writingAgentName: policy.writingAgentName,
        writingAgentCode: policy.writingAgentCode,
        status: policy.status
      };
    }).filter((a) => a !== null && a.daysUntilAnniversary <= daysAhead).sort((a, b) => a.daysUntilAnniversary - b.daysUntilAnniversary);
    return anniversaries;
  } catch (error) {
    console.error("[getPolicyAnniversaries] Error:", error);
    return [];
  }
}
async function getAnniversarySummary() {
  const db = await getDb2();
  if (!db) return null;
  try {
    const thisWeek = await getPolicyAnniversaries(7);
    const thisMonth = await getPolicyAnniversaries(30);
    const next60Days = await getPolicyAnniversaries(60);
    const next90Days = await getPolicyAnniversaries(90);
    return {
      thisWeek: thisWeek.length,
      thisMonth: thisMonth.length,
      next60Days: next60Days.length,
      next90Days: next90Days.length,
      upcomingAnniversaries: thisMonth
    };
  } catch (error) {
    console.error("[getAnniversarySummary] Error:", error);
    return null;
  }
}
async function getPoliciesWithAnniversaryInDays(days = 7) {
  const db = await getDb2();
  if (!db) return [];
  try {
    const policies = await db.select().from(inforcePolicies).where(eq10(inforcePolicies.status, "Active"));
    const today = /* @__PURE__ */ new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    const matchingPolicies = policies.filter((policy) => policy.issueDate).filter((policy) => {
      let issueDate;
      const issueDateStr = policy.issueDate;
      if (issueDateStr.includes("/")) {
        const parts = issueDateStr.split("/");
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10) - 1;
          const day = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          issueDate = new Date(year, month, day);
        } else {
          return false;
        }
      } else {
        issueDate = new Date(issueDateStr);
      }
      if (isNaN(issueDate.getTime())) return false;
      return issueDate.getMonth() === targetMonth && issueDate.getDate() === targetDay;
    }).map((policy) => {
      let issueDate;
      const issueDateStr = policy.issueDate;
      if (issueDateStr.includes("/")) {
        const parts = issueDateStr.split("/");
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        issueDate = new Date(year, month, day);
      } else {
        issueDate = new Date(issueDateStr);
      }
      const issueYear = issueDate.getFullYear();
      const anniversaryYear = targetDate.getFullYear();
      const policyAge = anniversaryYear - issueYear;
      return {
        id: policy.id,
        policyNumber: policy.policyNumber,
        ownerName: policy.ownerName || "Unknown",
        anniversaryDate: targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        policyAge,
        faceAmount: policy.faceAmount || 0,
        premium: policy.premium || 0,
        productType: policy.productType,
        writingAgentName: policy.writingAgentName,
        writingAgentCode: policy.writingAgentCode
      };
    });
    return matchingPolicies;
  } catch (error) {
    console.error("[getPoliciesWithAnniversaryInDays] Error:", error);
    return [];
  }
}
async function getPoliciesWithAnniversaryToday() {
  const db = await getDb2();
  if (!db) return [];
  try {
    const policies = await db.select().from(inforcePolicies).where(eq10(inforcePolicies.status, "Active"));
    const today = /* @__PURE__ */ new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const currentYear = today.getFullYear();
    const todayAnniversaries = policies.filter((policy) => policy.issueDate).filter((policy) => {
      let issueDate;
      const issueDateStr = policy.issueDate;
      if (issueDateStr.includes("/")) {
        const parts = issueDateStr.split("/");
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10) - 1;
          const day = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          issueDate = new Date(year, month, day);
        } else {
          return false;
        }
      } else {
        issueDate = new Date(issueDateStr);
      }
      if (isNaN(issueDate.getTime())) return false;
      return issueDate.getMonth() === todayMonth && issueDate.getDate() === todayDay;
    }).map((policy) => {
      let issueDate;
      const issueDateStr = policy.issueDate;
      if (issueDateStr.includes("/")) {
        const parts = issueDateStr.split("/");
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        issueDate = new Date(year, month, day);
      } else {
        issueDate = new Date(issueDateStr);
      }
      const issueYear = issueDate.getFullYear();
      const policyAge = currentYear - issueYear;
      return {
        id: policy.id,
        policyNumber: policy.policyNumber,
        ownerName: policy.ownerName || "Unknown",
        policyAge,
        faceAmount: policy.faceAmount || 0,
        premium: policy.premium || 0,
        productType: policy.productType,
        writingAgentName: policy.writingAgentName,
        writingAgentCode: policy.writingAgentCode
      };
    }).filter((policy) => policy.policyAge > 0);
    return todayAnniversaries;
  } catch (error) {
    console.error("[getPoliciesWithAnniversaryToday] Error:", error);
    return [];
  }
}
async function hasAnniversaryGreetingBeenSent(policyNumber, year) {
  const db = await getDb2();
  if (!db) return false;
  try {
    const existingTask = await db.select().from(workflowTasks).where(
      and8(
        eq10(workflowTasks.taskType, "POLICY_REVIEW"),
        sql7`${workflowTasks.description} LIKE ${`%ANNIVERSARY_GREETING_SENT:${policyNumber}:${year}%`}`
      )
    ).limit(1);
    return existingTask.length > 0;
  } catch (error) {
    console.error("[hasAnniversaryGreetingBeenSent] Error:", error);
    return false;
  }
}
async function recordAnniversaryGreetingSent(policyNumber, year, clientEmail) {
  const db = await getDb2();
  if (!db) return;
  try {
    const today = /* @__PURE__ */ new Date();
    await db.insert(workflowTasks).values({
      taskType: "POLICY_REVIEW",
      dueDate: today,
      description: `ANNIVERSARY_GREETING_SENT:${policyNumber}:${year} - Automated anniversary greeting email sent to ${clientEmail}`,
      priority: "LOW",
      completedAt: today
    });
  } catch (error) {
    console.error("[recordAnniversaryGreetingSent] Error:", error);
  }
}
var _db, _pool, _repositoriesInitialized;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    init_repositories();
    init_syncRuns();
    init_goals();
    init_agents();
    init_clients();
    init_tasks();
    init_syncLogs();
    init_policies();
    init_dashboard();
    init_income();
    init_goals();
    _db = null;
    _pool = null;
    _repositoriesInitialized = false;
    initializeRepositories();
  }
});

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
var TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString2, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendNotification",
        normalizedBase
      ).toString();
    };
    validatePayload = (input) => {
      if (!isNonEmptyString2(input.title)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required."
        });
      }
      if (!isNonEmptyString2(input.content)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content is required."
        });
      }
      const title = trimValue(input.title);
      const content = trimValue(input.content);
      if (title.length > TITLE_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
        });
      }
      if (content.length > CONTENT_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
        });
      }
      return { title, content };
    };
  }
});

// server/email-alert.ts
var email_alert_exports = {};
__export(email_alert_exports, {
  alertCredentialsUsed: () => alertCredentialsUsed,
  alertOTPFetched: () => alertOTPFetched,
  alertPolicyAnniversary: () => alertPolicyAnniversary,
  alertSinglePolicyAnniversary: () => alertSinglePolicyAnniversary,
  alertSyncCompleted: () => alertSyncCompleted,
  alertSyncTriggered: () => alertSyncTriggered,
  sendBulkClientAnniversaryGreetings: () => sendBulkClientAnniversaryGreetings,
  sendClientAnniversaryGreeting: () => sendClientAnniversaryGreeting,
  sendEmailAlert: () => sendEmailAlert
});
import nodemailer from "nodemailer";
function getGmailCredentials() {
  const email = process.env.MYWFG_EMAIL;
  const appPassword = process.env.MYWFG_APP_PASSWORD;
  return {
    email: email || "",
    appPassword: appPassword || ""
  };
}
function createTransporter() {
  const credentials2 = getGmailCredentials();
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: credentials2.email,
      pass: credentials2.appPassword
    }
  });
}
async function sendEmailAlert(options) {
  const credentials2 = getGmailCredentials();
  if (!credentials2.email || !credentials2.appPassword) {
    console.error("[Email Alert] Gmail credentials not configured");
    return false;
  }
  const timestamp2 = options.timestamp || /* @__PURE__ */ new Date();
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `Wealth Builders Haven CRM <${credentials2.email}>`,
      to: "zaidshopejuwbh@gmail.com",
      subject: `[WBH CRM] ${options.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">\u{1F514} Wealth Builders Haven CRM</h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">${options.subject}</h2>
            <p style="color: #555; line-height: 1.6;">${options.message}</p>
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              <strong>Timestamp:</strong> ${timestamp2.toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "full",
        timeStyle: "long"
      })}
            </p>
            <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">
              This is an automated alert from your Wealth Builders Haven CRM system.
            </p>
          </div>
        </div>
      `,
      text: `${options.subject}

${options.message}

Timestamp: ${timestamp2.toISOString()}`
    };
    const result = await transporter.sendMail(mailOptions);
    console.log(`[Email Alert] Sent: ${options.subject} - Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email Alert] Failed to send:", errorMessage);
    return false;
  }
}
async function alertOTPFetched(platform, otp) {
  return sendEmailAlert({
    subject: `OTP Fetched for ${platform}`,
    message: `
      <p>An OTP code was automatically fetched from your email for <strong>${platform}</strong> login.</p>
      <p><strong>OTP Code:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 18px;">${otp}</code></p>
      <p><strong>Platform:</strong> ${platform}</p>
      <p>This OTP was used to complete automated login to sync your data.</p>
    `
  });
}
async function alertCredentialsUsed(platform) {
  return sendEmailAlert({
    subject: `Login Credentials Used for ${platform}`,
    message: `
      <p>Your login credentials were used to access <strong>${platform}</strong>.</p>
      <p><strong>Platform:</strong> ${platform}</p>
      <p><strong>Action:</strong> Automated login initiated</p>
      <p>If you did not trigger this login, please check your CRM settings immediately.</p>
    `
  });
}
async function alertSyncTriggered(platforms) {
  return sendEmailAlert({
    subject: "Automated Sync Triggered",
    message: `
      <p>An automated data sync has been triggered for the following platforms:</p>
      <ul>
        ${platforms.map((p) => `<li><strong>${p}</strong></li>`).join("")}
      </ul>
      <p>Your CRM data will be updated shortly.</p>
    `
  });
}
async function alertSyncCompleted(results) {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const statusColor = failCount === 0 ? "#28a745" : successCount === 0 ? "#dc3545" : "#ffc107";
  const statusText = failCount === 0 ? "All Successful" : successCount === 0 ? "All Failed" : "Partial Success";
  return sendEmailAlert({
    subject: `Sync Completed - ${statusText}`,
    message: `
      <p style="background: ${statusColor}; color: white; padding: 10px; border-radius: 4px; display: inline-block;">
        <strong>Status:</strong> ${statusText}
      </p>
      <h3>Sync Results:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f8f9fa;">
          <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Platform</th>
          <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Status</th>
          <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Details</th>
        </tr>
        ${results.map((r) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${r.platform}</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">
              <span style="color: ${r.success ? "#28a745" : "#dc3545"};">
                ${r.success ? "\u2705 Success" : "\u274C Failed"}
              </span>
            </td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${r.error || "Completed successfully"}</td>
          </tr>
        `).join("")}
      </table>
    `
  });
}
async function alertPolicyAnniversary(policies) {
  if (policies.length === 0) return true;
  const totalFaceAmount = policies.reduce((sum2, p) => sum2 + (typeof p.faceAmount === "number" ? p.faceAmount : parseFloat(String(p.faceAmount)) || 0), 0);
  return sendEmailAlert({
    subject: `\u{1F4C5} ${policies.length} Policy Anniversary Reminder${policies.length > 1 ? "s" : ""} - 7 Days Away`,
    message: `
      <p>The following ${policies.length > 1 ? "policies have anniversaries" : "policy has an anniversary"} coming up in <strong>7 days</strong>. 
      Now is a great time to reach out and schedule a policy review!</p>
      
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <strong>\u{1F4CA} Summary:</strong> ${policies.length} ${policies.length > 1 ? "policies" : "policy"} | 
        <strong>Total Face Amount:</strong> $${totalFaceAmount.toLocaleString()}
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Client</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Policy #</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Anniversary</th>
          <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Face Amount</th>
          <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Premium</th>
        </tr>
        ${policies.map((p, i) => `
          <tr style="background: ${i % 2 === 0 ? "#f8f9fa" : "white"};">
            <td style="padding: 12px; border: 1px solid #dee2e6;">
              <strong>${p.ownerName}</strong>
              ${p.writingAgentName ? `<br><span style="font-size: 11px; color: #666;">Agent: ${p.writingAgentName}</span>` : ""}
            </td>
            <td style="padding: 12px; border: 1px solid #dee2e6; font-family: monospace;">${p.policyNumber}</td>
            <td style="padding: 12px; border: 1px solid #dee2e6;">
              ${p.anniversaryDate}
              <br><span style="font-size: 11px; color: #666;">${p.policyAge} year${p.policyAge !== 1 ? "s" : ""}</span>
            </td>
            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">$${(p.faceAmount || 0).toLocaleString()}</td>
            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">$${(p.premium || 0).toLocaleString()}</td>
          </tr>
        `).join("")}
      </table>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
        <strong>\u{1F4A1} Review Tips:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Review coverage adequacy based on life changes</li>
          <li>Confirm beneficiary information is up to date</li>
          <li>Discuss additional coverage opportunities</li>
          <li>Ask for referrals to friends and family</li>
        </ul>
      </div>
      
      <p style="margin-top: 20px;">
        <a href="https://wfg-crm.manus.space/policy-anniversaries" 
           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  display: inline-block;">
          View All Anniversaries in CRM \u2192
        </a>
      </p>
    `
  });
}
async function alertSinglePolicyAnniversary(policy) {
  return alertPolicyAnniversary([policy]);
}
async function sendClientAnniversaryGreeting(client, options) {
  const credentials2 = getGmailCredentials();
  const enableTracking = options?.enableTracking !== false;
  const baseUrl = options?.baseUrl || process.env.VITE_APP_URL || "https://wfg-crm.manus.space";
  let trackingId;
  if (!credentials2.email || !credentials2.appPassword) {
    console.error("[Client Email] Gmail credentials not configured");
    return { success: false };
  }
  if (!client.email) {
    console.error("[Client Email] Client email not provided");
    return { success: false };
  }
  if (enableTracking) {
    try {
      trackingId = await createEmailTracking({
        emailType: "ANNIVERSARY_GREETING",
        recipientEmail: client.email,
        recipientName: `${client.firstName} ${client.lastName}`,
        subject: `Happy Policy Anniversary, ${client.firstName}!`,
        relatedEntityType: "POLICY",
        relatedEntityId: client.policyNumber,
        metadata: {
          policyAge: client.policyAge,
          faceAmount: client.faceAmount,
          productType: client.productType,
          agentName: client.agentName
        }
      });
    } catch (error) {
      console.error("[Client Email] Failed to create tracking record:", error);
    }
  }
  const faceAmount = typeof client.faceAmount === "number" ? client.faceAmount : parseFloat(String(client.faceAmount)) || 0;
  const ordinalSuffix = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const trackingPixelHtml = trackingId ? `<img src="${getTrackingPixelUrl(trackingId, baseUrl)}" width="1" height="1" style="display:none;" alt="" />` : "";
  const trackLink = (url) => trackingId ? getTrackedLinkUrl(trackingId, url, baseUrl) : url;
  const scheduleReviewUrl = `mailto:${client.agentEmail || credentials2.email}?subject=Policy Review Request - ${client.policyNumber}`;
  const customContent = options?.customContent || {};
  const greetingMessage = customContent.greetingMessage || `Congratulations on your <strong>${ordinalSuffix(client.policyAge)} policy anniversary</strong>! We want to take a moment to thank you for trusting us with your family's financial protection.`;
  const personalNote = customContent.personalNote || "";
  const closingMessage = customContent.closingMessage || `Thank you for being part of our family. We're honored to help protect what matters most to you.`;
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `Wealth Builders Haven <${credentials2.email}>`,
      to: client.email,
      subject: `\u{1F389} Happy ${ordinalSuffix(client.policyAge)} Policy Anniversary, ${client.firstName}!`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header with celebration theme -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
              \u{1F389} Happy Policy Anniversary!
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Celebrating ${client.policyAge} year${client.policyAge !== 1 ? "s" : ""} of protection
            </p>
          </div>
          
          <!-- Main content -->
          <div style="padding: 30px; background: #f8f9fa; border: 1px solid #e9ecef; border-top: none;">
            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">
              Dear <strong>${client.firstName}</strong>,
            </p>
            
            <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 0 0 20px 0;">
              ${greetingMessage}
            </p>
            
            <!-- Policy summary card -->
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                Your Policy Summary
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Policy Number:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right; font-family: monospace;">${client.policyNumber}</td>
                </tr>
                ${client.productType ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Product Type:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">${client.productType}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Coverage Amount:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">$${faceAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Years Protected:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">${client.policyAge} year${client.policyAge !== 1 ? "s" : ""}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 20px 0;">
              Your policy anniversary is a great time to review your coverage and ensure it still meets your family's needs. 
              Life changes\u2014marriages, new children, home purchases, career advancements\u2014may mean your protection needs have changed too.
            </p>
            
            ${personalNote ? `
            <!-- Personal Note -->
            <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 0; font-style: italic;">
                ${personalNote}
              </p>
            </div>
            ` : ""}
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackLink(scheduleReviewUrl)}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 14px 32px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;
                        font-weight: 600;
                        font-size: 15px;">
                \u{1F4C5} Schedule Your Free Policy Review
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 20px 0 0 0;">
              ${closingMessage}
            </p>
          </div>
          
          <!-- Agent signature -->
          <div style="padding: 25px 30px; background: white; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #333; margin: 0 0 5px 0; font-weight: 600; font-size: 15px;">
              ${client.agentName}
            </p>
            <p style="color: #666; margin: 0 0 3px 0; font-size: 13px;">
              Your Financial Professional
            </p>
            <p style="color: #666; margin: 0 0 3px 0; font-size: 13px;">
              Wealth Builders Haven | World Financial Group
            </p>
            ${client.agentPhone ? `
            <p style="color: #667eea; margin: 10px 0 0 0; font-size: 13px;">
              \u{1F4DE} ${client.agentPhone}
            </p>
            ` : ""}
            ${client.agentEmail ? `
            <p style="color: #667eea; margin: 3px 0 0 0; font-size: 13px;">
              \u2709\uFE0F ${client.agentEmail}
            </p>
            ` : ""}
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px 30px; text-align: center;">
            <p style="color: #999; font-size: 11px; margin: 0; line-height: 1.6;">
              This email was sent by Wealth Builders Haven as a courtesy reminder of your policy anniversary.
              <br>If you have questions about your policy, please contact your agent directly.
            </p>
          </div>
          
          <!-- Tracking pixel (invisible) -->
          ${trackingPixelHtml}
        </div>
      `
    };
    const result = await transporter.sendMail(mailOptions);
    console.log(`[Client Email] Sent anniversary greeting to ${client.email} - Message ID: ${result.messageId}`);
    if (trackingId) {
      try {
        await markEmailSent(trackingId);
      } catch (error) {
        console.error("[Client Email] Failed to mark email as sent:", error);
      }
    }
    return { success: true, trackingId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Client Email] Failed to send anniversary greeting:", errorMessage);
    if (trackingId) {
      try {
        await markEmailFailed(trackingId, errorMessage);
      } catch (trackError) {
        console.error("[Client Email] Failed to mark email as failed:", trackError);
      }
    }
    return { success: false, trackingId };
  }
}
async function sendBulkClientAnniversaryGreetings(clients2) {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const client of clients2) {
    if (!client.email) {
      skipped++;
      console.log(`[Client Email] Skipped ${client.firstName} ${client.lastName} - no email address`);
      continue;
    }
    const result = await sendClientAnniversaryGreeting(client);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    await new Promise((resolve2) => setTimeout(resolve2, 500));
  }
  return { sent, failed, skipped };
}
var init_email_alert = __esm({
  "server/email-alert.ts"() {
    "use strict";
    init_email_tracking();
  }
});

// server/email-tracking.ts
var email_tracking_exports = {};
__export(email_tracking_exports, {
  cancelScheduledEmail: () => cancelScheduledEmail,
  createEmailTracking: () => createEmailTracking,
  getAnniversaryEmailStats: () => getAnniversaryEmailStats,
  getEmailByTrackingId: () => getEmailByTrackingId,
  getEmailTrackingStats: () => getEmailTrackingStats,
  getEmailsEligibleForResend: () => getEmailsEligibleForResend,
  getRecentEmailTracking: () => getRecentEmailTracking,
  getScheduledEmails: () => getScheduledEmails,
  getTrackedLinkUrl: () => getTrackedLinkUrl,
  getTrackingPixelUrl: () => getTrackingPixelUrl,
  getValidatedRedirectUrl: () => getValidatedRedirectUrl,
  markEmailFailed: () => markEmailFailed,
  markEmailResent: () => markEmailResent,
  markEmailSent: () => markEmailSent,
  processScheduledEmails: () => processScheduledEmails,
  recordEmailClick: () => recordEmailClick,
  recordEmailOpen: () => recordEmailOpen,
  scheduleEmail: () => scheduleEmail
});
import { eq as eq11, desc as desc8, and as and9, gte as gte3, lte as lte3 } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
async function createEmailTracking(params) {
  const db = await getDb2();
  if (!db) throw new Error("Database connection not available");
  const trackingId = uuidv4();
  await db.insert(emailTracking).values({
    trackingId,
    emailType: params.emailType,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName || null,
    subject: params.subject || null,
    relatedEntityType: params.relatedEntityType || null,
    relatedEntityId: params.relatedEntityId || null,
    metadata: params.metadata || null,
    sendStatus: "PENDING"
  });
  return trackingId;
}
async function markEmailSent(trackingId) {
  const db = await getDb2();
  if (!db) return;
  await db.update(emailTracking).set({
    sendStatus: "SENT",
    sentAt: /* @__PURE__ */ new Date()
  }).where(eq11(emailTracking.trackingId, trackingId));
}
async function markEmailFailed(trackingId, error) {
  const db = await getDb2();
  if (!db) return;
  await db.update(emailTracking).set({
    sendStatus: "FAILED",
    sendError: error
  }).where(eq11(emailTracking.trackingId, trackingId));
}
async function recordEmailOpen(trackingId, userAgent, ipAddress) {
  const db = await getDb2();
  if (!db) return;
  const now = /* @__PURE__ */ new Date();
  const [existing] = await db.select().from(emailTracking).where(eq11(emailTracking.trackingId, trackingId)).limit(1);
  if (!existing) {
    console.log(`[Email Tracking] Unknown tracking ID: ${trackingId}`);
    return;
  }
  await db.update(emailTracking).set({
    openedAt: existing.openedAt || now,
    // Keep first open time
    openCount: (existing.openCount || 0) + 1,
    lastOpenedAt: now,
    lastUserAgent: userAgent,
    lastIpAddress: ipAddress
  }).where(eq11(emailTracking.trackingId, trackingId));
  console.log(`[Email Tracking] Open recorded for ${trackingId} (total: ${(existing.openCount || 0) + 1})`);
}
async function getValidatedRedirectUrl(trackingId, providedUrl) {
  const db = await getDb2();
  if (!db) return null;
  const [record] = await db.select().from(emailTracking).where(eq11(emailTracking.trackingId, trackingId)).limit(1);
  if (record?.metadata && typeof record.metadata === "object") {
    const metadata = record.metadata;
    if (metadata.redirectUrl && typeof metadata.redirectUrl === "string") {
      return metadata.redirectUrl;
    }
  }
  if (!providedUrl) {
    return null;
  }
  try {
    const url = new URL(providedUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      console.warn(`[Click Tracking] Blocked non-HTTP scheme: ${url.protocol}`);
      return null;
    }
    const hostname = url.hostname.toLowerCase();
    const isAllowed = ALLOWED_REDIRECT_DOMAINS.some((domain) => {
      return hostname === domain || hostname.endsWith(`.${domain}`);
    });
    if (isAllowed) {
      return providedUrl;
    }
    const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
    if (appUrl) {
      const appHostname = new URL(appUrl).hostname.toLowerCase();
      if (hostname === appHostname || hostname.endsWith(`.${appHostname}`)) {
        return providedUrl;
      }
    }
    console.warn(`[Click Tracking] Blocked redirect to untrusted domain: ${hostname}`);
    return null;
  } catch (error) {
    console.warn(`[Click Tracking] Invalid URL format: ${providedUrl}`);
    return null;
  }
}
async function recordEmailClick(trackingId, clickedUrl, userAgent, ipAddress) {
  const db = await getDb2();
  if (!db) return;
  const now = /* @__PURE__ */ new Date();
  const [existing] = await db.select().from(emailTracking).where(eq11(emailTracking.trackingId, trackingId)).limit(1);
  if (!existing) {
    console.log(`[Email Tracking] Unknown tracking ID: ${trackingId}`);
    return;
  }
  const currentLinks = existing.clickedLinks || [];
  if (!currentLinks.includes(clickedUrl)) {
    currentLinks.push(clickedUrl);
  }
  await db.update(emailTracking).set({
    clickedAt: existing.clickedAt || now,
    // Keep first click time
    clickCount: (existing.clickCount || 0) + 1,
    lastClickedAt: now,
    clickedLinks: currentLinks,
    lastUserAgent: userAgent,
    lastIpAddress: ipAddress
  }).where(eq11(emailTracking.trackingId, trackingId));
  console.log(`[Email Tracking] Click recorded for ${trackingId} - URL: ${clickedUrl}`);
}
async function getEmailTrackingStats(days = 30) {
  const db = await getDb2();
  if (!db) return { totalSent: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0, byType: [] };
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const emails = await db.select().from(emailTracking).where(
    and9(
      eq11(emailTracking.sendStatus, "SENT"),
      gte3(emailTracking.sentAt, cutoffDate)
    )
  );
  const totalSent = emails.length;
  const totalOpened = emails.filter((e) => e.openCount && e.openCount > 0).length;
  const totalClicked = emails.filter((e) => e.clickCount && e.clickCount > 0).length;
  const byTypeMap = /* @__PURE__ */ new Map();
  for (const email of emails) {
    const type = email.emailType;
    const current = byTypeMap.get(type) || { sent: 0, opened: 0, clicked: 0 };
    current.sent++;
    if (email.openCount && email.openCount > 0) current.opened++;
    if (email.clickCount && email.clickCount > 0) current.clicked++;
    byTypeMap.set(type, current);
  }
  const byType = Array.from(byTypeMap.entries()).map(([emailType, stats2]) => ({
    emailType,
    sent: stats2.sent,
    opened: stats2.opened,
    clicked: stats2.clicked,
    openRate: stats2.sent > 0 ? Math.round(stats2.opened / stats2.sent * 100) : 0,
    clickRate: stats2.sent > 0 ? Math.round(stats2.clicked / stats2.sent * 100) : 0
  }));
  return {
    totalSent,
    totalOpened,
    totalClicked,
    openRate: totalSent > 0 ? Math.round(totalOpened / totalSent * 100) : 0,
    clickRate: totalSent > 0 ? Math.round(totalClicked / totalSent * 100) : 0,
    byType
  };
}
async function getRecentEmailTracking(limit = 50) {
  const db = await getDb2();
  if (!db) return [];
  const records = await db.select({
    id: emailTracking.id,
    trackingId: emailTracking.trackingId,
    emailType: emailTracking.emailType,
    recipientEmail: emailTracking.recipientEmail,
    recipientName: emailTracking.recipientName,
    subject: emailTracking.subject,
    relatedEntityId: emailTracking.relatedEntityId,
    sentAt: emailTracking.sentAt,
    sendStatus: emailTracking.sendStatus,
    openedAt: emailTracking.openedAt,
    openCount: emailTracking.openCount,
    clickedAt: emailTracking.clickedAt,
    clickCount: emailTracking.clickCount
  }).from(emailTracking).orderBy(desc8(emailTracking.createdAt)).limit(limit);
  return records.map((r) => ({
    ...r,
    openCount: r.openCount || 0,
    clickCount: r.clickCount || 0
  }));
}
async function getAnniversaryEmailStats() {
  const db = await getDb2();
  if (!db) return { thisWeek: { sent: 0, opened: 0, clicked: 0 }, thisMonth: { sent: 0, opened: 0, clicked: 0 }, total: { sent: 0, opened: 0, clicked: 0 }, recentEmails: [] };
  const now = /* @__PURE__ */ new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
  const emails = await db.select().from(emailTracking).where(eq11(emailTracking.emailType, "ANNIVERSARY_GREETING")).orderBy(desc8(emailTracking.sentAt));
  const sentEmails = emails.filter((e) => e.sendStatus && e.sendStatus === "SENT");
  const thisWeekEmails = sentEmails.filter((e) => e.sentAt && e.sentAt >= weekAgo);
  const thisMonthEmails = sentEmails.filter((e) => e.sentAt && e.sentAt >= monthAgo);
  const calcStats = (list) => ({
    sent: list.length,
    opened: list.filter((e) => e.openCount && e.openCount > 0).length,
    clicked: list.filter((e) => e.clickCount && e.clickCount > 0).length
  });
  const recentEmails = sentEmails.slice(0, 20).map((e) => ({
    recipientName: e.recipientName,
    recipientEmail: e.recipientEmail,
    policyNumber: e.relatedEntityId,
    sentAt: e.sentAt,
    opened: (e.openCount || 0) > 0,
    clicked: (e.clickCount || 0) > 0
  }));
  return {
    thisWeek: calcStats(thisWeekEmails),
    thisMonth: calcStats(thisMonthEmails),
    total: calcStats(sentEmails),
    recentEmails
  };
}
function getTrackingPixelUrl(trackingId, baseUrl) {
  return `${baseUrl}/api/track/open/${trackingId}`;
}
function getTrackedLinkUrl(trackingId, originalUrl, baseUrl) {
  return `${baseUrl}/api/track/click/${trackingId}?url=${encodeURIComponent(originalUrl)}`;
}
async function getEmailsEligibleForResend(daysThreshold = 3) {
  const db = await getDb2();
  if (!db) return [];
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  const emails = await db.select().from(emailTracking).where(eq11(emailTracking.sendStatus, "SENT")).orderBy(desc8(emailTracking.sentAt));
  const eligibleEmails = emails.filter((e) => {
    if (!e.sentAt) return false;
    if (e.openCount && e.openCount > 0) return false;
    if (e.sentAt > cutoffDate) return false;
    return true;
  });
  return eligibleEmails.map((e) => {
    const daysSinceSent = e.sentAt ? Math.floor((Date.now() - new Date(e.sentAt).getTime()) / (1e3 * 60 * 60 * 24)) : 0;
    return {
      id: e.id,
      trackingId: e.trackingId,
      emailType: e.emailType,
      recipientEmail: e.recipientEmail,
      recipientName: e.recipientName,
      subject: e.subject,
      relatedEntityId: e.relatedEntityId,
      sentAt: e.sentAt,
      resendCount: e.resendCount || 0,
      daysSinceSent,
      metadata: e.metadata
    };
  });
}
async function markEmailResent(trackingId) {
  const db = await getDb2();
  if (!db) return;
  const [existing] = await db.select().from(emailTracking).where(eq11(emailTracking.trackingId, trackingId)).limit(1);
  if (!existing) return;
  await db.update(emailTracking).set({
    resendCount: (existing.resendCount || 0) + 1,
    lastResendAt: /* @__PURE__ */ new Date()
  }).where(eq11(emailTracking.trackingId, trackingId));
}
async function getEmailByTrackingId(trackingId) {
  const db = await getDb2();
  if (!db) return null;
  const [email] = await db.select().from(emailTracking).where(eq11(emailTracking.trackingId, trackingId)).limit(1);
  if (!email) return null;
  return {
    id: email.id,
    trackingId: email.trackingId,
    emailType: email.emailType,
    recipientEmail: email.recipientEmail,
    recipientName: email.recipientName,
    subject: email.subject,
    relatedEntityType: email.relatedEntityType,
    relatedEntityId: email.relatedEntityId,
    metadata: email.metadata
  };
}
async function scheduleEmail(params) {
  const db = await getDb2();
  if (!db) throw new Error("Database connection not available");
  const result = await db.insert(scheduledEmails).values({
    originalTrackingId: params.originalTrackingId,
    emailType: params.emailType,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName || null,
    relatedEntityType: params.relatedEntityType || null,
    relatedEntityId: params.relatedEntityId || null,
    scheduledFor: params.scheduledFor,
    customContent: params.customContent || null,
    metadata: params.metadata || null,
    createdBy: params.createdBy,
    status: "PENDING"
  });
  return { id: Number(result.insertId) };
}
async function getScheduledEmails() {
  const db = await getDb2();
  if (!db) return [];
  const records = await db.select().from(scheduledEmails).where(eq11(scheduledEmails.status, "PENDING")).orderBy(scheduledEmails.scheduledFor);
  return records.map((r) => ({
    id: r.id,
    originalTrackingId: r.originalTrackingId,
    emailType: r.emailType,
    recipientEmail: r.recipientEmail,
    recipientName: r.recipientName,
    relatedEntityId: r.relatedEntityId,
    scheduledFor: r.scheduledFor,
    status: r.status,
    customContent: r.customContent,
    metadata: r.metadata,
    createdAt: r.createdAt
  }));
}
async function cancelScheduledEmail(scheduledId) {
  const db = await getDb2();
  if (!db) return;
  await db.update(scheduledEmails).set({
    status: "CANCELLED"
  }).where(eq11(scheduledEmails.id, scheduledId));
}
async function processScheduledEmails() {
  const db = await getDb2();
  if (!db) return { processed: 0, succeeded: 0, failed: 0 };
  const now = /* @__PURE__ */ new Date();
  const dueEmails = await db.select().from(scheduledEmails).where(
    and9(
      eq11(scheduledEmails.status, "PENDING"),
      lte3(scheduledEmails.scheduledFor, now)
    )
  );
  let succeeded = 0;
  let failed = 0;
  for (const email of dueEmails) {
    try {
      const { sendClientAnniversaryGreeting: sendClientAnniversaryGreeting2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
      const metadata = email.metadata || {};
      const customContent = email.customContent || {};
      const clientName = email.recipientName || "Valued Client";
      const nameParts = clientName.split(" ");
      const firstName = nameParts[0] || "Valued";
      const lastName = nameParts.slice(1).join(" ") || "Client";
      const result = await sendClientAnniversaryGreeting2({
        email: email.recipientEmail,
        firstName,
        lastName,
        policyNumber: email.relatedEntityId || "",
        faceAmount: metadata.faceAmount || "N/A",
        policyAge: metadata.policyAge || 1,
        productType: metadata.productType || "Life Insurance",
        agentName: metadata.agentName || "Your WFG Agent",
        agentPhone: metadata.agentPhone || "",
        agentEmail: metadata.agentEmail || ""
      }, {
        customContent: Object.keys(customContent).length > 0 ? customContent : void 0
      });
      if (result.success) {
        await db.update(scheduledEmails).set({
          status: "SENT",
          processedAt: /* @__PURE__ */ new Date(),
          newTrackingId: result.trackingId
        }).where(eq11(scheduledEmails.id, email.id));
        if (email.originalTrackingId) {
          await markEmailResent(email.originalTrackingId);
        }
        succeeded++;
      } else {
        await db.update(scheduledEmails).set({
          status: "FAILED",
          processedAt: /* @__PURE__ */ new Date(),
          errorMessage: "Email sending failed"
        }).where(eq11(scheduledEmails.id, email.id));
        failed++;
      }
    } catch (error) {
      await db.update(scheduledEmails).set({
        status: "FAILED",
        processedAt: /* @__PURE__ */ new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      }).where(eq11(scheduledEmails.id, email.id));
      failed++;
    }
  }
  return {
    processed: dueEmails.length,
    succeeded,
    failed
  };
}
var ALLOWED_REDIRECT_DOMAINS;
var init_email_tracking = __esm({
  "server/email-tracking.ts"() {
    "use strict";
    init_db();
    init_schema();
    ALLOWED_REDIRECT_DOMAINS = [
      // Add your own domains here
      "manus.space",
      "manus.im",
      "mywfg.com",
      "transamerica.com",
      "wfgconnects.com",
      // Common safe domains
      "google.com",
      "linkedin.com",
      "facebook.com",
      "twitter.com",
      "youtube.com"
    ];
  }
});

// server/mywfg-sync-data.ts
var mywfg_sync_data_exports = {};
__export(mywfg_sync_data_exports, {
  getCachedMyWFGData: () => getCachedMyWFGData,
  getDashboardMetricsFromCache: () => getDashboardMetricsFromCache,
  getMonthlyCashFlowData: () => getMonthlyCashFlowData,
  getPaymentCycleInfo: () => getPaymentCycleInfo,
  getRecentSyncLogs: () => getRecentSyncLogs,
  getSyncStatus: () => getSyncStatus,
  logSyncAttempt: () => logSyncAttempt,
  updateCachedMyWFGData: () => updateCachedMyWFGData
});
import { desc as desc9 } from "drizzle-orm";
function getCachedMyWFGData() {
  return { ...cachedData };
}
function updateCachedMyWFGData(newData) {
  cachedData = {
    ...cachedData,
    ...newData,
    lastSyncDate: /* @__PURE__ */ new Date()
  };
}
function getDashboardMetricsFromCache() {
  return {
    totalFaceAmount: 0,
    // Not available from MyWFG
    totalPolicies: cachedData.totalPolicies,
    familiesProtected: cachedData.familiesProtected,
    totalClients: cachedData.familiesProtected,
    superTeamCashFlow: cachedData.superTeamCashFlow,
    personalCashFlow: cachedData.personalCashFlow,
    personalPoints: cachedData.personalPoints,
    activeAssociates: cachedData.activeAssociates,
    lifeLicensedAssociates: cachedData.lifeLicensedAssociates,
    lastSyncDate: cachedData.lastSyncDate
  };
}
function getMonthlyCashFlowData() {
  return cachedData.monthlyCashFlow.map((m) => ({
    month: `${m.month.substring(0, 3)} ${m.year}`,
    personal: m.personal,
    superTeam: m.superTeam
  }));
}
function getSyncStatus() {
  const now = /* @__PURE__ */ new Date();
  const hoursSinceSync = Math.floor(
    (now.getTime() - cachedData.lastSyncDate.getTime()) / (1e3 * 60 * 60)
  );
  const isStale = hoursSinceSync >= 6;
  const nextSyncRecommended = new Date(cachedData.lastSyncDate.getTime() + 6 * 60 * 60 * 1e3);
  return {
    isStale,
    hoursSinceSync,
    lastSyncDate: cachedData.lastSyncDate,
    nextSyncRecommended
  };
}
async function logSyncAttempt(status, recordsProcessed, errorMessage) {
  const db = await getDb2();
  if (!db) {
    console.warn("[MyWFG Sync] Cannot log sync: database not available");
    return;
  }
  try {
    await db.insert(mywfgSyncLogs).values({
      syncDate: /* @__PURE__ */ new Date(),
      status,
      recordsProcessed,
      errorMessage
    });
  } catch (error) {
    console.error("[MyWFG Sync] Failed to log sync attempt:", error);
  }
}
async function getRecentSyncLogs(limit = 10) {
  const db = await getDb2();
  if (!db) return [];
  try {
    const logs = await db.select().from(mywfgSyncLogs).orderBy(desc9(mywfgSyncLogs.syncDate)).limit(limit);
    return logs;
  } catch (error) {
    console.error("[MyWFG Sync] Failed to get sync logs:", error);
    return [];
  }
}
function getPaymentCycleInfo() {
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const paymentDays = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date2 = new Date(year, month, day);
    const dayOfWeek = date2.getDay();
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      paymentDays.push(date2);
    }
  }
  const today = new Date(year, month, now.getDate());
  let nextPaymentDate = paymentDays.find((d) => d >= today) || paymentDays[0];
  if (!nextPaymentDate || nextPaymentDate < today) {
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
    for (let day = 1; day <= 7; day++) {
      const date2 = new Date(nextYear, adjustedMonth, day);
      const dayOfWeek = date2.getDay();
      if (dayOfWeek === 2 || dayOfWeek === 5) {
        nextPaymentDate = date2;
        break;
      }
    }
  }
  const isPayDay = paymentDays.some(
    (d) => d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  );
  return {
    nextPaymentDate,
    paymentDaysThisMonth: paymentDays,
    isPayDay
  };
}
var DEFAULT_MYWFG_DATA, cachedData;
var init_mywfg_sync_data = __esm({
  "server/mywfg-sync-data.ts"() {
    "use strict";
    init_db();
    init_schema();
    DEFAULT_MYWFG_DATA = {
      // Cash Flow Data (from Total Cash Flow report - Super Team)
      personalCashFlow: 189931.39,
      superTeamCashFlow: 290099.22,
      baseCashFlow: 0,
      // Not yet extracted
      superBaseCashFlow: 0,
      // Not yet extracted
      // Monthly breakdown (from Total Cash Flow report)
      monthlyCashFlow: [
        { month: "January", year: 2025, personal: 2948.93, superTeam: 3905.84 },
        { month: "February", year: 2025, personal: 1657.8, superTeam: 3092.63 },
        { month: "March", year: 2025, personal: 4025.81, superTeam: 5496.92 },
        { month: "April", year: 2025, personal: 5890.65, superTeam: 6830.54 },
        { month: "May", year: 2025, personal: 6820.06, superTeam: 8168.29 },
        { month: "June", year: 2025, personal: 22868.8, superTeam: 35120.41 },
        { month: "July", year: 2025, personal: 31870.48, superTeam: 31508.35 },
        { month: "August", year: 2025, personal: 15194.6, superTeam: 22343.85 },
        { month: "September", year: 2025, personal: 11350.79, superTeam: 20779.43 },
        { month: "October", year: 2025, personal: 24129.16, superTeam: 62300.19 },
        { month: "November", year: 2025, personal: 48242.63, superTeam: 66160.33 },
        { month: "December", year: 2025, personal: 14931.68, superTeam: 23392.44 }
      ],
      // Policy Data (from Commissions Summary report)
      totalPolicies: 77,
      familiesProtected: 77,
      // Each policy = 1 family
      policies: [],
      // Individual policies stored separately
      // Team Data (from MY BUSINESS dashboard)
      activeAssociates: 91,
      lifeLicensedAssociates: 27,
      securitiesLicensedAssociates: 0,
      // Key Metrics (from MY BUSINESS dashboard)
      personalPoints: 12760,
      personalRecruits: 3,
      netRecruits: 0,
      // Sync metadata
      lastSyncDate: /* @__PURE__ */ new Date("2026-01-04T19:00:00Z"),
      syncSource: "manual_exploration",
      agentCode: "73DXR",
      agentName: "ZAID SHOPEJU"
    };
    cachedData = { ...DEFAULT_MYWFG_DATA };
  }
});

// server/chargeback-notification.ts
var chargeback_notification_exports = {};
__export(chargeback_notification_exports, {
  getCurrentTransamericaAlerts: () => getCurrentTransamericaAlerts,
  hasNewAlerts: () => hasNewAlerts,
  sendChargebackNotification: () => sendChargebackNotification
});
function buildChargebackNotificationContent(alerts) {
  const lines = [];
  lines.push("\u{1F6A8} TRANSAMERICA CHARGEBACK ALERTS \u{1F6A8}");
  lines.push("");
  lines.push(`Total Unread Alerts: ${alerts.totalUnreadAlerts}`);
  lines.push("");
  if (alerts.reversedPremiumPayments.length > 0) {
    lines.push("\u26A0\uFE0F REVERSED PREMIUM PAYMENTS:");
    alerts.reversedPremiumPayments.forEach((alert, index2) => {
      lines.push(`${index2 + 1}. ${alert.ownerName}`);
      lines.push(`   Policy #${alert.policyNumber}`);
      lines.push(`   Date: ${alert.alertDate}`);
    });
    lines.push("");
  }
  if (alerts.eftRemovals.length > 0) {
    lines.push("\u26A0\uFE0F REMOVED FROM EFT:");
    alerts.eftRemovals.forEach((alert, index2) => {
      lines.push(`${index2 + 1}. ${alert.ownerName}`);
      lines.push(`   Policy #${alert.policyNumber}`);
      lines.push(`   Date: ${alert.alertDate}`);
    });
    lines.push("");
  }
  lines.push("ACTION REQUIRED: Contact these clients immediately to prevent policy lapse and commission chargebacks.");
  lines.push("");
  lines.push(`Last Sync: ${new Date(alerts.lastSyncDate).toLocaleString()}`);
  return lines.join("\n");
}
async function sendChargebackNotification(alerts) {
  if (alerts.reversedPremiumPayments.length === 0 && alerts.eftRemovals.length === 0) {
    console.log("[Chargeback Notification] No alerts to notify about");
    return true;
  }
  const title = `\u{1F6A8} ${alerts.reversedPremiumPayments.length} Chargeback Alert(s) - Action Required`;
  const content = buildChargebackNotificationContent(alerts);
  try {
    const success = await notifyOwner({ title, content });
    if (success) {
      console.log("[Chargeback Notification] Successfully sent notification to owner");
    } else {
      console.warn("[Chargeback Notification] Failed to send notification");
    }
    return success;
  } catch (error) {
    console.error("[Chargeback Notification] Error sending notification:", error);
    return false;
  }
}
function hasNewAlerts(currentAlerts, previousAlerts2) {
  if (!previousAlerts2) {
    return currentAlerts.reversedPremiumPayments.length > 0 || currentAlerts.eftRemovals.length > 0;
  }
  const newReversals = currentAlerts.reversedPremiumPayments.filter(
    (current) => !previousAlerts2.reversedPremiumPayments.some(
      (prev) => prev.policyNumber === current.policyNumber && prev.alertDate === current.alertDate
    )
  );
  const newEftRemovals = currentAlerts.eftRemovals.filter(
    (current) => !previousAlerts2.eftRemovals.some(
      (prev) => prev.policyNumber === current.policyNumber && prev.alertDate === current.alertDate
    )
  );
  return newReversals.length > 0 || newEftRemovals.length > 0;
}
function getCurrentTransamericaAlerts() {
  return {
    totalUnreadAlerts: 39,
    reversedPremiumPayments: [
      { policyNumber: "6602249306", ownerName: "OLUWAMUYIWA ONAMUTI", alertDate: "01/01/2026", alertType: "Reversed premium payment" },
      { policyNumber: "6602037542", ownerName: "OLATUNDE OYEWANDE", alertDate: "12/27/2025", alertType: "Reversed premium payment" },
      { policyNumber: "6602103743", ownerName: "BEN WALKER", alertDate: "12/25/2025", alertType: "Reversed premium payment" }
    ],
    eftRemovals: [
      { policyNumber: "6602249306", ownerName: "OLUWAMUYIWA ONAMUTI", alertDate: "01/01/2026", alertType: "Policy removed from Electronic Funds Transfer" },
      { policyNumber: "6602122713", ownerName: "OLUWAKEMISOLA OYEWANDE", alertDate: "01/01/2026", alertType: "Policy removed from Electronic Funds Transfer" }
    ],
    lastSyncDate: "2026-01-04T23:58:00Z"
  };
}
var init_chargeback_notification = __esm({
  "server/chargeback-notification.ts"() {
    "use strict";
    init_notification();
  }
});

// server/lib/browser.ts
var browser_exports = {};
__export(browser_exports, {
  launchBrowser: () => launchBrowser,
  resolveChromePath: () => resolveChromePath
});
import puppeteer from "puppeteer";
import { existsSync, readdirSync, mkdirSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
function findProjectRoot() {
  const oneUp = resolve(import.meta.dirname, "..");
  const twoUp = resolve(import.meta.dirname, "../..");
  if (existsSync(resolve(oneUp, "package.json"))) return oneUp;
  if (existsSync(resolve(twoUp, "package.json"))) return twoUp;
  return process.cwd();
}
function findChromeInCache(cacheDir) {
  if (!existsSync(cacheDir)) return null;
  try {
    const versions = readdirSync(cacheDir);
    for (const ver of versions.sort().reverse()) {
      const bin = resolve(cacheDir, ver, "chrome-linux64", "chrome");
      if (existsSync(bin)) return bin;
    }
  } catch {
  }
  return null;
}
function resolveChromePath() {
  for (const candidate of CANDIDATE_PATHS) {
    if (candidate.endsWith("/chrome") && !candidate.includes("chrome-linux64") && existsSync(candidate)) {
      const found = findChromeInCache(candidate);
      if (found) return found;
      continue;
    }
    if (existsSync(candidate)) return candidate;
  }
  return void 0;
}
async function ensureChrome() {
  if (resolveChromePath()) return;
  const { execSync } = await import("child_process");
  console.log(`[browser] PROJECT_ROOT: ${PROJECT_ROOT}`);
  console.log(`[browser] CWD: ${process.cwd()}`);
  console.log(`[browser] Running as UID: ${process.getuid?.() ?? "unknown"}`);
  const puppeteerBin = resolve(PROJECT_ROOT, "node_modules/.bin/puppeteer");
  const puppeteerCmd = existsSync(puppeteerBin) ? `"${puppeteerBin}" browsers install chrome` : "npx puppeteer browsers install chrome";
  const cacheDir = resolve(PROJECT_ROOT, ".chrome-cache");
  console.log(`[browser] Chrome not found \u2014 auto-installing to ${cacheDir}...`);
  try {
    mkdirSync(cacheDir, { recursive: true });
    execSync(puppeteerCmd, {
      stdio: "pipe",
      timeout: 3e5,
      env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir }
    });
    console.log("[browser] Chrome auto-installation complete (project cache)");
    if (resolveChromePath()) return;
  } catch (err) {
    const stderr = err?.stderr?.toString?.() ?? "";
    console.warn("[browser] Strategy 1 (project cache) failed:", err?.message ?? err);
    if (stderr) console.warn("[browser] Strategy 1 stderr:", stderr.substring(0, 500));
  }
  try {
    const isRoot = process.getuid && process.getuid() === 0;
    const fallbackCacheDir = isRoot ? "/root/.cache/puppeteer" : resolve(homedir(), ".cache/puppeteer");
    console.log(`[browser] Trying fallback install to ${fallbackCacheDir}...`);
    mkdirSync(fallbackCacheDir, { recursive: true });
    execSync(puppeteerCmd, {
      stdio: "pipe",
      timeout: 3e5,
      env: { ...process.env, PUPPETEER_CACHE_DIR: fallbackCacheDir }
    });
    console.log("[browser] Chrome auto-installation complete (fallback cache)");
    if (resolveChromePath()) return;
  } catch (err2) {
    const stderr = err2?.stderr?.toString?.() ?? "";
    console.warn("[browser] Strategy 2 (fallback cache) failed:", err2?.message ?? err2);
    if (stderr) console.warn("[browser] Strategy 2 stderr:", stderr.substring(0, 500));
  }
  try {
    console.log("[browser] Trying apt-get install chromium-browser...");
    execSync("apt-get update -qq && apt-get install -y -qq chromium-browser 2>/dev/null || apt-get install -y -qq chromium 2>/dev/null", {
      stdio: "pipe",
      timeout: 3e5
    });
    console.log("[browser] chromium-browser installed via apt-get");
    if (resolveChromePath()) return;
  } catch (err3) {
    console.warn("[browser] Strategy 3 (apt-get) failed:", err3?.message ?? err3);
  }
  const downloadDir = resolve(cacheDir, "chrome-direct");
  try {
    console.log("[browser] Trying direct Chrome for Testing download...");
    mkdirSync(downloadDir, { recursive: true });
    const result = execSync(
      'curl -sS "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"',
      { stdio: "pipe", timeout: 3e4 }
    ).toString();
    const data = JSON.parse(result);
    const stableDownloads = data?.channels?.Stable?.downloads?.chrome;
    const linuxDownload = stableDownloads?.find((d) => d.platform === "linux64");
    if (linuxDownload?.url) {
      console.log(`[browser] Downloading Chrome from ${linuxDownload.url}...`);
      execSync(
        `cd ${downloadDir} && curl -sSL "${linuxDownload.url}" -o chrome.zip && unzip -q -o chrome.zip && rm -f chrome.zip`,
        { stdio: "pipe", timeout: 3e5 }
      );
      const extractedBin = resolve(downloadDir, "chrome-linux64", "chrome");
      if (existsSync(extractedBin)) {
        execSync(`chmod +x "${extractedBin}"`, { stdio: "pipe" });
        console.log(`[browser] Chrome for Testing installed at ${extractedBin}`);
        CANDIDATE_PATHS.unshift(extractedBin);
        return;
      }
    }
  } catch (err4) {
    const stderr = err4?.stderr?.toString?.() ?? "";
    console.warn("[browser] Strategy 4 (direct download) failed:", err4?.message ?? err4);
    if (stderr) console.warn("[browser] Strategy 4 stderr:", stderr.substring(0, 500));
  }
  try {
    console.log("[browser] Trying wget-based Chrome download...");
    mkdirSync(downloadDir, { recursive: true });
    const versionUrl = "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json";
    const versionResult = execSync(
      `wget -q -O - "${versionUrl}"`,
      { stdio: "pipe", timeout: 3e4 }
    ).toString();
    const versionData = JSON.parse(versionResult);
    const chromeUrl = versionData?.channels?.Stable?.downloads?.chrome?.find((d) => d.platform === "linux64")?.url;
    if (chromeUrl) {
      console.log(`[browser] Downloading Chrome via wget from ${chromeUrl}...`);
      execSync(
        `cd "${downloadDir}" && wget -q "${chromeUrl}" -O chrome.zip && unzip -q -o chrome.zip && rm -f chrome.zip`,
        { stdio: "pipe", timeout: 3e5 }
      );
      const extractedBin = resolve(downloadDir, "chrome-linux64", "chrome");
      if (existsSync(extractedBin)) {
        execSync(`chmod +x "${extractedBin}"`, { stdio: "pipe" });
        console.log(`[browser] Chrome for Testing installed via wget at ${extractedBin}`);
        CANDIDATE_PATHS.unshift(extractedBin);
        return;
      }
    }
  } catch (err5) {
    console.warn("[browser] Strategy 5 (wget) failed:", err5?.message ?? err5);
  }
  try {
    console.log("[browser] Trying Google Chrome stable install via dpkg...");
    execSync(
      'wget -q -O /tmp/google-chrome.deb "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb" && dpkg -i /tmp/google-chrome.deb 2>/dev/null || apt-get install -f -y -qq 2>/dev/null && rm -f /tmp/google-chrome.deb',
      { stdio: "pipe", timeout: 3e5 }
    );
    console.log("[browser] Google Chrome stable installed via dpkg");
    if (resolveChromePath()) return;
  } catch (err6) {
    console.warn("[browser] Strategy 6 (dpkg) failed:", err6?.message ?? err6);
  }
  console.error("[browser] All Chrome installation strategies failed. Sync will likely fail.");
  console.error("[browser] Candidate paths checked:", CANDIDATE_PATHS.join(", "));
}
async function launchBrowser(opts = {}) {
  await ensureChrome();
  const executablePath = resolveChromePath();
  const launchOpts = {
    headless: true,
    args: [...DEFAULT_ARGS, ...opts.extraArgs ?? []],
    ...executablePath ? { executablePath } : {},
    ...opts.puppeteerOptions ?? {}
  };
  console.log(`[browser] Launching Chrome from: ${executablePath ?? "(puppeteer default)"}`);
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  const vp = opts.viewport ?? { width: 1280, height: 800 };
  await page.setViewport(vp);
  await page.setUserAgent(opts.userAgent ?? DEFAULT_USER_AGENT);
  return { browser, page };
}
var PROJECT_ROOT, CANDIDATE_PATHS, DEFAULT_ARGS, DEFAULT_USER_AGENT;
var init_browser = __esm({
  "server/lib/browser.ts"() {
    "use strict";
    PROJECT_ROOT = findProjectRoot();
    CANDIDATE_PATHS = [
      // Project-local Puppeteer cache (persists across Manus checkpoint restores)
      resolve(PROJECT_ROOT, ".chrome-cache", "chrome"),
      // Project-local direct download
      resolve(PROJECT_ROOT, ".chrome-cache", "chrome-direct", "chrome-linux64", "chrome"),
      // Puppeteer cache under current user
      resolve(homedir(), ".cache/puppeteer/chrome"),
      // Puppeteer cache under root (production)
      "/root/.cache/puppeteer/chrome",
      // Puppeteer cache under ubuntu user
      "/home/ubuntu/.cache/puppeteer/chrome",
      // System Chromium (Ubuntu/Debian)
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      // Google Chrome stable
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      // Snap-installed Chromium
      "/snap/bin/chromium"
    ];
    DEFAULT_ARGS = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions"
    ];
    DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }
});

// server/gmail-otp-v2.ts
import Imap from "imap";
import { simpleParser } from "mailparser";
function mustGetEnv2(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
function startOTPSession(platform) {
  const sessionId = `${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session = {
    id: sessionId,
    startTime: /* @__PURE__ */ new Date(),
    platform
  };
  activeSessions.set(sessionId, session);
  console.log(`[OTP V2] Started session ${sessionId} for ${platform} at ${session.startTime.toISOString()}`);
  return sessionId;
}
function endOTPSession(sessionId) {
  activeSessions.delete(sessionId);
  console.log(`[OTP V2] Ended session ${sessionId}`);
}
function clearUsedOTPs() {
  usedOTPs.clear();
  console.log("[OTP V2] Cleared used OTPs cache");
}
function getTransamericaCredentials() {
  return {
    email: mustGetEnv2("TRANSAMERICA_EMAIL"),
    appPassword: mustGetEnv2("TRANSAMERICA_APP_PASSWORD")
  };
}
function createImapConnection(credentials2) {
  return new Promise((resolve2, reject) => {
    const imap = new Imap({
      user: credentials2.email,
      password: credentials2.appPassword,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 3e4,
      connTimeout: 3e4
    });
    imap.once("ready", () => {
      console.log("[OTP V2] IMAP connection ready");
      resolve2(imap);
    });
    imap.once("error", (err) => {
      console.error("[OTP V2] IMAP connection error:", err.message);
      reject(err);
    });
    imap.connect();
  });
}
async function searchForOTPEmail(imap, sessionStartTime, platform, expectedPrefix) {
  return new Promise((resolve2) => {
    imap.openBox("INBOX", false, (err, box) => {
      if (err) {
        console.error("[OTP V2] Error opening inbox:", err.message);
        resolve2({ success: false, error: `Failed to open inbox: ${err.message}` });
        return;
      }
      const searchDate = new Date(sessionStartTime.getTime() - 5 * 60 * 1e3);
      const dateStr = searchDate.toISOString().split("T")[0];
      const senderPatterns = [
        "WebHelp@Transamerica.com",
        "noreply@transamerica.com",
        "transamerica.com",
        "noreply@wfgmail.com",
        "wfg.com"
      ];
      imap.search([["SINCE", dateStr]], (searchErr, results) => {
        if (searchErr) {
          console.error("[OTP V2] Search error:", searchErr.message);
          resolve2({ success: false, error: `Search failed: ${searchErr.message}` });
          return;
        }
        if (!results || results.length === 0) {
          console.log("[OTP V2] No emails found");
          resolve2({ success: false, error: "No OTP emails found" });
          return;
        }
        console.log(`[OTP V2] Found ${results.length} emails to check`);
        const sortedResults = [...results].sort((a, b) => b - a);
        const recentResults = sortedResults.slice(0, 30);
        console.log(`[OTP V2] Checking ${recentResults.length} most recent emails (UIDs: ${recentResults.slice(0, 5).join(", ")}...)`);
        const fetch2 = imap.fetch(recentResults, {
          bodies: "",
          struct: true
        });
        const emails = [];
        fetch2.on("message", (msg, seqno) => {
          let emailData = { uid: 0, date: /* @__PURE__ */ new Date(), from: "", subject: "", body: "" };
          msg.on("body", (stream) => {
            let buffer = "";
            stream.on("data", (chunk) => {
              buffer += chunk.toString("utf8");
            });
            stream.once("end", async () => {
              try {
                const parsed = await simpleParser(buffer);
                emailData.date = parsed.date || /* @__PURE__ */ new Date();
                emailData.from = typeof parsed.from?.text === "string" ? parsed.from.text : "";
                emailData.subject = parsed.subject || "";
                emailData.body = parsed.text || "";
                emails.push(emailData);
              } catch (e) {
                console.error("[OTP V2] Error parsing email:", e);
              }
            });
          });
          msg.once("attributes", (attrs) => {
            emailData.uid = attrs.uid;
          });
        });
        fetch2.once("error", (fetchErr) => {
          console.error("[OTP V2] Fetch error:", fetchErr.message);
          resolve2({ success: false, error: `Fetch failed: ${fetchErr.message}` });
        });
        fetch2.once("end", () => {
          emails.sort((a, b) => b.date.getTime() - a.date.getTime());
          const adjustedStartTime = new Date(sessionStartTime.getTime() - 6e4);
          console.log(`[OTP V2] Looking for emails after ${adjustedStartTime.toISOString()} (session: ${sessionStartTime.toISOString()})`);
          for (const email of emails) {
            if (email.date < adjustedStartTime) {
              continue;
            }
            const fromLower = email.from.toLowerCase();
            const isFromExpectedSender = senderPatterns.some((p) => fromLower.includes(p.toLowerCase()));
            if (!isFromExpectedSender) {
              continue;
            }
            const otpResult = extractOTPFromText(email.body, expectedPrefix);
            if (!otpResult.otp) {
              console.log(`[OTP V2] No OTP found in email: ${email.subject}`);
              continue;
            }
            const otp = otpResult.otp;
            if (usedOTPs.has(otp)) {
              console.log(`[OTP V2] OTP ${otp} already used, skipping`);
              continue;
            }
            console.log(`[OTP V2] Found valid OTP: ${otp} from email at ${email.date.toISOString()}`);
            usedOTPs.add(otp);
            resolve2({
              success: true,
              otp,
              source: email.from,
              timestamp: email.date
            });
            return;
          }
          resolve2({ success: false, error: "No valid OTP found in recent emails" });
        });
      });
    });
  });
}
function extractOTPFromText(text2, expectedPrefix) {
  if (!text2) return { otp: null, prefix: null };
  const prefixPattern = /(\d{4})\s*[-–]\s*(\d{6})/;
  const prefixMatch = text2.match(prefixPattern);
  if (prefixMatch) {
    const foundPrefix = prefixMatch[1];
    const foundOtp = prefixMatch[2];
    if (expectedPrefix && foundPrefix !== expectedPrefix) {
      console.log(`[OTP V2] Prefix mismatch: expected ${expectedPrefix}, found ${foundPrefix}`);
      return { otp: null, prefix: foundPrefix };
    }
    return { otp: foundOtp, prefix: foundPrefix };
  }
  const sixDigitPattern = /\b(\d{6})\b/g;
  const matches = text2.match(sixDigitPattern);
  if (matches && matches.length > 0) {
    return { otp: matches[matches.length - 1], prefix: null };
  }
  const codePattern = /code\s*(?:is|:)\s*(\d{6})/i;
  const codeMatch = text2.match(codePattern);
  if (codeMatch) {
    return { otp: codeMatch[1], prefix: null };
  }
  return { otp: null, prefix: null };
}
async function waitForOTPWithSession(credentials2, sessionId, timeoutSeconds = 180, pollIntervalSeconds = 5, expectedPrefix) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return { success: false, error: `Invalid session ID: ${sessionId}` };
  }
  const prefixInfo = expectedPrefix ? ` (expecting prefix: ${expectedPrefix})` : "";
  console.log(`[OTP V2] Waiting for OTP (session: ${sessionId}, timeout: ${timeoutSeconds}s)${prefixInfo}...`);
  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1e3;
  let attempts = 0;
  while (Date.now() - startTime < timeoutMs) {
    attempts++;
    console.log(`[OTP V2] Attempt ${attempts} - checking for OTP...`);
    let imap = null;
    try {
      imap = await createImapConnection(credentials2);
      const result = await searchForOTPEmail(imap, session.startTime, session.platform, expectedPrefix);
      if (result.success && result.otp) {
        console.log(`[OTP V2] Success! OTP found on attempt ${attempts}`);
        endOTPSession(sessionId);
        return result;
      }
      console.log(`[OTP V2] No OTP yet: ${result.error}`);
    } catch (error) {
      console.error(`[OTP V2] Error on attempt ${attempts}:`, error);
    } finally {
      if (imap) {
        try {
          imap.end();
        } catch (e) {
        }
      }
    }
    const waitTime = attempts <= 3 ? 3e3 : Math.min(pollIntervalSeconds * 1e3 * Math.pow(1.1, attempts - 3), 15e3);
    console.log(`[OTP V2] Waiting ${Math.round(waitTime / 1e3)}s before next attempt...`);
    await new Promise((resolve2) => setTimeout(resolve2, waitTime));
  }
  endOTPSession(sessionId);
  return { success: false, error: `Timeout waiting for OTP after ${timeoutSeconds} seconds` };
}
var activeSessions, usedOTPs;
var init_gmail_otp_v2 = __esm({
  "server/gmail-otp-v2.ts"() {
    "use strict";
    activeSessions = /* @__PURE__ */ new Map();
    usedOTPs = /* @__PURE__ */ new Set();
  }
});

// server/auto-login-transamerica.ts
function getTransamericaLoginCredentials() {
  const username = getEnv("TRANSAMERICA_USERNAME");
  const password = getEnv("TRANSAMERICA_PASSWORD");
  if (!username || !password) {
    throw new Error("Transamerica credentials not configured. Set TRANSAMERICA_USERNAME and TRANSAMERICA_PASSWORD.");
  }
  return { username, password };
}
function getSecurityAnswers() {
  const firstJobCity = getEnv("TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY");
  const petName = getEnv("TRANSAMERICA_SECURITY_Q_PET_NAME");
  if (!firstJobCity || !petName) {
    throw new Error("Transamerica security questions not configured. Set TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY and TRANSAMERICA_SECURITY_Q_PET_NAME.");
  }
  return { firstJobCity, petName };
}
async function loginToTransamerica(keepBrowserOpen = false) {
  let browser = null;
  let page;
  try {
    console.log("[Transamerica] Starting automated login...");
    try {
      const { alertCredentialsUsed: alertCredentialsUsed2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
      await alertCredentialsUsed2("Transamerica");
    } catch (e) {
      console.error("[Transamerica] Failed to send credentials alert:", e);
    }
    const credentials2 = getTransamericaLoginCredentials();
    if (!credentials2.username || !credentials2.password) {
      return { success: false, error: "Transamerica credentials not configured" };
    }
    const gmailCreds = getTransamericaCredentials();
    if (!gmailCreds.email || !gmailCreds.appPassword) {
      return { success: false, error: "Gmail credentials not configured for OTP" };
    }
    ({ browser, page } = await launchBrowser());
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    console.log("[Transamerica] Navigating to login page...");
    await page.goto("https://secure.transamerica.com/login/sign-in/login.html", {
      waitUntil: "networkidle2",
      timeout: 6e4
    });
    await page.waitForSelector('input[name="username"], input[id="username"], #username', { timeout: 3e4 });
    console.log("[Transamerica] Starting OTP session before login...");
    const otpSessionId = startOTPSession("transamerica");
    console.log("[Transamerica] Entering username...");
    await page.type('input[name="username"], input[id="username"], #username', credentials2.username, { delay: 30 });
    console.log("[Transamerica] Entering password...");
    await page.type('input[name="password"], input[id="password"], #password', credentials2.password, { delay: 30 });
    console.log("[Transamerica] Clicking login button (this triggers OTP)...");
    await page.waitForSelector("#formLogin", { timeout: 5e3 });
    await Promise.all([
      page.click("#formLogin"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 6e4 }).catch(() => {
      })
    ]);
    await new Promise((resolve2) => setTimeout(resolve2, 3e3));
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.toLowerCase().includes("security question") || pageText.toLowerCase().includes("what city") || pageText.toLowerCase().includes("pet")) {
      console.log("[Transamerica] Security question detected...");
      const securityAnswers = getSecurityAnswers();
      let answer = "";
      if (pageText.toLowerCase().includes("city") || pageText.toLowerCase().includes("job")) {
        answer = securityAnswers.firstJobCity;
        console.log("[Transamerica] Answering first job city question...");
      } else if (pageText.toLowerCase().includes("pet")) {
        answer = securityAnswers.petName;
        console.log("[Transamerica] Answering pet name question...");
      }
      if (answer) {
        const answerInput = await page.$('input[type="text"]') || await page.$('input[name="answer"]') || await page.$("#answer");
        if (answerInput) {
          await answerInput.type(answer, { delay: 50 });
          const rememberCheckbox = await page.$('input[type="checkbox"]');
          if (rememberCheckbox) {
            await rememberCheckbox.click();
            console.log('[Transamerica] Checked "remember this device"');
          }
          const submitBtn = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 3e4 }).catch(() => {
            });
          }
        }
      }
      await new Promise((resolve2) => setTimeout(resolve2, 2e3));
    }
    const pageUrl = page.url();
    const currentContent = await page.content();
    const currentText = await page.evaluate(() => document.body.innerText);
    const otpRequired = currentContent.toLowerCase().includes("verification") || currentContent.toLowerCase().includes("one-time") || currentContent.toLowerCase().includes("security code") || currentText.toLowerCase().includes("enter the code") || pageUrl.includes("mfa") || pageUrl.includes("verify");
    if (otpRequired) {
      console.log("[Transamerica] OTP verification required, waiting for email (session-based, 180s timeout)...");
      const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3);
      if (!otpResult.success || !otpResult.otp) {
        return { success: false, error: `Failed to get OTP: ${otpResult.error}` };
      }
      console.log(`[Transamerica] OTP received: ${otpResult.otp}`);
      const otpToEnter = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
      const otpSelectors = [
        'input[name="otp"]',
        'input[name="code"]',
        'input[name="verificationCode"]',
        'input[type="tel"]',
        'input[inputmode="numeric"]',
        ".otp-input",
        "#otp",
        "#code"
      ];
      let otpEntered = false;
      for (const selector of otpSelectors) {
        const otpInput = await page.$(selector);
        if (otpInput) {
          await otpInput.click({ clickCount: 3 });
          await page.keyboard.press("Backspace");
          await otpInput.type(otpToEnter, { delay: 50 });
          console.log(`[Transamerica] OTP entered using selector: ${selector}`);
          otpEntered = true;
          break;
        }
      }
      if (!otpEntered) {
        const inputs = await page.$$("input");
        for (const input of inputs) {
          const type = await input.evaluate((el) => el.getAttribute("type"));
          const isVisible = await input.isVisible();
          if (isVisible && (type === "text" || type === "tel" || type === null)) {
            await input.click({ clickCount: 3 });
            await page.keyboard.press("Backspace");
            await input.type(otpToEnter, { delay: 50 });
            console.log("[Transamerica] OTP entered using fallback input");
            otpEntered = true;
            break;
          }
        }
      }
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        ".verify-btn",
        "#verifyButton"
      ];
      for (const selector of submitSelectors) {
        const submitButton = await page.$(selector);
        if (submitButton) {
          await submitButton.click();
          break;
        }
      }
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 3e4 }).catch(() => {
      });
      await new Promise((resolve2) => setTimeout(resolve2, 2e3));
    }
    const finalUrl = page.url();
    const finalContent = await page.content();
    const loginSuccess = !finalUrl.includes("login") && !finalContent.toLowerCase().includes("invalid") && !finalContent.toLowerCase().includes("incorrect");
    if (!loginSuccess) {
      return { success: false, error: "Login verification failed - may still be on login page" };
    }
    const cookies = await page.cookies();
    console.log("[Transamerica] Login successful, cookies captured");
    if (keepBrowserOpen) {
      return { success: true, sessionCookies: cookies, page, browser };
    }
    await browser.close();
    return { success: true, sessionCookies: cookies };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Transamerica] Login failed:", errorMessage);
    if (browser && !keepBrowserOpen) {
      await browser.close();
    }
    return { success: false, error: errorMessage };
  }
}
async function navigateToLifeAccess(page) {
  try {
    console.log("[Transamerica] Navigating to Life Access...");
    const lifeAccessLink = await page.$('a[href*="lifeaccess"]') || await page.$("text=Life Access") || await page.$("text=Transamerica Life Access");
    if (lifeAccessLink) {
      await lifeAccessLink.click();
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 3e4 });
      return true;
    }
    await page.goto("https://lifeaccess.transamerica.com/app/lifeaccess", {
      waitUntil: "networkidle2",
      timeout: 3e4
    });
    return true;
  } catch (error) {
    console.error("[Transamerica] Failed to navigate to Life Access:", error);
    return false;
  }
}
async function fetchPolicyAlerts(page) {
  try {
    console.log("[Transamerica] Fetching policy alerts...");
    await page.goto("https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyAlerts", {
      waitUntil: "networkidle2",
      timeout: 3e4
    });
    await new Promise((resolve2) => setTimeout(resolve2, 3e3));
    const alerts = await page.evaluate(() => {
      const alertElements = document.querySelectorAll(".alert-item, .policy-alert, tr[data-alert]");
      const extractedAlerts = [];
      alertElements.forEach((el) => {
        const text2 = el.textContent || "";
        extractedAlerts.push({
          text: text2.trim(),
          html: el.innerHTML
        });
      });
      return extractedAlerts;
    });
    console.log(`[Transamerica] Found ${alerts.length} alerts`);
    return alerts;
  } catch (error) {
    console.error("[Transamerica] Failed to fetch alerts:", error);
    return [];
  }
}
function setCachedTransamericaCookies(cookies, expiryHours = 24) {
  cachedCookies = cookies;
  cookieExpiry = /* @__PURE__ */ new Date();
  cookieExpiry.setHours(cookieExpiry.getHours() + expiryHours);
  console.log(`[Transamerica] Session cached until ${cookieExpiry.toISOString()}`);
}
function getCachedTransamericaCookies() {
  if (!cachedCookies || !cookieExpiry) return null;
  if (/* @__PURE__ */ new Date() > cookieExpiry) {
    console.log("[Transamerica] Cached session expired");
    cachedCookies = null;
    cookieExpiry = null;
    return null;
  }
  return cachedCookies;
}
async function loginToTransamericaWithCache() {
  const cached = getCachedTransamericaCookies();
  if (cached) {
    console.log("[Transamerica] Using cached session");
    return { success: true, sessionCookies: cached };
  }
  const result = await loginToTransamerica();
  if (result.success && result.sessionCookies) {
    setCachedTransamericaCookies(result.sessionCookies);
  }
  return result;
}
var cachedCookies, cookieExpiry;
var init_auto_login_transamerica = __esm({
  "server/auto-login-transamerica.ts"() {
    "use strict";
    init_browser();
    init_gmail_otp_v2();
    init_env();
    cachedCookies = null;
    cookieExpiry = null;
  }
});

// server/mywfg-downline-scraper.ts
var mywfg_downline_scraper_exports = {};
__export(mywfg_downline_scraper_exports, {
  fetchAgentAddress: () => fetchAgentAddress,
  fetchAgentAddresses: () => fetchAgentAddresses,
  fetchAgentContactInfo: () => fetchAgentContactInfo,
  fetchAgentContactInfoBatch: () => fetchAgentContactInfoBatch,
  fetchAgentUpline: () => fetchAgentUpline,
  fetchAgentUplines: () => fetchAgentUplines,
  fetchDownlineStatus: () => fetchDownlineStatus,
  fetchDownlineStatusWithAddresses: () => fetchDownlineStatusWithAddresses,
  fetchDownlineStatusWithHierarchy: () => fetchDownlineStatusWithHierarchy,
  syncAgentsFromDownlineStatus: () => syncAgentsFromDownlineStatus,
  syncContactInfoFromMyWFG: () => syncContactInfoFromMyWFG,
  syncHierarchyFromMyWFG: () => syncHierarchyFromMyWFG
});
import { eq as eq12 } from "drizzle-orm";
function mustGetEnv4(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
function getMyWFGLoginCredentials() {
  return {
    username: mustGetEnv4("MYWFG_USERNAME"),
    password: mustGetEnv4("MYWFG_PASSWORD")
  };
}
function getGmailCredentials2() {
  return {
    email: mustGetEnv4("MYWFG_EMAIL"),
    appPassword: mustGetEnv4("MYWFG_APP_PASSWORD")
  };
}
async function loginToMyWFG(page) {
  const creds = getMyWFGLoginCredentials();
  const gmailCreds = getGmailCredentials2();
  console.log("[Downline Scraper] Navigating to MyWFG...");
  await page.goto("https://www.mywfg.com", { waitUntil: "networkidle2", timeout: 6e4 });
  await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 3e4 });
  console.log("[Downline Scraper] Starting OTP session before login...");
  const otpSessionId = startOTPSession("mywfg");
  const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
  if (!usernameInput) throw new Error("Username input not found");
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username, { delay: 30 });
  const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
  if (!passwordInput) throw new Error("Password input not found");
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(creds.password, { delay: 30 });
  console.log("[Downline Scraper] Clicking login button (this triggers OTP)...");
  const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
  if (loginButton) {
    await Promise.all([
      loginButton.click(),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 6e4 }).catch(() => {
      })
    ]);
  }
  await new Promise((r) => setTimeout(r, 5e3));
  try {
    await page.screenshot({ path: "/tmp/mywfg-after-login.png", fullPage: true });
    console.log("[Downline Scraper] Screenshot saved to /tmp/mywfg-after-login.png");
  } catch (e) {
    console.log("[Downline Scraper] Could not take screenshot:", e);
  }
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body ? document.body ? document.body.innerText : "" : "");
  if (pageText.includes("ERROR OCCURRED") || pageText.includes("Bad Request")) {
    console.log("[Downline Scraper] Error page detected, retrying...");
    clearUsedOTPs();
    await page.goto("https://www.mywfg.com", { waitUntil: "networkidle2", timeout: 6e4 });
    return loginToMyWFG(page);
  }
  const otpRequired = pageContent.includes("mywfgOtppswd") || pageText.includes("One-Time Password") || pageText.includes("Security Code") || pageText.includes("Validation Code");
  if (otpRequired) {
    console.log("[Downline Scraper] OTP required, waiting for email (session-based, 180s timeout)...");
    const pagePrefix = await page.evaluate(() => {
      const bodyText = document.body ? document.body.innerText : "";
      const prefixMatch = bodyText.match(/(\d{4})\s*-/);
      return prefixMatch ? prefixMatch[1] : null;
    });
    if (pagePrefix) {
      console.log(`[Downline Scraper] Page shows OTP prefix: ${pagePrefix}`);
    } else {
      console.log("[Downline Scraper] Warning: Could not extract OTP prefix from page");
    }
    const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3, pagePrefix || void 0);
    if (!otpResult?.success || !otpResult?.otp) {
      throw new Error(`Failed to get OTP: ${otpResult?.error}`);
    }
    console.log(`[Downline Scraper] \u2713 OTP received: ${otpResult.otp}`);
    const fullOtp = otpResult.otp;
    const otpToEnter = fullOtp.length > 6 ? fullOtp.slice(-6) : fullOtp;
    console.log(`[Downline Scraper] Entering OTP digits: ${otpToEnter}`);
    let otpInput = await page.$('input[id="mywfgOtppswd"]');
    if (!otpInput) otpInput = await page.$('input[name="otp"]');
    if (!otpInput) otpInput = await page.$('input[name="otpCode"]');
    if (!otpInput) otpInput = await page.$('input[placeholder*="code" i]');
    if (!otpInput) {
      const inputs = await page.$$("input");
      for (const input of inputs) {
        const type = await input.evaluate((el) => el.getAttribute("type"));
        const id = await input.evaluate((el) => el.id);
        const isVisible = await input.isVisible();
        if (!isVisible) continue;
        if (id?.toLowerCase().includes("username")) continue;
        if (id?.toLowerCase().includes("password")) continue;
        if (type === "hidden" || type === "password") continue;
        if (type === "text" || type === "tel" || type === null) {
          otpInput = input;
          console.log(`[Downline Scraper] Found OTP input: type=${type}, id=${id}`);
          break;
        }
      }
    }
    if (otpInput) {
      await otpInput.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await otpInput.type(otpToEnter, { delay: 50 });
      console.log("[Downline Scraper] OTP entered");
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: "/tmp/mywfg-otp-entered.png", fullPage: true });
      let submitBtn = await page.$('button[id="mywfgTheylive"]');
      if (!submitBtn) submitBtn = await page.$('button[id="mywfgTheyLive"]');
      if (!submitBtn) {
        const buttons = await page.$$("button");
        for (const btn of buttons) {
          const text2 = await btn.evaluate((el) => el.textContent?.trim().toLowerCase());
          if (text2 === "submit") {
            submitBtn = btn;
            break;
          }
        }
      }
      if (!submitBtn) submitBtn = await page.$('button[type="submit"]');
      if (!submitBtn) submitBtn = await page.$('input[type="submit"]');
      if (submitBtn) {
        console.log("[Downline Scraper] Clicking submit button...");
        await submitBtn.click();
        try {
          await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 3e4 });
        } catch (e) {
          console.log("[Downline Scraper] Navigation wait completed or timed out");
        }
      } else {
        console.log("[Downline Scraper] Warning: Submit button not found");
      }
      await new Promise((r) => setTimeout(r, 3e3));
      try {
        await page.screenshot({ path: "/tmp/mywfg-after-otp-submit.png", fullPage: true });
      } catch (e) {
        console.log("[Downline Scraper] Screenshot skipped (window may be minimized)");
      }
    } else {
      console.log("[Downline Scraper] Warning: OTP input not found");
      try {
        await page.screenshot({ path: "/tmp/mywfg-otp-input-not-found.png", fullPage: true });
      } catch (e) {
        console.log("[Downline Scraper] Screenshot skipped");
      }
    }
  }
  const currentUrl = page.url();
  const isLoggedIn = currentUrl.includes("mywfg.com") && !currentUrl.includes("login") && !currentUrl.includes("signin");
  console.log(`[Downline Scraper] Login ${isLoggedIn ? "successful" : "failed"}`);
  return isLoggedIn;
}
async function extractAgentsFromFrame(frame) {
  const reportData = await frame.evaluate(() => {
    const agents2 = [];
    const tables = Array.from(document.querySelectorAll("table"));
    for (const table of tables) {
      const rows = table.querySelectorAll("tr");
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll("td");
        if (cells.length >= 6) {
          const firstName = cells[0]?.textContent?.trim() || "";
          const lastName = cells[1]?.textContent?.trim() || "";
          const bulletinName = cells[2]?.textContent?.trim() || "";
          const agentCode = cells[3]?.textContent?.trim() || "";
          const titleLevel = cells[4]?.textContent?.trim() || "";
          const commLevel = cells[5]?.textContent?.trim() || "";
          const col6 = cells[6]?.textContent?.trim() || "";
          const col7 = cells[7]?.textContent?.trim() || "";
          const isLLFlag = col6.toLowerCase() === "yes" || col6.toLowerCase() === "no";
          const llFlag = isLLFlag ? col6 : "";
          const llEndDate = isLLFlag ? col7 : "";
          if (firstName === "First_Name" || firstName === "First Name" || !firstName || !agentCode) {
            continue;
          }
          if (titleLevel === "Title_Level" || titleLevel === "Title Level") {
            continue;
          }
          if (!agentCode.match(/^[A-Z0-9]{5}$/i)) {
            continue;
          }
          let isLicensed = false;
          if (llFlag) {
            isLicensed = llFlag.toLowerCase() === "yes";
          } else if (commLevel && parseInt(commLevel) > 0) {
            isLicensed = true;
          }
          agents2.push({
            firstName,
            lastName,
            bulletinName,
            agentCode,
            titleLevel,
            commLevel,
            llFlag: isLicensed,
            llEndDate: llEndDate || null,
            securities: null,
            downlinePercent: null,
            residentState: null,
            mdApprovalDate: null,
            terminateDate: null,
            country: "US"
          });
        }
      }
    }
    return agents2;
  });
  return reportData;
}
async function extractAgentsFromPage(page) {
  const debugInfo = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    const iframes = Array.from(document.querySelectorAll("iframe"));
    const allTds = document.querySelectorAll("td");
    const allTrs = document.querySelectorAll("tr");
    const divTables = Array.from(document.querySelectorAll('[class*="table"], [class*="grid"], [role="table"]'));
    let firstTableHtml = "";
    if (tables.length > 0) {
      firstTableHtml = tables[0].outerHTML.substring(0, 1e3);
    }
    const iframeSrcs = iframes.map((f) => f.src || f.getAttribute("src") || "no-src");
    return {
      tableCount: tables.length,
      iframeCount: iframes.length,
      totalTds: allTds.length,
      totalTrs: allTrs.length,
      divTableCount: divTables.length,
      firstTableHtml,
      iframeSrcs,
      bodyTextSample: document.body ? document.body.innerText : "".substring(0, 500)
    };
  });
  console.log("[Extraction Debug] Page structure:", JSON.stringify(debugInfo, null, 2));
  if (debugInfo.totalTds === 0 && debugInfo.iframeCount > 0) {
    console.log("[Extraction Debug] Main page has no table data, checking iframes...");
    const frames = page.frames();
    console.log(`[Extraction Debug] Found ${frames.length} frames`);
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      try {
        const frameData = await frame.evaluate(() => {
          const tables = Array.from(document.querySelectorAll("table"));
          const allTds = document.querySelectorAll("td");
          return {
            tableCount: tables.length,
            tdCount: allTds.length,
            bodyText: document.body?.innerText?.substring(0, 200) || ""
          };
        });
        console.log(`[Extraction Debug] Frame ${i}: ${JSON.stringify(frameData)}`);
        if (frameData.tdCount > 0) {
          console.log(`[Extraction Debug] Found data in frame ${i}, extracting...`);
          const agents2 = await extractAgentsFromFrame(frame);
          if (agents2.length > 0) {
            return agents2;
          }
        }
      } catch (e) {
        console.log(`[Extraction Debug] Frame ${i} error: ${e}`);
      }
    }
  }
  const reportData = await page.evaluate(() => {
    const agents2 = [];
    const tables = Array.from(document.querySelectorAll("table"));
    for (const table of tables) {
      const rows = table.querySelectorAll("tr");
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll("td");
        if (cells.length >= 6) {
          const firstName = cells[0]?.textContent?.trim() || "";
          const lastName = cells[1]?.textContent?.trim() || "";
          const bulletinName = cells[2]?.textContent?.trim() || "";
          const agentCode = cells[3]?.textContent?.trim() || "";
          const titleLevel = cells[4]?.textContent?.trim() || "";
          const commLevel = cells[5]?.textContent?.trim() || "";
          const col6 = cells[6]?.textContent?.trim() || "";
          const col7 = cells[7]?.textContent?.trim() || "";
          const isLLFlag = col6.toLowerCase() === "yes" || col6.toLowerCase() === "no";
          const llFlag = isLLFlag ? col6 : "";
          const llEndDate = isLLFlag ? col7 : "";
          const downlinePercent = !isLLFlag ? col6 : cells[8]?.textContent?.trim() || "";
          const mdApprovalDate = !isLLFlag ? col7 : cells[9]?.textContent?.trim() || "";
          if (firstName === "First_Name" || firstName === "First Name" || !firstName || !agentCode) {
            continue;
          }
          if (titleLevel === "Title_Level" || titleLevel === "Title Level") {
            continue;
          }
          if (!agentCode.match(/^[A-Z0-9]{5}$/i)) {
            continue;
          }
          let isLicensed = false;
          if (llFlag) {
            isLicensed = llFlag.toLowerCase() === "yes";
          } else if (mdApprovalDate && mdApprovalDate.match(/\d{2}\/\d{2}\/\d{2}/)) {
            isLicensed = true;
          } else if (commLevel && parseInt(commLevel) > 0) {
            isLicensed = true;
          }
          agents2.push({
            firstName,
            lastName,
            bulletinName,
            agentCode,
            titleLevel,
            commLevel,
            llFlag: isLicensed,
            llEndDate: llEndDate || null,
            securities: null,
            downlinePercent: downlinePercent || null,
            residentState: null,
            mdApprovalDate: mdApprovalDate || null,
            terminateDate: null,
            country: "US"
          });
        }
      }
    }
    return agents2;
  });
  if (reportData.length === 0) {
    const pageText = await page.evaluate(() => document.body ? document.body.innerText : "");
    const lines = pageText.split("\n");
    for (const line of lines) {
      const parts = line.split(/\s{2,}|\t/);
      if (parts.length >= 8 && parts[3]?.match(/^[A-Z0-9]{5}$/)) {
        const firstName = parts[0]?.trim();
        const lastName = parts[1]?.trim();
        const bulletinName = parts[2]?.trim();
        const agentCode = parts[3]?.trim();
        const titleLevel = parts[4]?.trim();
        const commLevel = parts[5]?.trim();
        const llFlag = parts[6]?.trim();
        const llEndDate = parts[7]?.trim();
        if (firstName && lastName && agentCode && !firstName.includes("First")) {
          reportData.push({
            firstName,
            lastName,
            bulletinName,
            agentCode,
            titleLevel,
            commLevel,
            llFlag: llFlag?.toLowerCase() === "yes",
            llEndDate: llEndDate || null,
            securities: parts[8]?.trim() || null,
            downlinePercent: parts[9]?.trim() || null,
            residentState: parts[10]?.trim() || null,
            mdApprovalDate: parts[11]?.trim() || null,
            terminateDate: parts[12]?.trim() || null,
            country: parts[13]?.trim() || "US"
          });
        }
      }
    }
  }
  return reportData;
}
async function extractDownlineStatus(page, agentId, teamType = "BASE_SHOP") {
  const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
  console.log(`[Downline Scraper] Navigating to Downline Status report (${teamType})...`);
  await page.goto(reportUrl, { waitUntil: "networkidle2", timeout: 6e4 });
  await new Promise((r) => setTimeout(r, 3e3));
  await page.screenshot({ path: "/tmp/mywfg-report-initial.png", fullPage: true });
  console.log("[Downline Scraper] Initial screenshot saved");
  console.log("[Downline Scraper] Setting up report filters...");
  const typeSet = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll("select"));
    for (const select of selects) {
      const options = Array.from(select.options);
      const hasActive = options.some((o) => o.text.toLowerCase() === "active");
      if (hasActive) {
        const targetOption = options.find((o) => o.text.toLowerCase() === "active");
        if (targetOption) {
          select.value = targetOption.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return { success: true, value: targetOption.text };
        }
      }
    }
    return { success: false };
  });
  if (typeSet.success) {
    console.log(`[Downline Scraper] Set Type to: ${typeSet.value}`);
  } else {
    console.log("[Downline Scraper] Could not find Type dropdown");
  }
  await new Promise((r) => setTimeout(r, 500));
  const teamSet = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll("select"));
    for (const select of selects) {
      const options = Array.from(select.options);
      const hasSMDBase = options.some((o) => o.text.toLowerCase().includes("smd base"));
      if (hasSMDBase) {
        const targetOption = options.find((o) => o.text.toLowerCase().includes("smd base"));
        if (targetOption) {
          select.value = targetOption.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return { success: true, value: targetOption.text };
        }
      }
    }
    return { success: false };
  });
  if (teamSet.success) {
    console.log(`[Downline Scraper] Set Team to: ${teamSet.value}`);
  } else {
    console.log("[Downline Scraper] Could not find Team dropdown with SMD Base option");
  }
  await new Promise((r) => setTimeout(r, 500));
  const titleLevelSet = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll("select"));
    for (const select of selects) {
      const options = Array.from(select.options);
      const hasTitleLevels = options.some((o) => ["TA", "A", "SA", "MD", "SMD"].includes(o.text.trim()));
      if (hasTitleLevels) {
        if (select.multiple) {
          const targetLevels = ["TA", "A", "SA", "MD"];
          const selected = [];
          for (const option of options) {
            if (targetLevels.includes(option.text.trim())) {
              option.selected = true;
              selected.push(option.text.trim());
            }
          }
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return { success: true, multiple: true, values: selected };
        } else {
          const targetOption = options.find((o) => o.text.trim() === "TA");
          if (targetOption) {
            select.value = targetOption.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            return { success: true, multiple: false, values: ["TA"] };
          }
        }
      }
    }
    return { success: false };
  });
  if (titleLevelSet.success) {
    console.log(`[Downline Scraper] Set Title Level to: ${titleLevelSet.values?.join(", ")} (multi-select: ${titleLevelSet.multiple})`);
  } else {
    console.log("[Downline Scraper] Could not find Title Level dropdown");
  }
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "/tmp/mywfg-report-filters-set.png", fullPage: true });
  console.log("[Downline Scraper] Filters set, screenshot saved");
  console.log("[Downline Scraper] Clicking Generate Report button...");
  const generateClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
    for (const btn of buttons) {
      const text2 = (btn.textContent || btn.value || "").toLowerCase();
      if (text2 === "generate report" || text2.includes("generate") && !text2.includes("full")) {
        btn.click();
        return { clicked: true, text: text2 };
      }
    }
    return { clicked: false };
  });
  if (generateClicked.clicked) {
    console.log(`[Downline Scraper] Clicked: ${generateClicked.text}`);
    await new Promise((r) => setTimeout(r, 5e3));
    try {
      await page.waitForFunction(() => {
        const tables = Array.from(document.querySelectorAll("table"));
        for (const table of tables) {
          const rows = table.querySelectorAll("tr td");
          if (rows.length > 0) return true;
        }
        return false;
      }, { timeout: 15e3 });
      console.log("[Downline Scraper] Table data loaded");
    } catch (e) {
      console.log("[Downline Scraper] Timeout waiting for table data, proceeding anyway...");
    }
    await new Promise((r) => setTimeout(r, 2e3));
  }
  await page.screenshot({ path: "/tmp/mywfg-report-after-generate.png", fullPage: true });
  const headerInfo = await page.evaluate(() => {
    const headerText = document.body ? document.body.innerText : "";
    const runDateMatch = headerText.match(/Run Date and Time:\s*([^\n]+)/);
    const infoMatch = headerText.match(/Shopeju,\s*Zaid[^\n]+/);
    return {
      runDate: runDateMatch ? runDateMatch[1].trim() : "",
      reportInfo: infoMatch ? infoMatch[0].trim() : ""
    };
  });
  const runDate = headerInfo.runDate;
  const reportInfo = headerInfo.reportInfo;
  const seenAgentCodes = /* @__PURE__ */ new Set();
  let allAgents = [];
  const initialAgents = await extractAgentsFromPage(page);
  console.log(`[Downline Scraper] Found ${initialAgents.length} agents in initial report`);
  for (const agent of initialAgents) {
    if (agent.agentCode && !seenAgentCodes.has(agent.agentCode)) {
      seenAgentCodes.add(agent.agentCode);
      allAgents.push(agent);
    }
  }
  if (!titleLevelSet.multiple && titleLevelSet.success) {
    const titleLevels = ["A", "SA", "MD"];
    for (const titleLevel of titleLevels) {
      console.log(`[Downline Scraper] Fetching agents with title level: ${titleLevel}`);
      const levelSet = await page.evaluate((level) => {
        const selects = Array.from(document.querySelectorAll("select"));
        for (const select of selects) {
          const options = Array.from(select.options);
          const hasTitleLevels = options.some((o) => ["TA", "A", "SA", "MD", "SMD"].includes(o.text.trim()));
          if (hasTitleLevels) {
            const targetOption = options.find((o) => o.text.trim() === level);
            if (targetOption) {
              select.value = targetOption.value;
              select.dispatchEvent(new Event("change", { bubbles: true }));
              return { success: true };
            }
          }
        }
        return { success: false };
      }, titleLevel);
      if (!levelSet.success) {
        console.log(`[Downline Scraper] Could not set title level to ${titleLevel}, skipping...`);
        continue;
      }
      await new Promise((r) => setTimeout(r, 500));
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
        for (const btn of buttons) {
          const text2 = (btn.textContent || btn.value || "").toLowerCase();
          if (text2 === "generate report" || text2.includes("generate") && !text2.includes("full")) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      await new Promise((r) => setTimeout(r, 5e3));
      await page.screenshot({ path: `/tmp/mywfg-report-${titleLevel}.png`, fullPage: true });
      const levelAgents = await extractAgentsFromPage(page);
      console.log(`[Downline Scraper] Found ${levelAgents.length} agents at title level ${titleLevel}`);
      for (const agent of levelAgents) {
        if (agent.agentCode && !seenAgentCodes.has(agent.agentCode)) {
          seenAgentCodes.add(agent.agentCode);
          allAgents.push(agent);
        }
      }
    }
  }
  console.log(`[Downline Scraper] Total unique agents extracted: ${allAgents.length}`);
  try {
    await page.screenshot({ path: "/tmp/mywfg-report-final.png", fullPage: true });
    console.log("[Downline Scraper] Final screenshot saved: /tmp/mywfg-report-final.png");
  } catch (e) {
  }
  const agents2 = allAgents.map((agent) => ({
    ...agent,
    homeAddress: null,
    // Will be populated by fetchAgentAddresses
    wfgRank: TITLE_LEVEL_TO_RANK[agent.titleLevel] || "TRAINING_ASSOCIATE",
    isLifeLicensed: agent.llFlag === true || agent.llFlag === "Yes" || agent.llFlag === "yes"
  }));
  const summary = {
    totalAgents: agents2.length,
    byTitleLevel: {
      TA: agents2.filter((a) => a.titleLevel === "01" || a.titleLevel === "1").length,
      A: agents2.filter((a) => a.titleLevel === "10").length,
      SA: agents2.filter((a) => a.titleLevel === "15").length,
      MD: agents2.filter((a) => a.titleLevel === "17").length,
      SMD: agents2.filter((a) => a.titleLevel === "20").length,
      other: agents2.filter((a) => !["01", "1", "10", "15", "17", "20"].includes(a.titleLevel)).length
    },
    licensedCount: agents2.filter((a) => a.isLifeLicensed).length,
    unlicensedCount: agents2.filter((a) => !a.isLifeLicensed).length
  };
  console.log("\n========================================");
  console.log("       DOWNLINE STATUS REPORT SUMMARY");
  console.log("========================================");
  console.log(`Run Date: ${runDate}`);
  console.log(`Report Info: ${reportInfo}`);
  console.log("----------------------------------------");
  console.log(`Total Agents: ${summary.totalAgents}`);
  console.log("----------------------------------------");
  console.log("By Title Level:");
  console.log(`  TA (Training Associate): ${summary.byTitleLevel.TA}`);
  console.log(`  A  (Associate):          ${summary.byTitleLevel.A}`);
  console.log(`  SA (Senior Associate):   ${summary.byTitleLevel.SA}`);
  console.log(`  MD (Marketing Director): ${summary.byTitleLevel.MD}`);
  console.log(`  SMD (Senior MD):         ${summary.byTitleLevel.SMD}`);
  if (summary.byTitleLevel.other > 0) {
    console.log(`  Other:                   ${summary.byTitleLevel.other}`);
  }
  console.log("----------------------------------------");
  console.log(`Licensed:   ${summary.licensedCount}`);
  console.log(`Unlicensed: ${summary.unlicensedCount}`);
  console.log("========================================\n");
  console.log(`[Downline Scraper] Extracted ${agents2.length} agents from report`);
  return {
    success: agents2.length > 0,
    agents: agents2,
    runDate,
    reportInfo,
    summary
  };
}
async function fetchDownlineStatus(agentId = "73DXR", teamType = "BASE_SHOP", cachedCookies2) {
  let browser = null;
  let page;
  try {
    console.log("[Downline Scraper] Starting downline status extraction...");
    ({ browser, page } = await launchBrowser());
    if (cachedCookies2 && cachedCookies2.length > 0) {
      console.log("[Downline Scraper] Using cached session cookies...");
      await page.setCookie(...cachedCookies2);
      const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
      await page.goto(reportUrl, { waitUntil: "networkidle2", timeout: 6e4 });
      const currentUrl = page.url();
      if (currentUrl.includes("login")) {
        console.log("[Downline Scraper] Session expired, need fresh login");
        throw new Error("Session expired - need fresh login");
      }
      console.log("[Downline Scraper] Cached session valid, on downline page");
    } else {
      const loggedIn = await loginToMyWFG(page);
      if (!loggedIn) {
        throw new Error("Failed to login to MyWFG");
      }
    }
    const result = await extractDownlineStatus(page, agentId, teamType);
    await browser.close();
    browser = null;
    return result;
  } catch (error) {
    console.error("[Downline Scraper] Error:", error);
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      agents: [],
      runDate: "",
      reportInfo: "",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function syncAgentsFromDownlineStatus(db, schema, prefetchedResult, teamType = "BASE_SHOP") {
  try {
    const result = prefetchedResult || await fetchDownlineStatus("73DXR", teamType);
    if (!result.success) {
      return { success: false, added: 0, updated: 0, deactivated: 0, reactivated: 0, error: result.error };
    }
    let added = 0;
    let updated = 0;
    let deactivated = 0;
    let reactivated = 0;
    const activeAgentCodes = new Set(result.agents.map((a) => a.agentCode));
    const allAgents = await db.select().from(schema.agents).where(eq12(schema.agents.teamType, teamType));
    for (const existingAgent of allAgents) {
      if (existingAgent.agentCode && !activeAgentCodes.has(existingAgent.agentCode)) {
        if (existingAgent.isActive) {
          await db.update(schema.agents).set({ isActive: false }).where(eq12(schema.agents.id, existingAgent.id));
          deactivated++;
          console.log(`[Downline Scraper] Marked agent ${existingAgent.firstName} ${existingAgent.lastName} (${existingAgent.agentCode}) as INACTIVE`);
        }
      }
    }
    for (const agent of result.agents) {
      const existing = await db.select().from(schema.agents).where(eq12(schema.agents.agentCode, agent.agentCode)).limit(1);
      if (existing.length > 0) {
        const wasInactive = !existing[0].isActive;
        const updateData = {
          firstName: agent.firstName,
          lastName: agent.lastName,
          currentRank: agent.wfgRank,
          isLifeLicensed: agent.isLifeLicensed,
          licenseExpirationDate: agent.llEndDate ? new Date(agent.llEndDate) : null,
          currentStage: agent.isLifeLicensed ? "LICENSED" : "EXAM_PREP",
          isActive: true
          // Mark as active since they're in the report
        };
        if (agent.homeAddress) {
          updateData.homeAddress = agent.homeAddress;
        }
        await db.update(schema.agents).set(updateData).where(eq12(schema.agents.agentCode, agent.agentCode));
        updated++;
        if (wasInactive) {
          reactivated++;
          console.log(`[Downline Scraper] Reactivated agent ${agent.firstName} ${agent.lastName} (${agent.agentCode})`);
        }
      } else {
        await db.insert(schema.agents).values({
          firstName: agent.firstName,
          lastName: agent.lastName,
          agentCode: agent.agentCode,
          currentRank: agent.wfgRank,
          isLifeLicensed: agent.isLifeLicensed,
          homeAddress: agent.homeAddress,
          licenseExpirationDate: agent.llEndDate ? new Date(agent.llEndDate) : null,
          currentStage: agent.isLifeLicensed ? "LICENSED" : "EXAM_PREP",
          teamType,
          isActive: true
        });
        added++;
      }
    }
    console.log(`[Downline Scraper] Sync complete: ${added} added, ${updated} updated, ${deactivated} deactivated, ${reactivated} reactivated`);
    return { success: true, added, updated, deactivated, reactivated };
  } catch (error) {
    console.error("[Downline Scraper] Sync error:", error);
    return {
      success: false,
      added: 0,
      updated: 0,
      deactivated: 0,
      reactivated: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function fetchAgentContactInfo(page, agentCode) {
  try {
    console.log(`[Hierarchy Tool] Fetching contact info for agent ${agentCode}...`);
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 3e4 });
    await new Promise((r) => setTimeout(r, 2e3));
    try {
      const clicked = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll("a, div, span, button, li"));
        for (const el of allElements) {
          const text2 = el.textContent?.trim().toUpperCase() || "";
          if (text2 === "ASSOCIATE DETAILS" || text2.includes("ASSOCIATE DETAILS")) {
            console.log("Found Associate Details tab:", el.tagName, el.className);
            el.click();
            return { found: true, tag: el.tagName, class: el.className };
          }
        }
        return { found: false };
      });
      console.log(`[Hierarchy Tool] Tab click result:`, clicked);
      await new Promise((r) => setTimeout(r, 3e3));
      let contentLoaded = false;
      for (let i = 0; i < 10; i++) {
        const hasContent = await page.evaluate(() => {
          const text2 = document.body ? document.body.innerText : "";
          const hasPhone = /\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/.test(text2);
          const hasEmail = /@/.test(text2) && !text2.includes("wfg.com");
          const hasAddress = /\d+\s+\w+\s+(St|Street|Ave|Avenue|Blvd|Dr|Drive|Rd|Road|Ln|Lane)/i.test(text2);
          const hasLabels = /Mobile|Cell|Phone|Email|Address/i.test(text2);
          return hasPhone || hasEmail || hasAddress || hasLabels;
        });
        if (hasContent) {
          contentLoaded = true;
          console.log(`[Hierarchy Tool] Content loaded after ${(i + 1) * 2} seconds`);
          break;
        }
        await new Promise((r) => setTimeout(r, 2e3));
      }
      if (!contentLoaded) {
        console.log("[Hierarchy Tool] Content did not load after 20 seconds, proceeding anyway...");
      }
    } catch (e) {
      console.log("[Hierarchy Tool] Error clicking tab:", e);
    }
    const contactInfo = await page.evaluate(() => {
      const result = {
        phone: null,
        email: null,
        homeAddress: null
      };
      const pageText = document.body ? document.body.innerText : "";
      const pageHtml = document.body.innerHTML;
      const phonePatterns = [
        /(?:Mobile|Cell|Phone|Tel|Primary Phone|Home Phone|Work Phone)[:\s]*(\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4})/i,
        /(?:Mobile|Cell)[:\s]*([\d\(\)\-\s\.]+)/i
      ];
      for (const pattern of phonePatterns) {
        const match = pageText.match(pattern);
        if (match) {
          const phone = match[1] || match[0];
          const cleaned = phone.replace(/[^\d]/g, "");
          if (cleaned.length >= 10) {
            result.phone = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
            break;
          }
        }
      }
      if (!result.phone) {
        const allPhones = pageText.match(/\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g);
        if (allPhones && allPhones.length > 0) {
          for (const phone of allPhones) {
            const cleaned = phone.replace(/[^\d]/g, "");
            if (cleaned.length >= 10) {
              if (!pageText.includes(`ID: ${phone}`) && !pageText.includes(`Date: ${phone}`)) {
                result.phone = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
                break;
              }
            }
          }
        }
      }
      const emailMatches = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
      if (emailMatches) {
        for (const email of emailMatches) {
          const lowerEmail = email.toLowerCase();
          if (!lowerEmail.includes("wfg.com") && !lowerEmail.includes("transamerica") && !lowerEmail.includes("noreply") && !lowerEmail.includes("support")) {
            result.email = lowerEmail;
            break;
          }
        }
      }
      const addressPatterns = [
        /Home Address[:\s]*([^\n]+(?:\n[^\n]+)?)/i,
        /Address[:\s]*([^\n]+(?:,\s*[A-Z]{2}\s*\d{5}))/i,
        /([\d]+\s+[\w\s]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court)[\s,]+[\w\s]+,\s*[A-Z]{2}\s*\d{5})/i
      ];
      for (const pattern of addressPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          result.homeAddress = match[1].replace(/\s+/g, " ").trim();
          break;
        }
      }
      return result;
    });
    if (contactInfo.phone) {
      console.log(`[Hierarchy Tool] Found phone for ${agentCode}: ${contactInfo.phone}`);
    }
    if (contactInfo.email) {
      console.log(`[Hierarchy Tool] Found email for ${agentCode}: ${contactInfo.email}`);
    }
    if (contactInfo.homeAddress) {
      console.log(`[Hierarchy Tool] Found address for ${agentCode}: ${contactInfo.homeAddress.substring(0, 50)}...`);
    }
    return contactInfo;
  } catch (error) {
    console.error(`[Hierarchy Tool] Error fetching contact info for ${agentCode}:`, error);
    return { phone: null, email: null, homeAddress: null };
  }
}
async function fetchAgentContactInfoBatch(page, agentCodes, onProgress) {
  const contacts = /* @__PURE__ */ new Map();
  console.log(`[Hierarchy Tool] Fetching contact info for ${agentCodes.length} agents...`);
  for (let i = 0; i < agentCodes.length; i++) {
    const agentCode = agentCodes[i];
    if (onProgress) {
      onProgress(i + 1, agentCodes.length, agentCode);
    }
    const contactInfo = await fetchAgentContactInfo(page, agentCode);
    if (contactInfo.phone || contactInfo.email || contactInfo.homeAddress) {
      contacts.set(agentCode, contactInfo);
    }
    if (i < agentCodes.length - 1) {
      await new Promise((r) => setTimeout(r, 1e3));
    }
  }
  console.log(`[Hierarchy Tool] Successfully fetched contact info for ${contacts.size} agents out of ${agentCodes.length}`);
  return contacts;
}
async function fetchAgentAddress(page, agentCode) {
  try {
    console.log(`[Hierarchy Tool] Fetching address for agent ${agentCode}...`);
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 3e4 });
    await new Promise((r) => setTimeout(r, 2e3));
    try {
      const associateDetailsLink = await page.$('a[id="AgentDetailsLink"], a:has-text("Associate Details")');
      if (associateDetailsLink) {
        await associateDetailsLink.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (e) {
    }
    const address = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll("label, div, span, td"));
      let foundHomeAddress = false;
      for (const el of labels) {
        const text2 = el.textContent?.trim() || "";
        if (text2.includes("Home Address") || text2 === "Home Address:") {
          foundHomeAddress = true;
          continue;
        }
        if (foundHomeAddress && text2.length > 10 && !text2.includes("Address")) {
          return text2.replace(/\s+/g, " ").trim();
        }
      }
      const pageText = document.body ? document.body.innerText : "";
      const addressMatch = pageText.match(/Home Address[:\s]*([^\n]+(?:\n[^\n]+)?)/i);
      if (addressMatch) {
        return addressMatch[1].replace(/\s+/g, " ").trim();
      }
      return null;
    });
    if (address) {
      console.log(`[Hierarchy Tool] Found address for ${agentCode}: ${address.substring(0, 50)}...`);
    } else {
      console.log(`[Hierarchy Tool] No address found for ${agentCode}`);
    }
    return address;
  } catch (error) {
    console.error(`[Hierarchy Tool] Error fetching address for ${agentCode}:`, error);
    return null;
  }
}
async function fetchAgentAddresses(page, agentCodes, onProgress) {
  const addresses = /* @__PURE__ */ new Map();
  console.log(`[Hierarchy Tool] Fetching addresses for ${agentCodes.length} agents...`);
  for (let i = 0; i < agentCodes.length; i++) {
    const agentCode = agentCodes[i];
    if (onProgress) {
      onProgress(i + 1, agentCodes.length, agentCode);
    }
    const address = await fetchAgentAddress(page, agentCode);
    if (address) {
      addresses.set(agentCode, address);
    }
    if (i < agentCodes.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  console.log(`[Hierarchy Tool] Successfully fetched ${addresses.size} addresses out of ${agentCodes.length} agents`);
  return addresses;
}
async function fetchDownlineStatusWithAddresses(agentId = "73DXR", teamType = "BASE_SHOP") {
  let browser = null;
  let page;
  try {
    console.log("[Downline Scraper] Starting downline status extraction with addresses...");
    ({ browser, page } = await launchBrowser());
    const loggedIn = await loginToMyWFG(page);
    if (!loggedIn) {
      throw new Error("Failed to login to MyWFG");
    }
    const result = await extractDownlineStatus(page, agentId, teamType);
    if (result.success && result.agents.length > 0) {
      console.log("[Downline Scraper] Fetching addresses from Hierarchy Tool...");
      const agentCodes = result.agents.map((a) => a.agentCode);
      const addresses = await fetchAgentAddresses(page, agentCodes);
      for (const agent of result.agents) {
        const address = addresses.get(agent.agentCode);
        if (address) {
          agent.homeAddress = address;
        }
      }
      console.log(`[Downline Scraper] Updated ${addresses.size} agents with addresses`);
    }
    await browser.close();
    browser = null;
    return result;
  } catch (error) {
    console.error("[Downline Scraper] Error:", error);
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      agents: [],
      runDate: "",
      reportInfo: "",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function fetchAgentUpline(page, agentCode) {
  try {
    console.log(`[Hierarchy Tool] Fetching upline for agent ${agentCode}...`);
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 3e4 });
    await new Promise((r) => setTimeout(r, 2e3));
    const detailsClicked = await page.evaluate(() => {
      const link = document.querySelector("#AgentDetailsLink");
      if (link) {
        link.click();
        return true;
      }
      const links = Array.from(document.querySelectorAll("a"));
      for (const l of links) {
        const text2 = l.textContent?.trim().toUpperCase() || "";
        if (text2 === "ASSOCIATE DETAILS" || text2.includes("ASSOCIATE DETAILS")) {
          l.click();
          return true;
        }
      }
      return false;
    });
    if (detailsClicked) {
      await new Promise((r) => setTimeout(r, 4e3));
    }
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise((r) => setTimeout(r, 1e3));
    const uplineData = await page.evaluate(() => {
      const pageText = document.body ? document.body.innerText : "";
      const recruiterMatch = pageText.match(/Recruiter:\s*([A-Z][A-Za-z\s]+)/i);
      if (recruiterMatch && recruiterMatch[1]) {
        const name = recruiterMatch[1].trim();
        if (name.length > 2 && !name.includes(":") && !name.match(/^(Upline|SMD|CEO|Spouse)/i)) {
          return { name, code: null };
        }
      }
      const lines = pageText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Recruiter:") {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.length > 2 && !nextLine.includes(":") && !nextLine.match(/^(Upline|SMD|CEO|Spouse)/i)) {
            return { name: nextLine, code: null };
          }
        }
      }
      const rows = Array.from(document.querySelectorAll("tr, div.row, div"));
      for (const row of rows) {
        const text2 = row.textContent || "";
        if (text2.includes("Recruiter:")) {
          const match = text2.match(/Recruiter:\s*([A-Z][A-Za-z\s]+?)(?=Upline|Spouse|$)/i);
          if (match && match[1]) {
            const name = match[1].trim();
            if (name.length > 2) {
              return { name, code: null };
            }
          }
        }
      }
      return { name: null, code: null };
    });
    if (uplineData && uplineData.name) {
      let cleanName = uplineData.name.replace(/\n/g, " ").replace(/Upline\s*(SMD|CEO|EVC|NSD|RVP)?/gi, "").replace(/\s+/g, " ").trim();
      console.log(`[Hierarchy Tool] Found recruiter for ${agentCode}: ${cleanName}`);
      return { uplineCode: null, uplineName: cleanName };
    }
    console.log(`[Hierarchy Tool] No recruiter found for ${agentCode} (root agent)`);
    return { uplineCode: null, uplineName: null };
  } catch (error) {
    console.error(`[Hierarchy Tool] Error fetching upline for ${agentCode}:`, error);
    return { uplineCode: null, uplineName: null };
  }
}
async function fetchAgentUplines(page, agentCodes, onProgress) {
  const uplines = /* @__PURE__ */ new Map();
  console.log(`[Upline Leaders] Fetching uplines for ${agentCodes.length} agents...`);
  for (let i = 0; i < agentCodes.length; i++) {
    const agentCode = agentCodes[i];
    if (onProgress) {
      onProgress(i + 1, agentCodes.length, agentCode);
    }
    const upline = await fetchAgentUpline(page, agentCode);
    if (upline.uplineCode || upline.uplineName) {
      uplines.set(agentCode, { uplineCode: upline.uplineCode || "", uplineName: upline.uplineName });
    }
    if (i < agentCodes.length - 1) {
      await new Promise((r) => setTimeout(r, 1e3));
    }
  }
  console.log(`[Upline Leaders] Successfully fetched ${uplines.size} uplines out of ${agentCodes.length} agents`);
  return uplines;
}
async function fetchDownlineStatusWithHierarchy(agentId = "73DXR", teamType = "BASE_SHOP") {
  let browser = null;
  let page;
  try {
    console.log("[Downline Scraper] Starting downline status extraction with hierarchy...");
    ({ browser, page } = await launchBrowser());
    const loggedIn = await loginToMyWFG(page);
    if (!loggedIn) {
      throw new Error("Failed to login to MyWFG");
    }
    const result = await extractDownlineStatus(page, agentId, teamType);
    let uplines = /* @__PURE__ */ new Map();
    if (result.success && result.agents.length > 0) {
      console.log("[Downline Scraper] Fetching hierarchy from Upline Leaders report...");
      const agentCodes = result.agents.map((a) => a.agentCode);
      uplines = await fetchAgentUplines(page, agentCodes);
      console.log(`[Downline Scraper] Found uplines for ${uplines.size} agents`);
    }
    await browser.close();
    browser = null;
    return { ...result, uplines };
  } catch (error) {
    console.error("[Downline Scraper] Error:", error);
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      agents: [],
      runDate: "",
      reportInfo: "",
      uplines: /* @__PURE__ */ new Map(),
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function syncHierarchyFromMyWFG(db, schema, batchSize = 15) {
  try {
    console.log("[Hierarchy Sync] Starting hierarchy sync from MyWFG...");
    console.log(`[Hierarchy Sync] Using batch size: ${batchSize}`);
    const { eq: eq21, isNotNull: isNotNull2 } = await import("drizzle-orm");
    const allAgents = await db.select({
      id: schema.agents.id,
      agentCode: schema.agents.agentCode,
      firstName: schema.agents.firstName,
      lastName: schema.agents.lastName
    }).from(schema.agents).where(isNotNull2(schema.agents.agentCode));
    if (allAgents.length === 0) {
      console.log("[Hierarchy Sync] No agents found in database");
      return { success: true, updated: 0 };
    }
    console.log(`[Hierarchy Sync] Found ${allAgents.length} agents in database`);
    const agentCodeToId = /* @__PURE__ */ new Map();
    const agentNameToId = /* @__PURE__ */ new Map();
    const agentNameToCode = /* @__PURE__ */ new Map();
    for (const agent of allAgents) {
      if (agent.agentCode) {
        agentCodeToId.set(agent.agentCode, agent.id);
      }
      const fullName = `${agent.firstName || ""} ${agent.lastName || ""}`.trim().toUpperCase();
      const reverseName = `${agent.lastName || ""} ${agent.firstName || ""}`.trim().toUpperCase();
      const lastFirst = `${agent.lastName || ""}, ${agent.firstName || ""}`.trim().toUpperCase();
      if (fullName.length > 2) {
        agentNameToId.set(fullName, agent.id);
        agentNameToId.set(reverseName, agent.id);
        agentNameToId.set(lastFirst, agent.id);
        if (agent.agentCode) {
          agentNameToCode.set(fullName, agent.agentCode);
          agentNameToCode.set(reverseName, agent.agentCode);
          agentNameToCode.set(lastFirst, agent.agentCode);
        }
      }
    }
    const agentCodes = allAgents.map((a) => a.agentCode).filter(Boolean);
    const batches = [];
    for (let i = 0; i < agentCodes.length; i += batchSize) {
      batches.push(agentCodes.slice(i, i + batchSize));
    }
    console.log(`[Hierarchy Sync] Processing ${agentCodes.length} agents in ${batches.length} batches of ${batchSize}`);
    const allUplines = /* @__PURE__ */ new Map();
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`
[Hierarchy Sync] ========== BATCH ${batchIndex + 1}/${batches.length} (${batch.length} agents) ==========`);
      let browser = null;
      let page;
      try {
        ({ browser, page } = await launchBrowser());
        console.log(`[Hierarchy Sync] Batch ${batchIndex + 1}: Logging in to MyWFG...`);
        const loggedIn = await loginToMyWFG(page);
        if (!loggedIn) {
          console.error(`[Hierarchy Sync] Batch ${batchIndex + 1}: Login failed, skipping batch`);
          await browser.close();
          continue;
        }
        console.log(`[Hierarchy Sync] Batch ${batchIndex + 1}: Login successful, processing agents...`);
        const batchUplines = await fetchAgentUplines(page, batch, (current, total, code) => {
          const overallCurrent = batchIndex * batchSize + current;
          console.log(`[Hierarchy Sync] Processing ${overallCurrent}/${agentCodes.length}: ${code}`);
        });
        for (const [code, upline] of Array.from(batchUplines.entries())) {
          allUplines.set(code, upline);
        }
        console.log(`[Hierarchy Sync] Batch ${batchIndex + 1}: Found ${batchUplines.size} uplines`);
        await browser.close();
        browser = null;
        if (batchIndex < batches.length - 1) {
          console.log(`[Hierarchy Sync] Waiting 5 seconds before next batch...`);
          await new Promise((r) => setTimeout(r, 5e3));
        }
      } catch (batchError) {
        console.error(`[Hierarchy Sync] Batch ${batchIndex + 1} error:`, batchError);
        if (browser) {
          await browser.close();
        }
        continue;
      }
    }
    console.log(`
[Hierarchy Sync] All batches complete. Found ${allUplines.size} total uplines.`);
    let updated = 0;
    for (const [agentCode, uplineData] of Array.from(allUplines.entries())) {
      const agentId = agentCodeToId.get(agentCode);
      let uplineAgentId;
      let uplineIdentifier = "";
      if (uplineData.uplineCode) {
        uplineAgentId = agentCodeToId.get(uplineData.uplineCode);
        uplineIdentifier = uplineData.uplineCode;
      }
      if (!uplineAgentId && uplineData.uplineName) {
        const normalizedName = uplineData.uplineName.trim().toUpperCase();
        uplineAgentId = agentNameToId.get(normalizedName);
        uplineIdentifier = uplineData.uplineName;
        if (!uplineAgentId) {
          const parts = normalizedName.split(/[\s,]+/).filter((p) => p.length > 0);
          if (parts.length >= 2) {
            const reversed = parts.slice(1).join(" ") + " " + parts[0];
            uplineAgentId = agentNameToId.get(reversed);
          }
        }
      }
      if (agentId && uplineAgentId) {
        await db.update(schema.agents).set({ uplineAgentId }).where(eq21(schema.agents.id, agentId));
        updated++;
        console.log(`[Hierarchy Sync] Updated ${agentCode} -> upline: ${uplineIdentifier}`);
      } else if (agentId && uplineIdentifier) {
        console.log(`[Hierarchy Sync] Upline "${uplineIdentifier}" not found in database for ${agentCode}`);
      }
    }
    console.log(`[Hierarchy Sync] Sync complete: ${updated} agents updated with upline relationships`);
    return { success: true, updated };
  } catch (error) {
    console.error("[Hierarchy Sync] Error:", error);
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function syncContactInfoFromMyWFG(db, schema, batchSize = 15) {
  try {
    console.log("[Contact Sync] Starting contact info sync from MyWFG...");
    console.log(`[Contact Sync] Using batch size: ${batchSize}`);
    const { isNull: isNull4, or: or3, eq: eq21 } = await import("drizzle-orm");
    const allAgents = await db.select({
      id: schema.agents.id,
      agentCode: schema.agents.agentCode,
      firstName: schema.agents.firstName,
      lastName: schema.agents.lastName,
      phone: schema.agents.phone,
      email: schema.agents.email
    }).from(schema.agents);
    const agentsWithMissingPhone = allAgents.filter(
      (a) => a.agentCode && (!a.phone || a.phone.trim() === "")
    );
    if (agentsWithMissingPhone.length === 0) {
      console.log("[Contact Sync] No agents with missing phone numbers");
      return { success: true, updated: 0 };
    }
    console.log(`[Contact Sync] Found ${agentsWithMissingPhone.length} agents with missing phone numbers`);
    const batches = [];
    for (let i = 0; i < agentsWithMissingPhone.length; i += batchSize) {
      batches.push(agentsWithMissingPhone.slice(i, i + batchSize));
    }
    console.log(`[Contact Sync] Processing ${agentsWithMissingPhone.length} agents in ${batches.length} batches of ${batchSize}`);
    let totalUpdated = 0;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`
[Contact Sync] ========== BATCH ${batchIndex + 1}/${batches.length} (${batch.length} agents) ==========`);
      let browser = null;
      let page;
      try {
        ({ browser, page } = await launchBrowser());
        console.log(`[Contact Sync] Batch ${batchIndex + 1}: Logging in to MyWFG...`);
        const loggedIn = await loginToMyWFG(page);
        if (!loggedIn) {
          console.error(`[Contact Sync] Batch ${batchIndex + 1}: Login failed, skipping batch`);
          await browser.close();
          continue;
        }
        console.log(`[Contact Sync] Batch ${batchIndex + 1}: Login successful, fetching contact info...`);
        for (let i = 0; i < batch.length; i++) {
          const agent = batch[i];
          const overallIndex = batchIndex * batchSize + i + 1;
          console.log(`[${overallIndex}/${agentsWithMissingPhone.length}] Fetching contact for ${agent.firstName} ${agent.lastName} (${agent.agentCode})...`);
          try {
            const contactInfo = await fetchAgentContactInfo(page, agent.agentCode);
            if (contactInfo.phone || contactInfo.email || contactInfo.homeAddress) {
              const updateData = {};
              if (contactInfo.phone) updateData.phone = contactInfo.phone;
              if (contactInfo.email && !agent.email) updateData.email = contactInfo.email;
              if (contactInfo.homeAddress) updateData.homeAddress = contactInfo.homeAddress;
              if (Object.keys(updateData).length > 0) {
                await db.update(schema.agents).set(updateData).where(eq21(schema.agents.id, agent.id));
                totalUpdated++;
                console.log(`  \u2192 Updated: phone=${contactInfo.phone || "N/A"}, email=${contactInfo.email || "N/A"}`);
              }
            } else {
              console.log(`  \u2192 No contact info found`);
            }
            await new Promise((r) => setTimeout(r, 500));
          } catch (agentError) {
            console.error(`  \u2192 Error: ${agentError}`);
          }
        }
        await browser.close();
        browser = null;
        console.log(`[Contact Sync] Batch ${batchIndex + 1} complete`);
        if (batchIndex < batches.length - 1) {
          console.log(`[Contact Sync] Waiting 5 seconds before next batch...`);
          await new Promise((r) => setTimeout(r, 5e3));
        }
      } catch (batchError) {
        console.error(`[Contact Sync] Batch ${batchIndex + 1} error:`, batchError);
        if (browser) {
          await browser.close();
        }
        continue;
      }
    }
    console.log(`
[Contact Sync] Sync complete: ${totalUpdated} agents updated with contact info`);
    return { success: true, updated: totalUpdated };
  } catch (error) {
    console.error("[Contact Sync] Error:", error);
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
var TITLE_LEVEL_TO_RANK;
var init_mywfg_downline_scraper = __esm({
  "server/mywfg-downline-scraper.ts"() {
    "use strict";
    init_browser();
    init_gmail_otp_v2();
    TITLE_LEVEL_TO_RANK = {
      "01": "TRAINING_ASSOCIATE",
      "1": "TRAINING_ASSOCIATE",
      "10": "ASSOCIATE",
      "15": "SENIOR_ASSOCIATE",
      "17": "MARKETING_DIRECTOR",
      "20": "SENIOR_MARKETING_DIRECTOR",
      "65": "EXECUTIVE_MARKETING_DIRECTOR",
      "75": "CEO_MARKETING_DIRECTOR",
      "87": "EXECUTIVE_VICE_CHAIRMAN",
      "90": "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
      "95": "FIELD_CHAIRMAN",
      "99": "EXECUTIVE_CHAIRMAN"
    };
  }
});

// server/mywfg-unified-sync.ts
function mustGetEnv5(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
function getMyWFGLoginCredentials2() {
  return {
    username: mustGetEnv5("MYWFG_USERNAME"),
    password: mustGetEnv5("MYWFG_PASSWORD")
  };
}
function getGmailCredentials3() {
  return {
    email: mustGetEnv5("MYWFG_EMAIL"),
    appPassword: mustGetEnv5("MYWFG_APP_PASSWORD")
  };
}
async function loginToMyWFG2(page) {
  const creds = getMyWFGLoginCredentials2();
  const gmailCreds = getGmailCredentials3();
  console.log("[Unified Sync] Navigating to MyWFG...");
  await page.goto("https://www.mywfg.com", { waitUntil: "networkidle2", timeout: 6e4 });
  await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 3e4 });
  console.log("[Unified Sync] Starting OTP session before login...");
  const otpSessionId = startOTPSession("mywfg-unified");
  const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
  if (!usernameInput) throw new Error("Username input not found");
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username, { delay: 30 });
  const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
  if (!passwordInput) throw new Error("Password input not found");
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(creds.password, { delay: 30 });
  console.log("[Unified Sync] Clicking login button (this triggers OTP)...");
  const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
  if (loginButton) {
    await Promise.all([
      loginButton.click(),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 6e4 }).catch(() => {
      })
    ]);
  } else {
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 6e4 }).catch(() => {
    });
  }
  await new Promise((r) => setTimeout(r, 5e3));
  try {
    await page.screenshot({ path: "/tmp/unified-sync-after-login.png", fullPage: true });
    console.log("[Unified Sync] Screenshot saved to /tmp/unified-sync-after-login.png");
  } catch (e) {
    console.log("[Unified Sync] Could not take screenshot:", e);
  }
  const pageText = await page.evaluate(() => document.body ? document.body.innerText : "");
  if (pageText.includes("ERROR OCCURRED") || pageText.includes("Bad Request")) {
    console.log("[Unified Sync] Error page detected, retrying...");
    clearUsedOTPs();
    await page.goto("https://www.mywfg.com", { waitUntil: "networkidle2", timeout: 6e4 });
    return loginToMyWFG2(page);
  }
  const pageContent = await page.content();
  const otpRequired = pageContent.includes("mywfgOtppswd") || pageText.includes("One-Time Password") || pageText.includes("Security Code") || pageText.includes("Validation Code");
  if (otpRequired) {
    console.log("[Unified Sync] OTP required, waiting for email (session-based, 180s timeout)...");
    const pagePrefix = await page.evaluate(() => {
      const bodyText = document.body ? document.body.innerText : "";
      const prefixMatch = bodyText.match(/(\d{4})\s*-/);
      return prefixMatch ? prefixMatch[1] : null;
    });
    if (pagePrefix) {
      console.log(`[Unified Sync] Page shows OTP prefix: ${pagePrefix}`);
    } else {
      console.log("[Unified Sync] Warning: Could not extract OTP prefix from page");
    }
    const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3, pagePrefix || void 0);
    if (!otpResult?.success || !otpResult?.otp) {
      throw new Error(`Failed to get OTP: ${otpResult?.error}`);
    }
    console.log(`[Unified Sync] \u2713 OTP received: ${otpResult.otp}`);
    const otpToEnter = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
    console.log(`[Unified Sync] Entering OTP digits: ${otpToEnter}`);
    let otpInput = await page.$('input[id="mywfgOtppswd"]');
    if (!otpInput) otpInput = await page.$('input[name="otp"]');
    if (!otpInput) otpInput = await page.$('input[name="otpCode"]');
    if (!otpInput) otpInput = await page.$('input[placeholder*="code" i]');
    if (!otpInput) {
      const inputs = await page.$$("input");
      for (const input of inputs) {
        const type = await input.evaluate((el) => el.getAttribute("type"));
        const id = await input.evaluate((el) => el.id);
        const isVisible = await input.isVisible();
        if (!isVisible) continue;
        if (id?.toLowerCase().includes("username")) continue;
        if (id?.toLowerCase().includes("password")) continue;
        if (type === "hidden" || type === "password") continue;
        if (type === "text" || type === "tel" || type === null) {
          otpInput = input;
          console.log(`[Unified Sync] Found OTP input: type=${type}, id=${id}`);
          break;
        }
      }
    }
    if (otpInput) {
      await otpInput.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await otpInput.type(otpToEnter, { delay: 50 });
      console.log("[Unified Sync] OTP entered");
      await new Promise((r) => setTimeout(r, 500));
      try {
        await page.screenshot({ path: "/tmp/unified-sync-otp-entered.png", fullPage: true });
      } catch (e) {
      }
      let submitBtn = await page.$('button[id="mywfgTheylive"]');
      if (!submitBtn) submitBtn = await page.$('button[id="mywfgTheyLive"]');
      if (!submitBtn) {
        const buttons = await page.$$("button");
        for (const btn of buttons) {
          const text2 = await btn.evaluate((el) => el.textContent?.trim().toLowerCase());
          if (text2 === "submit") {
            submitBtn = btn;
            break;
          }
        }
      }
      if (!submitBtn) submitBtn = await page.$('button[type="submit"]');
      if (!submitBtn) submitBtn = await page.$('input[type="submit"]');
      if (submitBtn) {
        console.log("[Unified Sync] Clicking submit button...");
        await submitBtn.click();
        try {
          await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 3e4 });
        } catch (e) {
          console.log("[Unified Sync] Navigation wait completed or timed out");
        }
      } else {
        console.log("[Unified Sync] Warning: Submit button not found, trying Enter key");
        await page.keyboard.press("Enter");
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 3e4 }).catch(() => {
        });
      }
      await new Promise((r) => setTimeout(r, 3e3));
      try {
        await page.screenshot({ path: "/tmp/unified-sync-after-otp-submit.png", fullPage: true });
      } catch (e) {
      }
    } else {
      console.log("[Unified Sync] Warning: OTP input not found");
      try {
        await page.screenshot({ path: "/tmp/unified-sync-otp-input-not-found.png", fullPage: true });
      } catch (e) {
      }
    }
  }
  const currentUrl = page.url();
  const isLoggedIn = currentUrl.includes("mywfg.com") && !currentUrl.includes("login") && !currentUrl.includes("signin");
  try {
    await page.screenshot({ path: "/tmp/unified-sync-login-result.png" });
  } catch (e) {
  }
  console.log(`[Unified Sync] Login ${isLoggedIn ? "successful" : "failed"} (URL: ${currentUrl})`);
  return isLoggedIn;
}
async function runUnifiedMyWFGSync() {
  const startTime = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[Unified Sync] Starting at ${startTime}`);
  let browser = null;
  let page;
  try {
    console.log("[Unified Sync] Step 1: Login to MyWFG");
    ({ browser, page } = await launchBrowser());
    const loginSuccess = await loginToMyWFG2(page);
    if (!loginSuccess) {
      throw new Error("Login failed");
    }
    console.log("[Unified Sync] Login successful");
    console.log("[Unified Sync] Step 2: Get session cookies");
    const cookies = await page.cookies();
    console.log(`[Unified Sync] Got ${cookies.length} cookies`);
    await browser.close();
    browser = null;
    console.log("[Unified Sync] Step 3: Fetch downline status");
    const downlineResult = await fetchDownlineStatus("73DXR", "BASE_SHOP", cookies);
    if (!downlineResult.success) {
      throw new Error(`Downline fetch failed: ${downlineResult.error}`);
    }
    console.log(`[Unified Sync] Found ${downlineResult.agents.length} agents`);
    console.log("[Unified Sync] Step 4: Sync to database");
    const db = await getDb2();
    if (!db) {
      throw new Error("Database connection failed");
    }
    const syncResult = await syncAgentsFromDownlineStatus(db, schema_exports, downlineResult, "BASE_SHOP");
    await db.insert(mywfgSyncLogs).values({
      syncType: "DOWNLINE_STATUS",
      status: "SUCCESS",
      recordsProcessed: downlineResult.agents.length,
      errorMessage: `Synced ${downlineResult.agents.length} agents`
    });
    console.log(`[Unified Sync] Complete! Found ${downlineResult.agents.length} agents, updated ${syncResult.updated}`);
    return {
      success: true,
      agentsFound: downlineResult.agents.length,
      agentsUpdated: syncResult.updated
    };
  } catch (error) {
    console.error("[Unified Sync] Error:", error);
    try {
      const db = await getDb2();
      if (db) {
        await db.insert(mywfgSyncLogs).values({
          syncType: "DOWNLINE_STATUS",
          status: "FAILED",
          recordsProcessed: 0,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } catch (e) {
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
var init_mywfg_unified_sync = __esm({
  "server/mywfg-unified-sync.ts"() {
    "use strict";
    init_browser();
    init_gmail_otp_v2();
    init_db();
    init_schema();
    init_mywfg_downline_scraper();
  }
});

// server/xcel-exam-scraper.ts
import Imap2 from "imap";
import { simpleParser as simpleParser2 } from "mailparser";
import * as cheerio from "cheerio";
import { eq as eq13, and as and10, sql as sql9 } from "drizzle-orm";
function mustGetEnv6(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
function createImapConfig(credentials2) {
  return {
    user: credentials2.email,
    password: credentials2.appPassword,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  };
}
function getXcelEmailCredentials() {
  return {
    email: mustGetEnv6("MYWFG_EMAIL"),
    appPassword: mustGetEnv6("MYWFG_APP_PASSWORD")
  };
}
function parseXcelDate(dateStr) {
  if (!dateStr || dateStr.trim() === "" || dateStr === "-" || dateStr === "N/A") {
    return null;
  }
  const mmddyyyy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monDdYyyy = dateStr.match(/([a-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (monDdYyyy) {
    const [, monthName, day, year] = monDdYyyy;
    const monthIndex = monthNames.indexOf(monthName.toLowerCase().substring(0, 3));
    if (monthIndex >= 0) {
      return new Date(parseInt(year), monthIndex, parseInt(day));
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}
function extractStateFromCourse(course) {
  const statePatterns = [
    /^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)/i,
    /^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s/i
  ];
  for (const pattern of statePatterns) {
    const match = course.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}
function parsePercentage(percentStr) {
  if (!percentStr || percentStr.trim() === "" || percentStr === "-" || percentStr === "N/A") {
    return 0;
  }
  const match = percentStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}
function parseXcelEmailHtml(html) {
  const records = [];
  const $ = cheerio.load(html);
  $("table").each((_, table) => {
    const $table = $(table);
    const headers = [];
    $table.find("tr:first-child th, tr:first-child td").each((_idx, cell) => {
      headers.push($(cell).text().trim().toLowerCase());
    });
    const hasFirstName = headers.some((h) => h.includes("first") && h.includes("name"));
    const hasLastName = headers.some((h) => h.includes("last") && h.includes("name"));
    const hasCourse = headers.some((h) => h.includes("course"));
    if (!hasFirstName && !hasLastName && !hasCourse) {
      if (headers.length >= 5) {
      } else {
        return;
      }
    }
    const firstNameIdx = headers.findIndex((h) => h.includes("first") && h.includes("name"));
    const lastNameIdx = headers.findIndex((h) => h.includes("last") && h.includes("name"));
    const courseIdx = headers.findIndex((h) => h.includes("course"));
    const dateEnrolledIdx = headers.findIndex((h) => h.includes("enrolled") || h.includes("date enrolled"));
    const lastLoginIdx = headers.findIndex((h) => h.includes("login") || h.includes("last log"));
    const pleCompleteIdx = headers.findIndex((h) => h.includes("ple") || h.includes("complete") || h.includes("%"));
    const preparedToPassIdx = headers.findIndex((h) => h.includes("prepared") || h.includes("pass"));
    $table.find("tr").slice(1).each((_2, row) => {
      const cells = [];
      $(row).find("td").each((_idx, cell) => {
        cells.push($(cell).text().trim());
      });
      if (cells.length < 3) return;
      const firstName = firstNameIdx >= 0 ? cells[firstNameIdx] : cells[0];
      const lastName = lastNameIdx >= 0 ? cells[lastNameIdx] : cells[1];
      const course = courseIdx >= 0 ? cells[courseIdx] : cells[2];
      if (!firstName || !lastName || !course) return;
      const dateEnrolledStr = dateEnrolledIdx >= 0 ? cells[dateEnrolledIdx] : cells[3] || null;
      const lastLoginStr = lastLoginIdx >= 0 ? cells[lastLoginIdx] : cells[4] || null;
      const pleCompleteStr = pleCompleteIdx >= 0 ? cells[pleCompleteIdx] : cells[5] || null;
      const preparedToPassStr = preparedToPassIdx >= 0 ? cells[preparedToPassIdx] : cells[6] || null;
      records.push({
        firstName,
        lastName,
        course,
        state: extractStateFromCourse(course),
        dateEnrolled: parseXcelDate(dateEnrolledStr),
        lastLogin: parseXcelDate(lastLoginStr),
        pleCompletePercent: parsePercentage(pleCompleteStr),
        preparedToPass: preparedToPassStr || null
      });
    });
  });
  if (records.length === 0) {
    console.log("[XCEL] No table found, attempting plain text parsing...");
  }
  return records;
}
function parseXcelEmailText(text2) {
  const records = [];
  const lines = text2.split("\n");
  let currentRecord = {};
  for (const line of lines) {
    const trimmed = line.trim();
    const nameMatch = trimmed.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
    if (nameMatch && !trimmed.includes(":")) {
      const parts = trimmed.split(/\s{2,}|\t/);
      if (parts.length >= 3) {
        records.push({
          firstName: parts[0] || "",
          lastName: parts[1] || "",
          course: parts[2] || "",
          state: extractStateFromCourse(parts[2] || ""),
          dateEnrolled: parseXcelDate(parts[3] || null),
          lastLogin: parseXcelDate(parts[4] || null),
          pleCompletePercent: parsePercentage(parts[5] || null),
          preparedToPass: parts[6] || null
        });
      }
    }
  }
  return records;
}
async function fetchXcelEmail(credentials2) {
  return new Promise((resolve2) => {
    const imap = new Imap2(createImapConfig(credentials2));
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err) => {
        if (err) {
          imap.end();
          resolve2({ success: false, error: `Failed to open inbox: ${err.message}` });
          return;
        }
        const sinceDate = /* @__PURE__ */ new Date();
        sinceDate.setDate(sinceDate.getDate() - 7);
        const sinceDateStr = sinceDate.toISOString().split("T")[0];
        const searchCriteria = [
          ["SINCE", sinceDateStr],
          ["SUBJECT", "XCEL Solutions: WFG_Zaid_Shopeju_Group"]
        ];
        imap.search(searchCriteria, (searchErr, results) => {
          if (searchErr) {
            imap.end();
            resolve2({ success: false, error: `Search failed: ${searchErr.message}` });
            return;
          }
          if (!results || results.length === 0) {
            imap.end();
            resolve2({ success: false, error: "No XCEL Solutions emails found in the last 7 days" });
            return;
          }
          const latestUid = results[results.length - 1];
          const fetch2 = imap.fetch([latestUid], { bodies: "", markSeen: false });
          fetch2.on("message", (msg) => {
            msg.on("body", (stream) => {
              simpleParser2(stream, (parseErr, parsed) => {
                if (parseErr) {
                  resolve2({ success: false, error: `Parse failed: ${parseErr.message}` });
                  return;
                }
                resolve2({
                  success: true,
                  html: parsed.html || void 0,
                  text: parsed.text || void 0,
                  subject: parsed.subject,
                  receivedAt: parsed.date
                });
              });
            });
          });
          fetch2.once("error", (fetchErr) => {
            resolve2({ success: false, error: `Fetch failed: ${fetchErr.message}` });
          });
          fetch2.once("end", () => {
            imap.end();
          });
        });
      });
    });
    imap.once("error", (err) => {
      resolve2({ success: false, error: `Connection failed: ${err.message}` });
    });
    imap.connect();
  });
}
async function matchAgentByName(firstName, lastName) {
  const db = await getDb2();
  if (!db) return null;
  const normalizedFirst = firstName.toLowerCase().trim();
  const normalizedLast = lastName.toLowerCase().trim();
  const exactMatch = await db.select({ id: agents.id }).from(agents).where(
    and10(
      sql9`LOWER(${agents.firstName}) = ${normalizedFirst}`,
      sql9`LOWER(${agents.lastName}) = ${normalizedLast}`
    )
  ).limit(1);
  if (exactMatch.length > 0) {
    return exactMatch[0].id;
  }
  const partialMatch = await db.select({ id: agents.id }).from(agents).where(
    and10(
      sql9`LOWER(${agents.firstName}) LIKE ${normalizedFirst + "%"}`,
      sql9`LOWER(${agents.lastName}) = ${normalizedLast}`
    )
  ).limit(1);
  if (partialMatch.length > 0) {
    return partialMatch[0].id;
  }
  const fuzzyMatch = await db.select({ id: agents.id }).from(agents).where(
    and10(
      sql9`LOWER(${agents.firstName}) LIKE ${"%" + normalizedFirst + "%"}`,
      sql9`LOWER(${agents.lastName}) LIKE ${"%" + normalizedLast + "%"}`
    )
  ).limit(1);
  return fuzzyMatch.length > 0 ? fuzzyMatch[0].id : null;
}
async function syncExamPrepFromEmail() {
  console.log("[XCEL] Starting exam prep sync from email...");
  const credentials2 = getXcelEmailCredentials();
  if (!credentials2.appPassword) {
    return {
      success: false,
      error: "Gmail app password not configured",
      emailFound: false,
      recordsFound: 0,
      recordsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      unmatchedAgents: []
    };
  }
  try {
    const { sendEmailAlert: sendEmailAlert2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
    await sendEmailAlert2({
      subject: "XCEL Exam Prep Sync - Credential Access",
      message: "The system is accessing Gmail credentials to sync XCEL Solutions exam prep data."
    });
  } catch (e) {
    console.error("[XCEL] Failed to send credential access alert:", e);
  }
  const emailResult = await fetchXcelEmail(credentials2);
  if (!emailResult.success) {
    return {
      success: false,
      error: emailResult.error,
      emailFound: false,
      recordsFound: 0,
      recordsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      unmatchedAgents: []
    };
  }
  console.log(`[XCEL] Found email: ${emailResult.subject}`);
  let records = [];
  if (emailResult.html) {
    records = parseXcelEmailHtml(emailResult.html);
  }
  if (records.length === 0 && emailResult.text) {
    records = parseXcelEmailText(emailResult.text);
  }
  console.log(`[XCEL] Parsed ${records.length} exam prep records`);
  if (records.length === 0) {
    return {
      success: true,
      emailFound: true,
      emailSubject: emailResult.subject,
      emailReceivedAt: emailResult.receivedAt,
      recordsFound: 0,
      recordsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      unmatchedAgents: []
    };
  }
  const db = await getDb2();
  if (!db) {
    return {
      success: false,
      error: "Database connection failed",
      emailFound: true,
      emailSubject: emailResult.subject,
      emailReceivedAt: emailResult.receivedAt,
      recordsFound: records.length,
      recordsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      unmatchedAgents: []
    };
  }
  let recordsMatched = 0;
  let recordsUpdated = 0;
  let recordsCreated = 0;
  const unmatchedAgents = [];
  for (const record of records) {
    const agentId = await matchAgentByName(record.firstName, record.lastName);
    if (agentId) {
      recordsMatched++;
    } else {
      unmatchedAgents.push(`${record.firstName} ${record.lastName}`);
    }
    const existing = await db.select().from(agentExamPrep).where(
      and10(
        sql9`LOWER(${agentExamPrep.xcelFirstName}) = ${record.firstName.toLowerCase()}`,
        sql9`LOWER(${agentExamPrep.xcelLastName}) = ${record.lastName.toLowerCase()}`,
        eq13(agentExamPrep.course, record.course)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(agentExamPrep).set({
        agentId,
        lastLogin: record.lastLogin,
        pleCompletePercent: record.pleCompletePercent,
        preparedToPass: record.preparedToPass,
        lastSyncedAt: /* @__PURE__ */ new Date(),
        emailSubject: emailResult.subject,
        emailReceivedAt: emailResult.receivedAt
      }).where(eq13(agentExamPrep.id, existing[0].id));
      recordsUpdated++;
    } else {
      const insertData = {
        xcelFirstName: record.firstName,
        xcelLastName: record.lastName,
        course: record.course,
        pleCompletePercent: record.pleCompletePercent,
        lastSyncedAt: /* @__PURE__ */ new Date()
      };
      if (agentId) insertData.agentId = agentId;
      if (record.state) insertData.state = record.state;
      if (record.dateEnrolled) insertData.dateEnrolled = record.dateEnrolled.toISOString().split("T")[0];
      if (record.lastLogin) insertData.lastLogin = record.lastLogin;
      if (record.preparedToPass) insertData.preparedToPass = record.preparedToPass;
      if (emailResult.subject) insertData.emailSubject = emailResult.subject;
      if (emailResult.receivedAt) insertData.emailReceivedAt = emailResult.receivedAt;
      await db.insert(agentExamPrep).values(insertData);
      recordsCreated++;
    }
  }
  console.log(`[XCEL] Sync complete: ${recordsMatched} matched, ${recordsUpdated} updated, ${recordsCreated} created`);
  return {
    success: true,
    emailFound: true,
    emailSubject: emailResult.subject,
    emailReceivedAt: emailResult.receivedAt,
    recordsFound: records.length,
    recordsMatched,
    recordsUpdated,
    recordsCreated,
    unmatchedAgents
  };
}
async function getExamPrepRecords() {
  const db = await getDb2();
  if (!db) return [];
  const records = await db.select({
    id: agentExamPrep.id,
    agentId: agentExamPrep.agentId,
    xcelFirstName: agentExamPrep.xcelFirstName,
    xcelLastName: agentExamPrep.xcelLastName,
    course: agentExamPrep.course,
    state: agentExamPrep.state,
    dateEnrolled: agentExamPrep.dateEnrolled,
    lastLogin: agentExamPrep.lastLogin,
    pleCompletePercent: agentExamPrep.pleCompletePercent,
    preparedToPass: agentExamPrep.preparedToPass,
    lastSyncedAt: agentExamPrep.lastSyncedAt,
    isActive: agentExamPrep.isActive,
    agentCode: agents.agentCode,
    agentFirstName: agents.firstName,
    agentLastName: agents.lastName,
    uplineAgentId: agents.uplineAgentId
  }).from(agentExamPrep).leftJoin(agents, eq13(agentExamPrep.agentId, agents.id)).orderBy(agentExamPrep.lastSyncedAt);
  const allAgents = await db.select({
    id: agents.id,
    firstName: agents.firstName,
    lastName: agents.lastName
  }).from(agents);
  const agentMap = new Map(allAgents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));
  return records.map((record) => ({
    ...record,
    recruiterName: record.uplineAgentId ? agentMap.get(record.uplineAgentId) || null : null
  }));
}
var init_xcel_exam_scraper = __esm({
  "server/xcel-exam-scraper.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/sync-service.ts
var sync_service_exports = {};
__export(sync_service_exports, {
  getLastSyncTime: () => getLastSyncTime,
  runFullSync: () => runFullSync,
  scheduledExamPrepSync: () => scheduledExamPrepSync,
  scheduledSync: () => scheduledSync,
  setLastSyncTime: () => setLastSyncTime,
  syncExamPrepData: () => syncExamPrepData,
  syncMyWFGData: () => syncMyWFGData,
  syncTransamericaData: () => syncTransamericaData
});
async function syncMyWFGData() {
  const timestamp2 = /* @__PURE__ */ new Date();
  console.log(`[Sync] Starting MyWFG sync at ${timestamp2.toISOString()}`);
  try {
    const result = await runUnifiedMyWFGSync();
    if (!result.success) {
      return {
        success: false,
        platform: "MyWFG",
        error: result.error || "Failed to sync MyWFG data",
        timestamp: timestamp2
      };
    }
    console.log(`[Sync] MyWFG sync completed - Found: ${result.agentsFound}, Updated: ${result.agentsUpdated}`);
    console.log("[Sync] Starting hierarchy sync...");
    let hierarchyUpdated = 0;
    try {
      const db = await getDb2();
      if (db) {
        const hierarchyResult = await syncHierarchyFromMyWFG(db, schema_exports, 15);
        if (hierarchyResult.success) {
          hierarchyUpdated = hierarchyResult.updated;
          console.log(`[Sync] Hierarchy sync completed - Updated: ${hierarchyUpdated} upline relationships`);
        } else {
          console.log(`[Sync] Hierarchy sync failed: ${hierarchyResult.error}`);
        }
      }
    } catch (hierarchyError) {
      console.error("[Sync] Hierarchy sync error:", hierarchyError);
    }
    return {
      success: true,
      platform: "MyWFG",
      timestamp: timestamp2,
      data: {
        message: "Sync completed",
        agentsUpdated: result.agentsUpdated,
        hierarchyUpdated,
        totalAgents: result.agentsFound
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Sync] MyWFG sync failed:", errorMessage);
    return {
      success: false,
      platform: "MyWFG",
      error: errorMessage,
      timestamp: timestamp2
    };
  }
}
async function syncTransamericaData() {
  const timestamp2 = /* @__PURE__ */ new Date();
  console.log(`[Sync] Starting Transamerica sync at ${timestamp2.toISOString()}`);
  let browser;
  let page;
  try {
    const loginResult = await loginToTransamericaWithCache();
    if (!loginResult.success) {
      return {
        success: false,
        platform: "Transamerica",
        error: loginResult.error,
        timestamp: timestamp2
      };
    }
    ({ browser, page } = await launchBrowser());
    if (loginResult.sessionCookies) {
      await page.setCookie(...loginResult.sessionCookies);
    }
    await navigateToLifeAccess(page);
    const alerts = await fetchPolicyAlerts(page);
    await browser.close();
    console.log("[Sync] Transamerica sync completed successfully");
    return {
      success: true,
      platform: "Transamerica",
      timestamp: timestamp2,
      data: { alerts, alertCount: alerts.length }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Sync] Transamerica sync failed:", errorMessage);
    if (browser) await browser.close();
    return {
      success: false,
      platform: "Transamerica",
      error: errorMessage,
      timestamp: timestamp2
    };
  }
}
async function runFullSync() {
  console.log("[Sync] Starting full sync...");
  try {
    const { alertSyncTriggered: alertSyncTriggered2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
    await alertSyncTriggered2(["MyWFG", "Transamerica"]);
  } catch (e) {
    console.error("[Sync] Failed to send sync triggered alert:", e);
  }
  const results = [];
  const mywfgResult = await syncMyWFGData();
  results.push(mywfgResult);
  const transamericaResult = await syncTransamericaData();
  results.push(transamericaResult);
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    const failureMessages = failures.map((f) => `${f.platform}: ${f.error}`).join("\n");
    await notifyOwner({
      title: "Sync Failed",
      content: `The following platforms failed to sync:
${failureMessages}`
    });
  }
  const transamericaData = results.find((r) => r.platform === "Transamerica");
  if (transamericaData?.success && transamericaData.data?.alertCount > 0) {
    await notifyOwner({
      title: "New Transamerica Alerts",
      content: `Found ${transamericaData.data.alertCount} policy alerts. Please review the dashboard for details.`
    });
  }
  try {
    const { alertSyncCompleted: alertSyncCompleted2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
    await alertSyncCompleted2(results.map((r) => ({
      platform: r.platform,
      success: r.success,
      error: r.error
    })));
  } catch (e) {
    console.error("[Sync] Failed to send sync completed alert:", e);
  }
  try {
    const { getPoliciesWithAnniversaryInDays: getPoliciesWithAnniversaryInDays2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { alertPolicyAnniversary: alertPolicyAnniversary2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
    const policiesIn7Days = await getPoliciesWithAnniversaryInDays2(7);
    if (policiesIn7Days.length > 0) {
      console.log(`[Sync] Found ${policiesIn7Days.length} policies with anniversaries in 7 days`);
      await alertPolicyAnniversary2(policiesIn7Days);
      console.log(`[Sync] Sent anniversary reminder email for ${policiesIn7Days.length} policies`);
    } else {
      console.log("[Sync] No policy anniversaries in 7 days");
    }
  } catch (e) {
    console.error("[Sync] Failed to send anniversary reminders:", e);
  }
  try {
    const {
      getPoliciesWithAnniversaryToday: getPoliciesWithAnniversaryToday2,
      getClientEmailByName: getClientEmailByName2,
      getAgentContactInfo: getAgentContactInfo2,
      hasAnniversaryGreetingBeenSent: hasAnniversaryGreetingBeenSent2,
      recordAnniversaryGreetingSent: recordAnniversaryGreetingSent2
    } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { sendClientAnniversaryGreeting: sendClientAnniversaryGreeting2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
    const todayAnniversaries = await getPoliciesWithAnniversaryToday2();
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    if (todayAnniversaries.length > 0) {
      console.log(`[Sync] Found ${todayAnniversaries.length} policies with anniversaries TODAY`);
      let sentCount = 0;
      let skippedCount = 0;
      let noEmailCount = 0;
      for (const policy of todayAnniversaries) {
        const alreadySent = await hasAnniversaryGreetingBeenSent2(policy.policyNumber, currentYear);
        if (alreadySent) {
          skippedCount++;
          continue;
        }
        const nameParts = policy.ownerName.split(" ");
        const firstName = nameParts[0] || "Valued";
        const lastName = nameParts.slice(1).join(" ") || "Client";
        const clientEmail = await getClientEmailByName2(firstName, lastName);
        if (!clientEmail) {
          noEmailCount++;
          console.log(`[Sync] No email found for client: ${policy.ownerName}`);
          continue;
        }
        let agentInfo = { name: "Your Financial Professional", email: null, phone: null };
        if (policy.writingAgentCode) {
          const agentData = await getAgentContactInfo2(policy.writingAgentCode);
          if (agentData) {
            agentInfo = agentData;
          }
        }
        const success = await sendClientAnniversaryGreeting2({
          email: clientEmail,
          firstName,
          lastName,
          policyNumber: policy.policyNumber,
          policyAge: policy.policyAge,
          faceAmount: policy.faceAmount,
          productType: policy.productType,
          agentName: agentInfo.name,
          agentPhone: agentInfo.phone || void 0,
          agentEmail: agentInfo.email || void 0
        });
        if (success) {
          sentCount++;
          await recordAnniversaryGreetingSent2(policy.policyNumber, currentYear, clientEmail);
        }
        await new Promise((resolve2) => setTimeout(resolve2, 500));
      }
      console.log(`[Sync] Client anniversary greetings: ${sentCount} sent, ${skippedCount} already sent, ${noEmailCount} no email`);
    } else {
      console.log("[Sync] No policy anniversaries today");
    }
  } catch (e) {
    console.error("[Sync] Failed to send client anniversary greetings:", e);
  }
  console.log("[Sync] Full sync completed");
  return results;
}
function getLastSyncTime() {
  return lastSyncTime;
}
function setLastSyncTime(time) {
  lastSyncTime = time;
}
async function syncExamPrepData() {
  const timestamp2 = /* @__PURE__ */ new Date();
  console.log(`[Sync] Starting Exam Prep sync at ${timestamp2.toISOString()}`);
  try {
    const result = await syncExamPrepFromEmail();
    if (!result.success) {
      return {
        success: false,
        platform: "XCEL Exam Prep",
        error: result.error || "Failed to sync exam prep data",
        timestamp: timestamp2
      };
    }
    console.log(`[Sync] Exam Prep sync completed - Found: ${result.recordsFound}, Matched: ${result.recordsMatched}, Created: ${result.recordsCreated}, Updated: ${result.recordsUpdated}`);
    if (result.unmatchedAgents.length > 0) {
      console.log(`[Sync] Unmatched agents: ${result.unmatchedAgents.join(", ")}`);
    }
    return {
      success: true,
      platform: "XCEL Exam Prep",
      timestamp: timestamp2,
      data: {
        recordsFound: result.recordsFound,
        recordsMatched: result.recordsMatched,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        unmatchedAgents: result.unmatchedAgents
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Sync] Exam Prep sync failed:", errorMessage);
    return {
      success: false,
      platform: "XCEL Exam Prep",
      error: errorMessage,
      timestamp: timestamp2
    };
  }
}
async function scheduledSync() {
  console.log("[Sync] Running scheduled sync...");
  const results = await runFullSync();
  setLastSyncTime(/* @__PURE__ */ new Date());
  return results;
}
async function scheduledExamPrepSync() {
  console.log("[Sync] Running scheduled exam prep sync (8am EST)...");
  const result = await syncExamPrepData();
  if (result.success && result.data) {
    const { recordsFound, recordsMatched, unmatchedAgents } = result.data;
    if (recordsFound > 0) {
      await notifyOwner({
        title: "Exam Prep Sync Complete",
        content: `Found ${recordsFound} exam prep records, matched ${recordsMatched} to agents.${unmatchedAgents.length > 0 ? `

Unmatched agents: ${unmatchedAgents.join(", ")}` : ""}`
      });
    }
  } else if (!result.success) {
    await notifyOwner({
      title: "Exam Prep Sync Failed",
      content: `Failed to sync exam prep data: ${result.error}`
    });
  }
  return result;
}
var lastSyncTime;
var init_sync_service = __esm({
  "server/sync-service.ts"() {
    "use strict";
    init_auto_login_transamerica();
    init_notification();
    init_browser();
    init_mywfg_downline_scraper();
    init_mywfg_unified_sync();
    init_xcel_exam_scraper();
    init_db();
    init_schema();
    lastSyncTime = null;
  }
});

// server/gmail-otp.ts
var gmail_otp_exports = {};
__export(gmail_otp_exports, {
  fetchMyWFGOTP: () => fetchMyWFGOTP,
  fetchRecentOTP: () => fetchRecentOTP,
  fetchTransamericaOTP: () => fetchTransamericaOTP,
  getMyWFGCredentials: () => getMyWFGCredentials,
  getTransamericaCredentials: () => getTransamericaCredentials2,
  verifyGmailCredentials: () => verifyGmailCredentials,
  waitForOTP: () => waitForOTP
});
import Imap3 from "imap";
import { simpleParser as simpleParser3 } from "mailparser";
function createImapConfig2(credentials2) {
  return {
    user: credentials2.email,
    password: credentials2.appPassword,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  };
}
async function verifyGmailCredentials(credentials2) {
  return new Promise((resolve2) => {
    const imap = new Imap3(createImapConfig2(credentials2));
    imap.once("ready", () => {
      console.log(`[Gmail] Successfully connected to ${credentials2.email}`);
      imap.end();
      resolve2({ success: true });
    });
    imap.once("error", (err) => {
      console.error(`[Gmail] Connection error for ${credentials2.email}:`, err.message);
      resolve2({ success: false, error: err.message });
    });
    imap.connect();
  });
}
async function fetchRecentOTP(credentials2, senderPattern, subjectPattern, maxAgeMinutes = 5) {
  return new Promise((resolve2) => {
    const imap = new Imap3(createImapConfig2(credentials2));
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err, box) => {
        if (err) {
          imap.end();
          resolve2({ success: false, error: `Failed to open inbox: ${err.message}` });
          return;
        }
        const sinceDate = /* @__PURE__ */ new Date();
        sinceDate.setMinutes(sinceDate.getMinutes() - maxAgeMinutes);
        const sinceDateStr = sinceDate.toISOString().split("T")[0];
        const searchCriteria = [
          ["SINCE", sinceDateStr]
        ];
        if (senderPattern.toLowerCase() === "transamerica") {
          searchCriteria.push(["FROM", "WebHelp"]);
          searchCriteria.push(["SUBJECT", "Validation Code"]);
        } else {
          searchCriteria.push(["FROM", senderPattern]);
        }
        imap.search(searchCriteria, (searchErr, results) => {
          if (searchErr) {
            imap.end();
            resolve2({ success: false, error: `Search failed: ${searchErr.message}` });
            return;
          }
          if (!results || results.length === 0) {
            imap.end();
            resolve2({ success: false, error: "No recent OTP emails found" });
            return;
          }
          const latestUid = results[results.length - 1];
          const fetch2 = imap.fetch([latestUid], { bodies: "", markSeen: true });
          fetch2.on("message", (msg) => {
            msg.on("body", (stream) => {
              simpleParser3(stream, (parseErr, parsed) => {
                if (parseErr) {
                  resolve2({ success: false, error: `Parse failed: ${parseErr.message}` });
                  return;
                }
                const body = parsed.text || parsed.html || "";
                const otp = extractOTPFromText2(body);
                if (otp) {
                  resolve2({
                    success: true,
                    otp,
                    subject: parsed.subject,
                    from: parsed.from?.text,
                    receivedAt: parsed.date
                  });
                } else {
                  resolve2({
                    success: false,
                    error: "Could not extract OTP from email",
                    subject: parsed.subject
                  });
                }
              });
            });
          });
          fetch2.once("error", (fetchErr) => {
            resolve2({ success: false, error: `Fetch failed: ${fetchErr.message}` });
          });
          fetch2.once("end", () => {
            imap.end();
          });
        });
      });
    });
    imap.once("error", (err) => {
      resolve2({ success: false, error: `Connection failed: ${err.message}` });
    });
    imap.connect();
  });
}
function extractOTPFromText2(text2) {
  const patterns = [
    /\d{4}-(\d{6})/,
    // XXXX-XXXXXX format - extract last 6 digits
    /\d{3}-(\d{6})/,
    // XXX-XXXXXX format - extract last 6 digits (fallback)
    /\b(\d{6})\b/,
    // 6-digit code (fallback)
    /code[:\s]+(\d{4,8})/i,
    // "code: 123456"
    /OTP[:\s]+(\d{4,8})/i
    // "OTP: 123456"
  ];
  for (const pattern of patterns) {
    const match = text2.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}
async function waitForOTP(credentials2, senderPattern, maxWaitSeconds = 60, pollIntervalSeconds = 5) {
  const startTime = /* @__PURE__ */ new Date();
  const maxWaitMs = maxWaitSeconds * 1e3;
  console.log(`[Gmail] Waiting for NEW OTP from ${senderPattern} (after ${startTime.toISOString()})...`);
  while (Date.now() - startTime.getTime() < maxWaitMs) {
    const result = await fetchRecentOTP(credentials2, senderPattern, void 0, 3);
    if (result.success && result.otp && result.receivedAt) {
      const otpTime = new Date(result.receivedAt);
      const waitStartWithBuffer = new Date(startTime.getTime() - 3e4);
      if (otpTime > waitStartWithBuffer) {
        if (result.otp !== lastOTPCode || !lastOTPFetchTime || otpTime > lastOTPFetchTime) {
          console.log(`[Gmail] NEW OTP received: ${result.otp} (received at ${otpTime.toISOString()})`);
          lastOTPFetchTime = otpTime;
          lastOTPCode = result.otp;
          try {
            const { alertOTPFetched: alertOTPFetched2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
            const platform = senderPattern.toLowerCase().includes("wfg") ? "MyWFG" : "Transamerica";
            await alertOTPFetched2(platform, result.otp);
          } catch (e) {
            console.error("[Gmail] Failed to send OTP alert email:", e);
          }
          return result;
        } else {
          console.log(`[Gmail] Skipping old OTP: ${result.otp} (same as last fetch)`);
        }
      } else {
        console.log(`[Gmail] Skipping old OTP: ${result.otp} (received at ${otpTime.toISOString()}, before wait started)`);
      }
    }
    await new Promise((resolve2) => setTimeout(resolve2, pollIntervalSeconds * 1e3));
  }
  return { success: false, error: `Timeout waiting for NEW OTP after ${maxWaitSeconds} seconds` };
}
function getMyWFGCredentials() {
  const email = process.env.MYWFG_EMAIL;
  const appPassword = process.env.MYWFG_APP_PASSWORD;
  if (!email || !appPassword) {
    throw new Error("MyWFG Gmail credentials not configured. Set MYWFG_EMAIL and MYWFG_APP_PASSWORD.");
  }
  return { email, appPassword };
}
function getTransamericaCredentials2() {
  const email = process.env.TRANSAMERICA_EMAIL;
  const appPassword = process.env.TRANSAMERICA_APP_PASSWORD;
  if (!email || !appPassword) {
    throw new Error("Transamerica Gmail credentials not configured. Set TRANSAMERICA_EMAIL and TRANSAMERICA_APP_PASSWORD.");
  }
  return { email, appPassword };
}
async function fetchMyWFGOTP() {
  const credentials2 = getMyWFGCredentials();
  return waitForOTP(credentials2, "transamerica", 120, 5);
}
async function fetchTransamericaOTP() {
  const credentials2 = getTransamericaCredentials2();
  return waitForOTP(credentials2, "transamerica", 60, 5);
}
var lastOTPFetchTime, lastOTPCode;
var init_gmail_otp = __esm({
  "server/gmail-otp.ts"() {
    "use strict";
    lastOTPFetchTime = null;
    lastOTPCode = null;
  }
});

// server/db-logger.ts
var db_logger_exports = {};
__export(db_logger_exports, {
  formatStats: () => formatStats,
  getQueryMetrics: () => getQueryMetrics,
  getQueryStats: () => getQueryStats,
  getRecentQueries: () => getRecentQueries,
  getSlowQueries: () => getSlowQueries,
  logQuery: () => logQuery,
  resetQueryMetrics: () => resetQueryMetrics,
  resetStats: () => resetStats,
  withQueryTiming: () => withQueryTiming
});
function logQuery(query, duration, success = true, error) {
  const metric = {
    query: truncateQuery(query),
    duration,
    timestamp: /* @__PURE__ */ new Date(),
    success,
    error
  };
  queryMetrics.push(metric);
  if (queryMetrics.length > MAX_METRICS) {
    queryMetrics.shift();
  }
  stats.totalQueries++;
  stats.totalDuration += duration;
  stats.avgDuration = stats.totalDuration / stats.totalQueries;
  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    stats.slowQueries++;
  }
  if (!success) {
    stats.failedQueries++;
  }
  const queryType = getQueryType(query);
  stats.queriesByType[queryType] = (stats.queriesByType[queryType] || 0) + 1;
  if (ENABLE_QUERY_LOGGING) {
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[DB] SLOW QUERY (${duration}ms): ${truncateQuery(query)}`);
    } else if (LOG_LEVEL === "debug") {
      console.log(`[DB] Query (${duration}ms): ${truncateQuery(query)}`);
    }
  }
  if (!success && error) {
    console.error(`[DB] Query failed (${duration}ms): ${truncateQuery(query)} - ${error}`);
  }
}
async function withQueryTiming(operation, queryDescription) {
  const startTime = performance.now();
  try {
    const result = await operation();
    const duration = Math.round(performance.now() - startTime);
    logQuery(queryDescription, duration, true);
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logQuery(queryDescription, duration, false, String(error));
    throw error;
  }
}
function getQueryStats() {
  return { ...stats };
}
function getRecentQueries(limit = 100) {
  return queryMetrics.slice(-limit);
}
function getSlowQueries(limit = 50) {
  return queryMetrics.filter((m) => m.duration > SLOW_QUERY_THRESHOLD_MS).slice(-limit);
}
function resetStats() {
  stats = {
    totalQueries: 0,
    totalDuration: 0,
    avgDuration: 0,
    slowQueries: 0,
    failedQueries: 0,
    queriesByType: {}
  };
  queryMetrics.length = 0;
}
function getQueryType(query) {
  const normalized = query.trim().toUpperCase();
  if (normalized.startsWith("SELECT")) return "SELECT";
  if (normalized.startsWith("INSERT")) return "INSERT";
  if (normalized.startsWith("UPDATE")) return "UPDATE";
  if (normalized.startsWith("DELETE")) return "DELETE";
  if (normalized.startsWith("CREATE")) return "CREATE";
  if (normalized.startsWith("ALTER")) return "ALTER";
  if (normalized.startsWith("DROP")) return "DROP";
  return "OTHER";
}
function truncateQuery(query, maxLength = 200) {
  const normalized = query.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.substring(0, maxLength) + "...";
}
function formatStats() {
  const lines = [
    "=== Database Query Statistics ===",
    `Total Queries: ${stats.totalQueries}`,
    `Average Duration: ${stats.avgDuration.toFixed(2)}ms`,
    `Slow Queries (>${SLOW_QUERY_THRESHOLD_MS}ms): ${stats.slowQueries}`,
    `Failed Queries: ${stats.failedQueries}`,
    "",
    "Queries by Type:"
  ];
  for (const [type, count2] of Object.entries(stats.queriesByType)) {
    lines.push(`  ${type}: ${count2}`);
  }
  return lines.join("\n");
}
function getQueryMetrics() {
  return {
    stats: getQueryStats(),
    recentQueries: getRecentQueries(50),
    slowQueries: getSlowQueries(20)
  };
}
function resetQueryMetrics() {
  resetStats();
}
var SLOW_QUERY_THRESHOLD_MS, ENABLE_QUERY_LOGGING, LOG_LEVEL, queryMetrics, MAX_METRICS, stats;
var init_db_logger = __esm({
  "server/db-logger.ts"() {
    "use strict";
    init_env();
    SLOW_QUERY_THRESHOLD_MS = parseInt(getEnv("SLOW_QUERY_THRESHOLD_MS", "1000"), 10);
    ENABLE_QUERY_LOGGING = getEnv("ENABLE_QUERY_LOGGING", "false") === "true";
    LOG_LEVEL = getEnv("LOG_LEVEL", "info");
    queryMetrics = [];
    MAX_METRICS = 1e3;
    stats = {
      totalQueries: 0,
      totalDuration: 0,
      avgDuration: 0,
      slowQueries: 0,
      failedQueries: 0,
      queriesByType: {}
    };
  }
});

// server/repositories/queryMetrics.ts
var queryMetrics_exports = {};
__export(queryMetrics_exports, {
  deleteOldSnapshots: () => deleteOldSnapshots,
  getAggregatedMetrics: () => getAggregatedMetrics,
  getLatestSnapshot: () => getLatestSnapshot,
  getMetricsHistory: () => getMetricsHistory,
  saveAndResetMetrics: () => saveAndResetMetrics,
  saveMetricsSnapshot: () => saveMetricsSnapshot
});
import { eq as eq14, desc as desc10, gte as gte4, lte as lte4, and as and11 } from "drizzle-orm";
async function saveMetricsSnapshot(periodType = "HOURLY") {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  const metricsResponse = getQueryMetrics();
  const stats2 = metricsResponse.stats;
  const slowQueries = getSlowQueries(5);
  const now = /* @__PURE__ */ new Date();
  let periodStart;
  const periodEnd = now;
  switch (periodType) {
    case "HOURLY":
      periodStart = new Date(now.getTime() - 60 * 60 * 1e3);
      break;
    case "DAILY":
      periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
      break;
    case "WEEKLY":
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      break;
  }
  const recentQueries = metricsResponse.recentQueries;
  const durations = recentQueries.map((q) => q.duration);
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const insertData = {
    snapshotAt: now,
    totalQueries: stats2.totalQueries,
    totalDurationMs: String(stats2.totalDuration),
    avgDurationMs: String(stats2.avgDuration.toFixed(2)),
    maxDurationMs: String(maxDuration),
    minDurationMs: String(minDuration),
    selectCount: stats2.queriesByType["SELECT"] || 0,
    insertCount: stats2.queriesByType["INSERT"] || 0,
    updateCount: stats2.queriesByType["UPDATE"] || 0,
    deleteCount: stats2.queriesByType["DELETE"] || 0,
    otherCount: stats2.queriesByType["OTHER"] || 0,
    slowQueryCount: stats2.slowQueries,
    failedQueryCount: stats2.failedQueries,
    slowQueries: slowQueries.map((q) => ({
      query: q.query,
      duration: q.duration,
      timestamp: q.timestamp.toISOString()
    })),
    periodType,
    periodStart,
    periodEnd
  };
  await db.insert(queryMetricsHistory).values(insertData);
  const [result] = await db.select().from(queryMetricsHistory).orderBy(desc10(queryMetricsHistory.id)).limit(1);
  return result;
}
async function saveAndResetMetrics(periodType = "HOURLY") {
  const snapshot = await saveMetricsSnapshot(periodType);
  resetQueryMetrics();
  return snapshot;
}
async function getMetricsHistory(options) {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  const conditions = [];
  if (options?.periodType) {
    conditions.push(eq14(queryMetricsHistory.periodType, options.periodType));
  }
  if (options?.startDate) {
    conditions.push(gte4(queryMetricsHistory.snapshotAt, options.startDate));
  }
  if (options?.endDate) {
    conditions.push(lte4(queryMetricsHistory.snapshotAt, options.endDate));
  }
  let query = db.select().from(queryMetricsHistory).orderBy(desc10(queryMetricsHistory.snapshotAt));
  if (conditions.length > 0) {
    query = query.where(and11(...conditions));
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  return query;
}
async function getLatestSnapshot() {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.select().from(queryMetricsHistory).orderBy(desc10(queryMetricsHistory.snapshotAt)).limit(1);
  return result || null;
}
async function getAggregatedMetrics(startDate, endDate) {
  const snapshots = await getMetricsHistory({
    startDate,
    endDate
  });
  if (snapshots.length === 0) {
    return {
      totalQueries: 0,
      avgDuration: 0,
      slowQueries: 0,
      failedQueries: 0,
      snapshotCount: 0
    };
  }
  const totals = snapshots.reduce(
    (acc, s) => ({
      totalQueries: acc.totalQueries + s.totalQueries,
      totalDuration: acc.totalDuration + Number(s.totalDurationMs),
      slowQueries: acc.slowQueries + s.slowQueryCount,
      failedQueries: acc.failedQueries + s.failedQueryCount
    }),
    { totalQueries: 0, totalDuration: 0, slowQueries: 0, failedQueries: 0 }
  );
  return {
    totalQueries: totals.totalQueries,
    avgDuration: totals.totalQueries > 0 ? totals.totalDuration / totals.totalQueries : 0,
    slowQueries: totals.slowQueries,
    failedQueries: totals.failedQueries,
    snapshotCount: snapshots.length
  };
}
async function deleteOldSnapshots(olderThan) {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  const result = await db.delete(queryMetricsHistory).where(lte4(queryMetricsHistory.snapshotAt, olderThan));
  return result.rowsAffected || 0;
}
var init_queryMetrics = __esm({
  "server/repositories/queryMetrics.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_db_logger();
  }
});

// server/encryption.ts
import crypto from "crypto";
function getKey() {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.trim() === "") {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. Set a secure key (minimum 16 characters) in your environment."
    );
  }
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}
function encryptCredential(plaintext) {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `gcm:${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt credential");
  }
}
function decryptCredential(encryptedData) {
  try {
    const key = getKey();
    if (encryptedData.startsWith("gcm:")) {
      return decryptGCM(encryptedData, key);
    }
    return decryptCBC(encryptedData, key);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt credential");
  }
}
function decryptGCM(encryptedData, key) {
  const parts = encryptedData.split(":");
  if (parts.length !== 4 || parts[0] !== "gcm") {
    throw new Error("Invalid GCM encrypted data format");
  }
  const [, ivHex, encrypted, authTagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
function decryptCBC(encryptedData, key) {
  const [ivHex, encrypted] = encryptedData.split(":");
  if (!ivHex || !encrypted) {
    throw new Error("Invalid CBC encrypted data format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
var ENCRYPTION_KEY, ALGORITHM_GCM, ALGORITHM_CBC, IV_LENGTH, AUTH_TAG_LENGTH;
var init_encryption = __esm({
  "server/encryption.ts"() {
    "use strict";
    ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    ALGORITHM_GCM = "aes-256-gcm";
    ALGORITHM_CBC = "aes-256-cbc";
    IV_LENGTH = 12;
    AUTH_TAG_LENGTH = 16;
  }
});

// server/mywfg-service-v3.ts
var mywfg_service_v3_exports = {};
__export(mywfg_service_v3_exports, {
  myWFGServiceV3: () => myWFGServiceV3
});
var MYWFG_URLS, RANK_MAPPING, MyWFGServiceV3, myWFGServiceV3;
var init_mywfg_service_v3 = __esm({
  "server/mywfg-service-v3.ts"() {
    "use strict";
    init_browser();
    init_encryption();
    MYWFG_URLS = {
      base: "https://www.mywfg.com",
      login: "https://www.mywfg.com/",
      dashboard: "https://www.mywfg.com/dashboard",
      teamChart: "https://www.mywfg.com/team-chart",
      reports: {
        downlineStatus: "https://www.mywfg.com/reports/downline-status",
        commissionsSummary: "https://www.mywfg.com/reports/commissions-summary",
        paymentReport: "https://www.mywfg.com/reports/payment-report",
        totalCashFlow: "https://www.mywfg.com/reports/total-cash-flow",
        productionSummary: "https://www.mywfg.com/reports/production-summary"
      },
      advancementGuidelines: "https://www.mywfg.com/advancement-guidelines",
      commissionGuidelines: "https://www.mywfg.com/commission-guidelines"
    };
    RANK_MAPPING = {
      "Training Associate": "TRAINING_ASSOCIATE",
      "TA": "TRAINING_ASSOCIATE",
      "TA+": "TRAINING_ASSOCIATE",
      "Associate": "ASSOCIATE",
      "A": "ASSOCIATE",
      "Senior Associate": "SENIOR_ASSOCIATE",
      "SA": "SENIOR_ASSOCIATE",
      "Marketing Director": "MARKETING_DIRECTOR",
      "MD": "MARKETING_DIRECTOR",
      "Senior Marketing Director": "SENIOR_MARKETING_DIRECTOR",
      "SMD": "SENIOR_MARKETING_DIRECTOR",
      "Executive Marketing Director": "EXECUTIVE_MARKETING_DIRECTOR",
      "EMD": "EXECUTIVE_MARKETING_DIRECTOR",
      "CEO Marketing Director": "CEO_MARKETING_DIRECTOR",
      "CEO": "CEO_MARKETING_DIRECTOR",
      "Executive Vice Chairman": "EXECUTIVE_VICE_CHAIRMAN",
      "EVC": "EXECUTIVE_VICE_CHAIRMAN",
      "Senior Executive Vice Chairman": "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
      "SEVC": "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
      "Field Chairman": "FIELD_CHAIRMAN",
      "FC": "FIELD_CHAIRMAN",
      "Executive Chairman": "EXECUTIVE_CHAIRMAN",
      "EC": "EXECUTIVE_CHAIRMAN"
    };
    MyWFGServiceV3 = class {
      browser = null;
      async initialize() {
        if (!this.browser) {
          const { browser } = await launchBrowser();
          this.browser = browser;
        }
      }
      async cleanup() {
        if (this.browser) {
          await this.browser.close();
          this.browser = null;
        }
      }
      /**
       * Parse rank from display text to internal code
       */
      parseRank(rankText) {
        const normalized = rankText.trim();
        return RANK_MAPPING[normalized] || "TRAINING_ASSOCIATE";
      }
      /**
       * Parse currency string to number
       */
      parseCurrency(text2) {
        if (!text2) return 0;
        const cleaned = text2.replace(/[$,\s]/g, "");
        return parseFloat(cleaned) || 0;
      }
      /**
       * Parse date string to ISO format
       */
      parseDate(text2) {
        if (!text2) return void 0;
        try {
          const date2 = new Date(text2);
          if (!isNaN(date2.getTime())) {
            return date2.toISOString().split("T")[0];
          }
        } catch {
        }
        return void 0;
      }
      /**
       * Extract agent and production data from mywfg.com
       * Supports 2FA/validation code requirement
       */
      async extractData(encryptedUsername, encryptedPassword, validationCode, syncType = "FULL") {
        try {
          await this.initialize();
          if (!this.browser) {
            throw new Error("Failed to initialize browser");
          }
          const username = decryptCredential(encryptedUsername);
          const password = decryptCredential(encryptedPassword);
          const page = await this.browser.newPage();
          try {
            console.log("[MyWFG] Navigating to mywfg.com...");
            await page.goto(MYWFG_URLS.login, { waitUntil: "networkidle0", timeout: 6e4 });
            console.log("[MyWFG] Page loaded. Attempting login...");
            const usernameInput = await this.findInputField(page, ["text", "username"]);
            if (!usernameInput) {
              throw new Error("Could not find username input field");
            }
            console.log("[MyWFG] Filling username...");
            await usernameInput.click({ clickCount: 3 });
            await usernameInput.type(username, { delay: 50 });
            await page.waitForTimeout(500);
            const passwordInput = await this.findInputField(page, ["password"]);
            if (!passwordInput) {
              throw new Error("Could not find password input field");
            }
            console.log("[MyWFG] Filling password...");
            await passwordInput.click({ clickCount: 3 });
            await passwordInput.type(password, { delay: 50 });
            await page.waitForTimeout(500);
            const loginButton = await this.findButton(page, ["submit", "Log in", "LOGIN", "Sign in"]);
            if (!loginButton) {
              throw new Error("Could not find login button");
            }
            console.log("[MyWFG] Clicking login button...");
            await loginButton.click();
            await page.waitForTimeout(3e3);
            const validationField = await page.$('input[type="text"][placeholder*="code" i], input[name*="code" i], input[placeholder*="validation" i]');
            if (validationField && validationCode) {
              console.log("[MyWFG] Validation code field detected. Entering validation code...");
              await validationField.click({ clickCount: 3 });
              await validationField.type(validationCode, { delay: 50 });
              await page.waitForTimeout(500);
              const submitButton = await this.findButton(page, ["submit", "Verify", "VERIFY", "Confirm"]);
              if (submitButton) {
                console.log("[MyWFG] Submitting validation code...");
                await submitButton.click();
                await page.waitForTimeout(3e3);
              }
            } else if (validationField && !validationCode) {
              console.log("[MyWFG] Validation code required but not provided");
              return {
                success: false,
                agentsExtracted: 0,
                productionRecordsExtracted: 0,
                paymentsExtracted: 0,
                agents: [],
                productionRecords: [],
                payments: [],
                error: "Validation code required. Please check your email/phone for the OTP code.",
                timestamp: /* @__PURE__ */ new Date(),
                requiresValidation: true,
                syncType
              };
            }
            try {
              await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 3e4 });
            } catch (e) {
              console.log("[MyWFG] Navigation timeout (continuing)");
            }
            await page.waitForTimeout(3e3);
            console.log("[MyWFG] Current URL:", page.url());
            const isLoggedIn = await page.evaluate(() => {
              const html = document.body.innerHTML;
              return html.includes("Dashboard") || html.includes("Team") || html.includes("Production") || html.includes("Agent") || html.includes("Recruit") || html.includes("Logout") || html.includes("Sign out") || html.includes("Welcome");
            });
            if (!isLoggedIn) {
              console.log("[MyWFG] Warning: May not be fully logged in");
            }
            let agents2 = [];
            let productionRecords2 = [];
            let payments = [];
            let teamHierarchy;
            switch (syncType) {
              case "DOWNLINE_STATUS":
                agents2 = await this.extractDownlineStatus(page);
                break;
              case "COMMISSIONS":
                productionRecords2 = await this.extractCommissions(page);
                break;
              case "PAYMENTS":
                payments = await this.extractPayments(page);
                break;
              case "CASH_FLOW":
                productionRecords2 = await this.extractCashFlow(page);
                break;
              case "TEAM_CHART":
                teamHierarchy = await this.extractTeamChart(page);
                agents2 = this.flattenHierarchy(teamHierarchy);
                break;
              case "FULL":
              default:
                agents2 = await this.extractDownlineStatus(page);
                productionRecords2 = await this.extractCommissions(page);
                payments = await this.extractPayments(page);
                teamHierarchy = await this.extractTeamChart(page);
                break;
            }
            return {
              success: true,
              agentsExtracted: agents2.length,
              productionRecordsExtracted: productionRecords2.length,
              paymentsExtracted: payments.length,
              agents: agents2,
              productionRecords: productionRecords2,
              payments,
              teamHierarchy,
              timestamp: /* @__PURE__ */ new Date(),
              syncType
            };
          } finally {
            await page.close();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error("[MyWFG] Extraction failed:", errorMessage);
          return {
            success: false,
            agentsExtracted: 0,
            productionRecordsExtracted: 0,
            paymentsExtracted: 0,
            agents: [],
            productionRecords: [],
            payments: [],
            error: errorMessage,
            timestamp: /* @__PURE__ */ new Date(),
            syncType
          };
        }
      }
      async findInputField(page, types) {
        for (const type of types) {
          const input = await page.$(`input[type="${type}"]`);
          if (input) return input;
          const input2 = await page.$(`input[name*="${type}" i]`);
          if (input2) return input2;
          const input3 = await page.$(`input[placeholder*="${type}" i]`);
          if (input3) return input3;
        }
        const inputs = await page.$$("input");
        return inputs[0] || null;
      }
      async findButton(page, texts) {
        for (const text2 of texts) {
          const button2 = await page.$(`button[type="${text2}"]`);
          if (button2) return button2;
          const buttonByText = await page.evaluateHandle((t2) => {
            const buttons2 = Array.from(document.querySelectorAll("button"));
            return buttons2.find((b) => b.textContent?.trim().toLowerCase().includes(t2.toLowerCase())) || null;
          }, text2);
          const el = buttonByText.asElement();
          if (el) return el;
        }
        const buttons = await page.$$("button");
        return buttons[0] || null;
      }
      /**
       * Extract agent data from Downline Status report
       */
      async extractDownlineStatus(page) {
        console.log("[MyWFG] Navigating to Downline Status report...");
        try {
          await page.goto(MYWFG_URLS.reports.downlineStatus, { waitUntil: "networkidle0", timeout: 3e4 });
          await page.waitForTimeout(2e3);
          const agents2 = await page.evaluate(() => {
            const agentList = [];
            const rows = document.querySelectorAll("table tbody tr, .downline-row, [data-agent-row]");
            rows.forEach((row) => {
              const cells = row.querySelectorAll("td, [data-field]");
              if (cells.length >= 3) {
                const nameText = cells[1]?.textContent?.trim() || "";
                const nameParts = nameText.split(",").map((s) => s.trim());
                const agent = {
                  agentCode: cells[0]?.textContent?.trim() || "",
                  lastName: nameParts[0] || "",
                  firstName: nameParts[1] || "",
                  currentRank: cells[2]?.textContent?.trim() || "",
                  email: cells[3]?.textContent?.trim() || "",
                  phone: cells[4]?.textContent?.trim() || "",
                  licenseStatus: cells[5]?.textContent?.trim() || "",
                  totalBaseShopPoints: parseFloat(cells[6]?.textContent?.replace(/[$,]/g, "") || "0"),
                  directRecruits: parseInt(cells[7]?.textContent || "0", 10)
                };
                if (agent.agentCode) {
                  agentList.push(agent);
                }
              }
            });
            return agentList;
          });
          const mappedAgents = agents2.map((agent) => ({
            ...agent,
            currentRank: this.parseRank(agent.currentRank || ""),
            isLifeLicensed: agent.licenseStatus?.toLowerCase().includes("life") || false,
            isSecuritiesLicensed: agent.licenseStatus?.toLowerCase().includes("securities") || false
          }));
          console.log(`[MyWFG] Extracted ${mappedAgents.length} agents from Downline Status`);
          return mappedAgents;
        } catch (error) {
          console.error("[MyWFG] Error extracting Downline Status:", error);
          return [];
        }
      }
      /**
       * Extract commission data from Commissions Summary report
       */
      async extractCommissions(page) {
        console.log("[MyWFG] Navigating to Commissions Summary report...");
        try {
          await page.goto(MYWFG_URLS.reports.commissionsSummary, { waitUntil: "networkidle0", timeout: 3e4 });
          await page.waitForTimeout(2e3);
          const records = await page.evaluate(() => {
            const productionList = [];
            const rows = document.querySelectorAll("table tbody tr, .commission-row, [data-commission-row]");
            rows.forEach((row) => {
              const cells = row.querySelectorAll("td, [data-field]");
              if (cells.length >= 5) {
                const record = {
                  agentCode: cells[0]?.textContent?.trim() || "",
                  policyNumber: cells[1]?.textContent?.trim() || "",
                  policyType: cells[2]?.textContent?.trim() || "",
                  productCompany: cells[3]?.textContent?.trim() || "",
                  customerName: cells[4]?.textContent?.trim() || "",
                  premiumAmount: cells[5]?.textContent?.trim() || "0",
                  commissionAmount: cells[6]?.textContent?.trim() || "0",
                  basePoints: cells[7]?.textContent?.trim() || "0",
                  issueDate: cells[8]?.textContent?.trim() || "",
                  paymentCycle: cells[9]?.textContent?.trim() || ""
                };
                if (record.agentCode && record.policyNumber) {
                  productionList.push(record);
                }
              }
            });
            return productionList;
          });
          const parsedRecords = records.map((record) => ({
            ...record,
            premiumAmount: this.parseCurrency(record.premiumAmount),
            commissionAmount: this.parseCurrency(record.commissionAmount),
            basePoints: this.parseCurrency(record.basePoints),
            issueDate: this.parseDate(record.issueDate)
          }));
          console.log(`[MyWFG] Extracted ${parsedRecords.length} commission records`);
          return parsedRecords;
        } catch (error) {
          console.error("[MyWFG] Error extracting Commissions:", error);
          return [];
        }
      }
      /**
       * Extract payment data from Payment Report
       */
      async extractPayments(page) {
        console.log("[MyWFG] Navigating to Payment Report...");
        try {
          await page.goto(MYWFG_URLS.reports.paymentReport, { waitUntil: "networkidle0", timeout: 3e4 });
          await page.waitForTimeout(2e3);
          const payments = await page.evaluate(() => {
            const paymentList = [];
            const rows = document.querySelectorAll("table tbody tr, .payment-row, [data-payment-row]");
            rows.forEach((row) => {
              const cells = row.querySelectorAll("td, [data-field]");
              if (cells.length >= 4) {
                const payment = {
                  agentCode: cells[0]?.textContent?.trim() || "",
                  paymentDate: cells[1]?.textContent?.trim() || "",
                  paymentCycle: cells[2]?.textContent?.trim() || "",
                  grossAmount: cells[3]?.textContent?.trim() || "0",
                  netAmount: cells[4]?.textContent?.trim() || "0",
                  deductions: cells[5]?.textContent?.trim() || "0",
                  personalCommission: cells[6]?.textContent?.trim() || "0",
                  overrideCommission: cells[7]?.textContent?.trim() || "0",
                  bonusAmount: cells[8]?.textContent?.trim() || "0"
                };
                if (payment.agentCode && payment.paymentDate) {
                  paymentList.push(payment);
                }
              }
            });
            return paymentList;
          });
          const parsedPayments = payments.map((payment) => ({
            agentCode: payment.agentCode,
            paymentDate: this.parseDate(payment.paymentDate) || payment.paymentDate,
            paymentCycle: payment.paymentCycle,
            grossAmount: this.parseCurrency(payment.grossAmount),
            netAmount: this.parseCurrency(payment.netAmount),
            deductions: this.parseCurrency(payment.deductions),
            personalCommission: this.parseCurrency(payment.personalCommission),
            overrideCommission: this.parseCurrency(payment.overrideCommission),
            bonusAmount: this.parseCurrency(payment.bonusAmount)
          }));
          console.log(`[MyWFG] Extracted ${parsedPayments.length} payment records`);
          return parsedPayments;
        } catch (error) {
          console.error("[MyWFG] Error extracting Payments:", error);
          return [];
        }
      }
      /**
       * Extract cash flow data from Total Cash Flow report
       */
      async extractCashFlow(page) {
        console.log("[MyWFG] Navigating to Total Cash Flow report...");
        try {
          await page.goto(MYWFG_URLS.reports.totalCashFlow, { waitUntil: "networkidle0", timeout: 3e4 });
          await page.waitForTimeout(2e3);
          const records = await page.evaluate(() => {
            const cashFlowList = [];
            const rows = document.querySelectorAll("table tbody tr, .cashflow-row, [data-cashflow-row]");
            rows.forEach((row) => {
              const cells = row.querySelectorAll("td, [data-field]");
              if (cells.length >= 4) {
                const record = {
                  agentCode: cells[0]?.textContent?.trim() || "",
                  policyNumber: cells[1]?.textContent?.trim() || "",
                  policyType: cells[2]?.textContent?.trim() || "",
                  commissionAmount: cells[3]?.textContent?.trim() || "0",
                  generation: cells[4]?.textContent?.trim() || "0",
                  overridePercentage: cells[5]?.textContent?.trim() || "0",
                  issueDate: cells[6]?.textContent?.trim() || ""
                };
                if (record.agentCode) {
                  cashFlowList.push(record);
                }
              }
            });
            return cashFlowList;
          });
          const parsedRecords = records.map((record) => ({
            ...record,
            commissionAmount: this.parseCurrency(record.commissionAmount),
            generation: parseInt(record.generation, 10) || 0,
            overridePercentage: parseFloat(record.overridePercentage) || 0,
            issueDate: this.parseDate(record.issueDate)
          }));
          console.log(`[MyWFG] Extracted ${parsedRecords.length} cash flow records`);
          return parsedRecords;
        } catch (error) {
          console.error("[MyWFG] Error extracting Cash Flow:", error);
          return [];
        }
      }
      /**
       * Extract team hierarchy from Team Chart
       */
      async extractTeamChart(page) {
        console.log("[MyWFG] Navigating to Team Chart...");
        try {
          await page.goto(MYWFG_URLS.teamChart, { waitUntil: "networkidle0", timeout: 3e4 });
          await page.waitForTimeout(2e3);
          const expandButton = await page.$("[data-expand], .expand-all");
          if (expandButton) {
            await expandButton.click();
            await page.waitForTimeout(1e3);
          }
          const hierarchy = await page.evaluate(() => {
            const nodes = [];
            const chartNodes = document.querySelectorAll(".org-chart-node, [data-node], .team-member, .hierarchy-node");
            chartNodes.forEach((node) => {
              const agentCode = node.getAttribute("data-agent-code") || node.querySelector("[data-code]")?.textContent?.trim() || "";
              const name = node.querySelector(".name, [data-name]")?.textContent?.trim() || "";
              const rank = node.querySelector(".rank, [data-rank]")?.textContent?.trim() || "";
              const uplineCode = node.getAttribute("data-upline") || node.closest("[data-parent]")?.getAttribute("data-parent") || "";
              if (agentCode || name) {
                nodes.push({
                  agentCode,
                  name,
                  rank,
                  uplineAgentCode: uplineCode,
                  children: []
                });
              }
            });
            return nodes;
          });
          const tree = this.buildHierarchyTree(hierarchy);
          console.log(`[MyWFG] Extracted ${hierarchy.length} nodes from Team Chart`);
          return tree;
        } catch (error) {
          console.error("[MyWFG] Error extracting Team Chart:", error);
          return [];
        }
      }
      /**
       * Build hierarchy tree from flat list
       */
      buildHierarchyTree(nodes) {
        const nodeMap = /* @__PURE__ */ new Map();
        const roots = [];
        nodes.forEach((node) => {
          nodeMap.set(node.agentCode, { ...node, children: [] });
        });
        nodes.forEach((node) => {
          const current = nodeMap.get(node.agentCode);
          if (current && node.uplineAgentCode && nodeMap.has(node.uplineAgentCode)) {
            const parent = nodeMap.get(node.uplineAgentCode);
            parent.children.push(current);
          } else if (current) {
            roots.push(current);
          }
        });
        return roots;
      }
      /**
       * Flatten hierarchy tree to agent list
       */
      flattenHierarchy(hierarchy) {
        const agents2 = [];
        const traverse = (node, uplineCode) => {
          const nameParts = node.name.split(" ");
          agents2.push({
            agentCode: node.agentCode,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            currentRank: this.parseRank(node.rank),
            uplineAgentCode: uplineCode,
            directRecruits: node.children.length
          });
          node.children.forEach((child) => traverse(child, node.agentCode));
        };
        hierarchy.forEach((root) => traverse(root));
        return agents2;
      }
      // Legacy methods for backward compatibility
      async extractAgents(page) {
        return this.extractDownlineStatus(page);
      }
      async extractProduction(page) {
        return this.extractCommissions(page);
      }
    };
    myWFGServiceV3 = new MyWFGServiceV3();
  }
});

// server/jobs/mywfgSync.ts
import { eq as eq15 } from "drizzle-orm";
async function processAgents(extractedAgents, userId, dryRun = false) {
  let processed = 0;
  const errors = [];
  for (const extractedAgent of extractedAgents) {
    try {
      const db = await getDb2();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(agents).where(eq15(agents.agentCode, extractedAgent.agentCode)).limit(1);
      if (dryRun) {
        logger.info(`[DryRun] Would ${existing.length > 0 ? "update" : "create"} agent ${extractedAgent.agentCode}`);
        processed++;
        continue;
      }
      if (existing.length > 0) {
        await updateAgent(existing[0].id, {
          email: extractedAgent.email || void 0,
          licenseNumber: extractedAgent.licenseStatus || void 0
        });
      } else {
        await createAgent({
          agentCode: extractedAgent.agentCode,
          firstName: extractedAgent.firstName,
          lastName: extractedAgent.lastName,
          email: extractedAgent.email,
          recruiterUserId: userId,
          currentStage: "RECRUITMENT",
          stageEnteredAt: /* @__PURE__ */ new Date()
        });
      }
      processed++;
    } catch (error) {
      const msg = `Error processing agent ${extractedAgent.agentCode}: ${error}`;
      logger.error(msg);
      errors.push(msg);
    }
  }
  return { processed, errors };
}
async function processProductionRecords(records, dryRun = false) {
  let processed = 0;
  const errors = [];
  for (const record of records) {
    try {
      const db = await getDb2();
      if (!db) throw new Error("Database not available");
      const agentResult = await db.select().from(agents).where(eq15(agents.agentCode, record.agentCode)).limit(1);
      if (agentResult.length === 0) {
        errors.push(`Agent not found for production record: ${record.agentCode}`);
        continue;
      }
      if (dryRun) {
        logger.info(`[DryRun] Would create production record for ${record.policyNumber}`);
        processed++;
        continue;
      }
      const agentId = agentResult[0].id;
      await createProductionRecord({
        agentId,
        policyNumber: record.policyNumber,
        policyType: record.policyType || "Unknown",
        premiumAmount: record.premiumAmount?.toString(),
        commissionAmount: record.commissionAmount?.toString(),
        issueDate: record.issueDate ? new Date(record.issueDate) : /* @__PURE__ */ new Date()
      });
      if (record.commissionAmount && record.commissionAmount >= 1e3) {
        const currentAgent = agentResult[0];
        if (currentAgent.currentStage !== "NET_LICENSED" && !currentAgent.productionMilestoneDate) {
          await updateAgent(agentId, {
            currentStage: "NET_LICENSED",
            stageEnteredAt: /* @__PURE__ */ new Date(),
            productionMilestoneDate: /* @__PURE__ */ new Date(),
            firstProductionAmount: record.commissionAmount.toString()
          });
        }
      }
      processed++;
    } catch (error) {
      const msg = `Error processing production record ${record.policyNumber}: ${error}`;
      logger.error(msg);
      errors.push(msg);
    }
  }
  return { processed, errors };
}
async function runMyWFGSyncJob(options) {
  const { userId, validationCode, dryRun = false } = options;
  const errors = [];
  try {
    logger.info(`[Sync] Starting MyWFG sync for user ${userId}${dryRun ? " (dry run)" : ""}`);
    const creds = await getCredentialsByUserId(userId);
    if (!creds) {
      throw new Error("No credentials found for user");
    }
    const { myWFGServiceV3: myWFGServiceV32 } = await Promise.resolve().then(() => (init_mywfg_service_v3(), mywfg_service_v3_exports));
    const syncResult = await myWFGServiceV32.extractData(
      creds.encryptedUsername,
      creds.encryptedPassword,
      validationCode
    );
    if (!dryRun) {
      await createSyncLog({
        status: syncResult.success ? "SUCCESS" : "FAILED",
        recordsProcessed: syncResult.agentsExtracted + syncResult.productionRecordsExtracted,
        errorMessage: syncResult.error || void 0,
        syncedAgentCodes: syncResult.agents.map((a) => a.agentCode)
      });
    }
    if (!syncResult.success) {
      throw new Error(syncResult.error || "Sync failed");
    }
    const agentResults = await processAgents(syncResult.agents, userId, dryRun);
    const productionResults = await processProductionRecords(syncResult.productionRecords, dryRun);
    errors.push(...agentResults.errors, ...productionResults.errors);
    logger.info(
      `[Sync] MyWFG sync completed. Agents: ${agentResults.processed}, Production: ${productionResults.processed}`
    );
    return {
      success: true,
      message: "Sync completed successfully",
      agentsProcessed: agentResults.processed,
      productionProcessed: productionResults.processed,
      errors
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[Sync] MyWFG sync failed: ${errorMessage}`);
    if (!dryRun) {
      await createSyncLog({
        status: "FAILED",
        recordsProcessed: 0,
        errorMessage
      });
    }
    return {
      success: false,
      message: errorMessage,
      agentsProcessed: 0,
      productionProcessed: 0,
      errors: [errorMessage]
    };
  } finally {
    try {
      const { myWFGServiceV3: myWFGServiceV32 } = await Promise.resolve().then(() => (init_mywfg_service_v3(), mywfg_service_v3_exports));
      await myWFGServiceV32.cleanup();
    } catch (e) {
    }
  }
}
function getNextSyncTime(syncTimeHour = 2) {
  const now = /* @__PURE__ */ new Date();
  const syncTime = /* @__PURE__ */ new Date();
  syncTime.setHours(syncTimeHour, 0, 0, 0);
  if (syncTime <= now) {
    syncTime.setDate(syncTime.getDate() + 1);
  }
  return syncTime;
}
var init_mywfgSync = __esm({
  "server/jobs/mywfgSync.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_logger();
  }
});

// server/mywfg-sync-job.ts
var mywfg_sync_job_exports = {};
__export(mywfg_sync_job_exports, {
  runMyWFGSync: () => runMyWFGSync,
  scheduleMyWFGSync: () => scheduleMyWFGSync
});
async function runMyWFGSync(userId, validationCode) {
  const result = await runMyWFGSyncJob({ userId, validationCode });
  return {
    success: result.success,
    message: result.message,
    agentsProcessed: result.agentsProcessed,
    productionProcessed: result.productionProcessed
  };
}
function scheduleMyWFGSync(userId, syncTimeHour = 2) {
  const syncTime = getNextSyncTime(syncTimeHour);
  const msUntilSync = syncTime.getTime() - Date.now();
  console.log(`[Sync] Scheduled MyWFG sync for user ${userId} at ${syncTime.toISOString()}`);
  setTimeout(() => {
    runMyWFGSync(userId);
    setInterval(() => runMyWFGSync(userId), 24 * 60 * 60 * 1e3);
  }, msUntilSync);
}
var init_mywfg_sync_job = __esm({
  "server/mywfg-sync-job.ts"() {
    "use strict";
    init_mywfgSync();
  }
});

// server/repositories/notifications.ts
import { eq as eq18, and as and13, desc as desc12, sql as sql10, isNull as isNull3, or as or2, lte as lte5, gt } from "drizzle-orm";
async function createNotification(params) {
  const db = await getDb2();
  if (!db) throw new Error("Database not available");
  const [notification] = await db.insert(notifications).values({
    userId: params.userId ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
    linkUrl: params.linkUrl,
    linkLabel: params.linkLabel,
    relatedEntityType: params.relatedEntityType,
    relatedEntityId: params.relatedEntityId,
    priority: params.priority ?? "MEDIUM",
    metadata: params.metadata,
    expiresAt: params.expiresAt
  }).$returningId();
  const [created] = await db.select().from(notifications).where(eq18(notifications.id, notification.id));
  return created;
}
async function getNotifications(filters) {
  const db = await getDb2();
  if (!db) return [];
  const conditions = [];
  if (filters.userId !== void 0) {
    conditions.push(
      or2(
        eq18(notifications.userId, filters.userId),
        isNull3(notifications.userId)
      )
    );
  }
  if (filters.type !== void 0) {
    conditions.push(eq18(notifications.type, filters.type));
  }
  if (filters.isRead !== void 0) {
    conditions.push(eq18(notifications.isRead, filters.isRead));
  }
  if (filters.isDismissed !== void 0) {
    conditions.push(eq18(notifications.isDismissed, filters.isDismissed));
  }
  if (filters.priority !== void 0) {
    conditions.push(eq18(notifications.priority, filters.priority));
  }
  conditions.push(
    or2(
      isNull3(notifications.expiresAt),
      gt(notifications.expiresAt, /* @__PURE__ */ new Date())
    )
  );
  const query = db.select().from(notifications).where(conditions.length > 0 ? and13(...conditions) : void 0).orderBy(desc12(notifications.createdAt)).limit(filters.limit ?? 50).offset(filters.offset ?? 0);
  return await query;
}
async function getUnreadCount(userId) {
  const db = await getDb2();
  if (!db) return 0;
  const result = await db.select({ count: sql10`count(*)` }).from(notifications).where(
    and13(
      or2(
        eq18(notifications.userId, userId),
        isNull3(notifications.userId)
      ),
      eq18(notifications.isRead, false),
      eq18(notifications.isDismissed, false),
      or2(
        isNull3(notifications.expiresAt),
        gt(notifications.expiresAt, /* @__PURE__ */ new Date())
      )
    )
  );
  return Number(result[0]?.count ?? 0);
}
async function markAsRead(notificationId) {
  const db = await getDb2();
  if (!db) return;
  await db.update(notifications).set({
    isRead: true,
    readAt: /* @__PURE__ */ new Date()
  }).where(eq18(notifications.id, notificationId));
}
async function markAllAsRead(userId) {
  const db = await getDb2();
  if (!db) return 0;
  const result = await db.update(notifications).set({
    isRead: true,
    readAt: /* @__PURE__ */ new Date()
  }).where(
    and13(
      or2(
        eq18(notifications.userId, userId),
        isNull3(notifications.userId)
      ),
      eq18(notifications.isRead, false)
    )
  );
  return result[0]?.affectedRows ?? 0;
}
async function dismissNotification(notificationId) {
  const db = await getDb2();
  if (!db) return;
  await db.update(notifications).set({
    isDismissed: true,
    dismissedAt: /* @__PURE__ */ new Date()
  }).where(eq18(notifications.id, notificationId));
}
async function dismissAllNotifications(userId) {
  const db = await getDb2();
  if (!db) return 0;
  const result = await db.update(notifications).set({
    isDismissed: true,
    dismissedAt: /* @__PURE__ */ new Date()
  }).where(
    and13(
      or2(
        eq18(notifications.userId, userId),
        isNull3(notifications.userId)
      ),
      eq18(notifications.isDismissed, false)
    )
  );
  return result[0]?.affectedRows ?? 0;
}
async function getNotificationById(id) {
  const db = await getDb2();
  if (!db) return null;
  const [notification] = await db.select().from(notifications).where(eq18(notifications.id, id));
  return notification ?? null;
}
async function hasSimilarNotification(userId, type, relatedEntityType, relatedEntityId, withinMinutes = 60) {
  const db = await getDb2();
  if (!db) return false;
  const cutoffTime = /* @__PURE__ */ new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - withinMinutes);
  const conditions = [
    eq18(notifications.type, type),
    eq18(notifications.relatedEntityType, relatedEntityType),
    eq18(notifications.relatedEntityId, relatedEntityId),
    gt(notifications.createdAt, cutoffTime)
  ];
  if (userId !== null) {
    conditions.push(eq18(notifications.userId, userId));
  } else {
    conditions.push(isNull3(notifications.userId));
  }
  const result = await db.select({ count: sql10`count(*)` }).from(notifications).where(and13(...conditions));
  return Number(result[0]?.count ?? 0) > 0;
}
var init_notifications = __esm({
  "server/repositories/notifications.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/lib/health.ts
var health_exports = {};
__export(health_exports, {
  healthDetailed: () => healthDetailed,
  healthz: () => healthz,
  readyz: () => readyz
});
async function healthz(req, res) {
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime()
  });
}
async function readyz(req, res) {
  const checks = {};
  let overallStatus = "ok";
  const dbStart = Date.now();
  try {
    const db = await getDb2();
    if (db) {
      await db.execute("SELECT 1");
      checks.database = {
        status: "pass",
        latencyMs: Date.now() - dbStart
      };
    } else {
      checks.database = {
        status: "fail",
        message: "Database not initialized"
      };
      overallStatus = "unhealthy";
    }
  } catch (err) {
    checks.database = {
      status: "fail",
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - dbStart
    };
    overallStatus = "unhealthy";
  }
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapPercent = Math.round(memUsage.heapUsed / memUsage.heapTotal * 100);
  if (heapPercent > 90) {
    checks.memory = {
      status: "fail",
      message: `Heap usage critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`
    };
    overallStatus = overallStatus === "ok" ? "degraded" : overallStatus;
  } else if (heapPercent > 75) {
    checks.memory = {
      status: "pass",
      message: `Heap usage high: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`
    };
    if (overallStatus === "ok") overallStatus = "degraded";
  } else {
    checks.memory = {
      status: "pass",
      message: `Heap usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`
    };
  }
  const response = {
    status: overallStatus,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    checks
  };
  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;
  res.status(httpStatus).json(response);
}
async function healthDetailed(req, res) {
  const checks = {};
  let overallStatus = "ok";
  const dbStart = Date.now();
  try {
    const db = await getDb2();
    if (db) {
      await db.execute("SELECT 1");
      checks.database = {
        status: "pass",
        latencyMs: Date.now() - dbStart
      };
    } else {
      checks.database = { status: "fail", message: "Not initialized" };
      overallStatus = "unhealthy";
    }
  } catch (err) {
    checks.database = {
      status: "fail",
      message: err instanceof Error ? err.message : "Unknown error"
    };
    overallStatus = "unhealthy";
  }
  const mem = process.memoryUsage();
  checks.memory = {
    status: "pass",
    message: JSON.stringify({
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024)
    })
  };
  res.status(overallStatus === "unhealthy" ? 503 : 200).json({
    status: overallStatus,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    checks
  });
}
var init_health = __esm({
  "server/lib/health.ts"() {
    "use strict";
    init_db();
  }
});

// server/lib/monitoring.ts
var monitoring_exports = {};
__export(monitoring_exports, {
  checkSyncHealth: () => checkSyncHealth,
  getMonitoringReport: () => getMonitoringReport,
  runMonitoringCheck: () => runMonitoringCheck,
  sendSyncAlert: () => sendSyncAlert
});
async function checkSyncHealth(jobName, staleThresholdHours = STALE_SYNC_THRESHOLD_HOURS) {
  const status = {
    isHealthy: true,
    lastSuccessfulSync: null,
    hoursSinceLastSync: null,
    consecutiveFailures: 0,
    alerts: []
  };
  try {
    const recentRuns = jobName ? await getAllRecentSyncRuns(50) : await getAllRecentSyncRuns(50);
    const filteredRuns = jobName ? recentRuns.filter((r) => r.jobName === jobName) : recentRuns;
    if (filteredRuns.length === 0) {
      status.isHealthy = false;
      status.alerts.push("No sync runs found in history");
      return status;
    }
    const lastSuccess = filteredRuns.find((r) => r.status === "success");
    if (lastSuccess) {
      status.lastSuccessfulSync = lastSuccess.startedAt;
      const hoursSince = (Date.now() - lastSuccess.startedAt.getTime()) / (1e3 * 60 * 60);
      status.hoursSinceLastSync = Math.round(hoursSince * 10) / 10;
      if (hoursSince > staleThresholdHours) {
        status.isHealthy = false;
        status.alerts.push(
          `Sync is stale: ${status.hoursSinceLastSync} hours since last successful sync (threshold: ${staleThresholdHours} hours)`
        );
      }
    } else {
      status.isHealthy = false;
      status.alerts.push("No successful sync runs found in recent history");
    }
    for (const run of filteredRuns) {
      if (run.status === "success") break;
      if (run.status === "failed") {
        status.consecutiveFailures++;
      }
    }
    if (status.consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
      status.isHealthy = false;
      status.alerts.push(
        `${status.consecutiveFailures} consecutive sync failures detected`
      );
    }
    return status;
  } catch (error) {
    status.isHealthy = false;
    status.alerts.push(`Error checking sync health: ${error instanceof Error ? error.message : String(error)}`);
    return status;
  }
}
async function sendSyncAlert(status) {
  if (status.isHealthy || status.alerts.length === 0) {
    return false;
  }
  const title = "\u26A0\uFE0F WFG CRM Sync Alert";
  const content = [
    "The sync monitoring system has detected issues:",
    "",
    ...status.alerts.map((a) => `\u2022 ${a}`),
    "",
    `Last successful sync: ${status.lastSuccessfulSync?.toISOString() ?? "Never"}`,
    `Hours since last sync: ${status.hoursSinceLastSync ?? "N/A"}`,
    `Consecutive failures: ${status.consecutiveFailures}`,
    "",
    "Please check the sync logs and resolve any issues."
  ].join("\n");
  try {
    return await notifyOwner({ title, content });
  } catch (error) {
    console.error("[Monitoring] Failed to send alert:", error);
    return false;
  }
}
async function runMonitoringCheck(jobName, staleThresholdHours = STALE_SYNC_THRESHOLD_HOURS) {
  console.log(`[Monitoring] Running health check for ${jobName ?? "all jobs"}...`);
  const status = await checkSyncHealth(jobName, staleThresholdHours);
  if (!status.isHealthy) {
    console.warn("[Monitoring] Sync health issues detected:", status.alerts);
    const alertSent = await sendSyncAlert(status);
    if (alertSent) {
      console.log("[Monitoring] Alert notification sent to owner");
    } else {
      console.warn("[Monitoring] Failed to send alert notification");
    }
  } else {
    console.log("[Monitoring] Sync health check passed");
  }
  return status;
}
async function getMonitoringReport() {
  const jobNames = ["fullsync", "transamerica-alerts", "transamerica-sync"];
  const byJob = {};
  for (const jobName of jobNames) {
    byJob[jobName] = await checkSyncHealth(jobName);
  }
  const overall = await checkSyncHealth();
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    overall,
    byJob
  };
}
var STALE_SYNC_THRESHOLD_HOURS, CONSECUTIVE_FAILURE_THRESHOLD;
var init_monitoring = __esm({
  "server/lib/monitoring.ts"() {
    "use strict";
    init_syncRuns();
    init_notification();
    STALE_SYNC_THRESHOLD_HOURS = 24;
    CONSECUTIVE_FAILURE_THRESHOLD = 3;
  }
});

// server/lib/jobLock.ts
var jobLock_exports = {};
__export(jobLock_exports, {
  acquireLock: () => acquireLock,
  extendLock: () => extendLock,
  forceReleaseLock: () => forceReleaseLock,
  getLockInfo: () => getLockInfo,
  isLocked: () => isLocked,
  releaseLock: () => releaseLock,
  withJobLock: () => withJobLock
});
import { eq as eq19, lt, and as and14, sql as sql11 } from "drizzle-orm";
import crypto2 from "crypto";
async function acquireLock(lockName, durationMs = DEFAULT_LOCK_DURATION_MS) {
  const db = await getDb2();
  if (!db) {
    console.error("[JobLock] Database not available");
    return null;
  }
  const ownerId = crypto2.randomUUID();
  const now = /* @__PURE__ */ new Date();
  const lockedUntil = new Date(now.getTime() + durationMs);
  try {
    await db.execute(sql11`
      INSERT INTO job_locks (name, ownerId, lockedAt, lockedUntil, heartbeatAt)
      VALUES (${lockName}, ${ownerId}, NOW(), ${lockedUntil}, NOW())
      ON DUPLICATE KEY UPDATE
        ownerId     = IF(lockedUntil < NOW(), VALUES(ownerId), ownerId),
        lockedAt    = IF(lockedUntil < NOW(), NOW(), lockedAt),
        lockedUntil = IF(lockedUntil < NOW(), VALUES(lockedUntil), lockedUntil),
        heartbeatAt = IF(lockedUntil < NOW(), NOW(), heartbeatAt)
    `);
    const result = await db.select().from(jobLocks).where(eq19(jobLocks.name, lockName)).limit(1);
    if (result.length > 0 && result[0].ownerId === ownerId) {
      console.log(`[JobLock] Acquired lock "${lockName}" with owner ${ownerId}`);
      return ownerId;
    }
    if (result.length > 0) {
      console.log(`[JobLock] Lock "${lockName}" is held by ${result[0].ownerId} until ${result[0].lockedUntil}`);
    }
    return null;
  } catch (error) {
    console.error(`[JobLock] Error acquiring lock "${lockName}":`, error);
    return null;
  }
}
async function releaseLock(lockName, ownerId) {
  const db = await getDb2();
  if (!db) {
    console.error("[JobLock] Database not available");
    return false;
  }
  try {
    await db.delete(jobLocks).where(
      and14(
        eq19(jobLocks.name, lockName),
        eq19(jobLocks.ownerId, ownerId)
      )
    );
    console.log(`[JobLock] Released lock "${lockName}" for owner ${ownerId}`);
    return true;
  } catch (error) {
    console.error(`[JobLock] Error releasing lock "${lockName}":`, error);
    return false;
  }
}
async function extendLock(lockName, ownerId, durationMs = DEFAULT_LOCK_DURATION_MS) {
  const db = await getDb2();
  if (!db) {
    console.error("[JobLock] Database not available");
    return false;
  }
  const now = /* @__PURE__ */ new Date();
  const lockedUntil = new Date(now.getTime() + durationMs);
  try {
    await db.update(jobLocks).set({
      lockedUntil,
      heartbeatAt: now
    }).where(
      and14(
        eq19(jobLocks.name, lockName),
        eq19(jobLocks.ownerId, ownerId)
      )
    );
    return true;
  } catch (error) {
    console.error(`[JobLock] Error extending lock "${lockName}":`, error);
    return false;
  }
}
async function withJobLock(lockName, durationMs, fn) {
  const ownerId = await acquireLock(lockName, durationMs);
  if (!ownerId) {
    return { success: false, reason: "locked" };
  }
  const heartbeatInterval = setInterval(() => {
    extendLock(lockName, ownerId, durationMs).catch((err) => {
      console.error(`[JobLock] Heartbeat failed for "${lockName}":`, err);
    });
  }, HEARTBEAT_INTERVAL_MS);
  try {
    const result = await fn();
    return { success: true, result };
  } catch (error) {
    return { success: false, reason: "error", error };
  } finally {
    clearInterval(heartbeatInterval);
    await releaseLock(lockName, ownerId);
  }
}
async function isLocked(lockName) {
  const db = await getDb2();
  if (!db) {
    console.error("[JobLock] Database not available");
    return false;
  }
  try {
    const locks = await db.select().from(jobLocks).where(
      and14(
        eq19(jobLocks.name, lockName),
        lt(sql11`NOW()`, jobLocks.lockedUntil)
      )
    ).limit(1);
    return locks.length > 0;
  } catch (error) {
    console.error(`[JobLock] Error checking lock "${lockName}":`, error);
    return false;
  }
}
async function getLockInfo(lockName) {
  const db = await getDb2();
  if (!db) {
    console.error("[JobLock] Database not available");
    return null;
  }
  try {
    const locks = await db.select().from(jobLocks).where(eq19(jobLocks.name, lockName)).limit(1);
    if (locks.length === 0) {
      return { isLocked: false };
    }
    const lock = locks[0];
    const now = /* @__PURE__ */ new Date();
    return {
      isLocked: lock.lockedUntil > now,
      ownerId: lock.ownerId,
      lockedAt: lock.lockedAt,
      lockedUntil: lock.lockedUntil,
      heartbeatAt: lock.heartbeatAt
    };
  } catch (error) {
    console.error(`[JobLock] Error getting lock info for "${lockName}":`, error);
    return null;
  }
}
async function forceReleaseLock(lockName) {
  const db = await getDb2();
  if (!db) {
    console.error("[JobLock] Database not available");
    return false;
  }
  try {
    await db.delete(jobLocks).where(eq19(jobLocks.name, lockName));
    console.log(`[JobLock] Force released lock "${lockName}"`);
    return true;
  } catch (error) {
    console.error(`[JobLock] Error force releasing lock "${lockName}":`, error);
    return false;
  }
}
var DEFAULT_LOCK_DURATION_MS, HEARTBEAT_INTERVAL_MS;
var init_jobLock = __esm({
  "server/lib/jobLock.ts"() {
    "use strict";
    init_db();
    init_schema();
    DEFAULT_LOCK_DURATION_MS = 30 * 60 * 1e3;
    HEARTBEAT_INTERVAL_MS = 60 * 1e3;
  }
});

// server/lib/artifacts.ts
import fs2 from "node:fs";
import path3 from "node:path";
async function captureArtifacts(opts) {
  const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const base = path3.join(ARTIFACTS_DIR, opts.job, ts);
  try {
    fs2.mkdirSync(base, { recursive: true });
  } catch (err) {
    console.error("[Artifacts] Failed to create directory:", err);
    return base;
  }
  const errorText = opts.error instanceof Error ? `${opts.error.name}: ${opts.error.message}

Stack:
${opts.error.stack ?? "No stack trace"}` : String(opts.error ?? "Unknown error");
  try {
    fs2.writeFileSync(path3.join(base, "error.txt"), errorText);
  } catch (err) {
    console.error("[Artifacts] Failed to write error.txt:", err);
  }
  if (opts.page) {
    try {
      await opts.page.screenshot({
        path: path3.join(base, "page.png"),
        fullPage: true,
        timeout: 1e4
      });
    } catch (err) {
      console.error("[Artifacts] Failed to capture screenshot:", err);
    }
    try {
      const html = await opts.page.content();
      fs2.writeFileSync(path3.join(base, "page.html"), html);
    } catch (err) {
      console.error("[Artifacts] Failed to capture HTML:", err);
    }
    try {
      const url = opts.page.url();
      fs2.writeFileSync(path3.join(base, "url.txt"), url);
    } catch (err) {
      console.error("[Artifacts] Failed to capture URL:", err);
    }
  }
  if (opts.additionalData) {
    try {
      fs2.writeFileSync(
        path3.join(base, "context.json"),
        JSON.stringify(opts.additionalData, null, 2)
      );
    } catch (err) {
      console.error("[Artifacts] Failed to write context.json:", err);
    }
  }
  try {
    fs2.writeFileSync(
      path3.join(base, "metadata.json"),
      JSON.stringify({
        job: opts.job,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        hasPage: !!opts.page,
        hasError: !!opts.error
      }, null, 2)
    );
  } catch (err) {
    console.error("[Artifacts] Failed to write metadata.json:", err);
  }
  console.log(`[Artifacts] Captured to: ${base}`);
  return base;
}
var ARTIFACTS_DIR;
var init_artifacts = __esm({
  "server/lib/artifacts.ts"() {
    "use strict";
    ARTIFACTS_DIR = path3.join(process.cwd(), "artifacts");
  }
});

// server/services/notificationService.ts
async function notifySyncCompleted(params) {
  const { syncType, duration, metrics, userId } = params;
  const isDuplicate = await hasSimilarNotification(
    userId ?? null,
    "SYNC_COMPLETED",
    "sync",
    syncType,
    5
    // Within 5 minutes
  );
  if (isDuplicate) return;
  const metricsText = metrics ? Object.entries(metrics).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
  await createNotification({
    userId,
    type: "SYNC_COMPLETED",
    title: `${syncType} Sync Completed`,
    message: `Sync completed in ${Math.round(duration / 1e3)}s.${metricsText ? ` ${metricsText}` : ""}`,
    linkUrl: "/sync-logs",
    linkLabel: "View Sync Logs",
    relatedEntityType: "sync",
    relatedEntityId: syncType,
    priority: "LOW",
    metadata: { syncType, duration, metrics }
  });
}
async function notifySyncFailed(params) {
  const { syncType, error, userId } = params;
  await createNotification({
    userId,
    type: "SYNC_FAILED",
    title: `${syncType} Sync Failed`,
    message: error.length > 200 ? error.substring(0, 200) + "..." : error,
    linkUrl: "/sync-logs",
    linkLabel: "View Details",
    relatedEntityType: "sync",
    relatedEntityId: syncType,
    priority: "HIGH",
    metadata: { syncType, error }
  });
}
var init_notificationService = __esm({
  "server/services/notificationService.ts"() {
    "use strict";
    init_notifications();
  }
});

// server/transamerica-alerts-sync.ts
var transamerica_alerts_sync_exports = {};
__export(transamerica_alerts_sync_exports, {
  getCachedAlerts: () => getCachedAlerts,
  syncTransamericaAlerts: () => syncTransamericaAlerts
});
function mustGetEnv7(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
function delay(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function loginToTransamerica2(page) {
  console.log("[TA Alerts] Navigating to Transamerica login...");
  try {
    await page.goto("https://secure.transamerica.com/login/sign-in/login.html", {
      waitUntil: "networkidle2",
      timeout: 6e4
    });
    await delay(2e3);
    console.log("[TA Alerts] Starting OTP session before login...");
    const otpSessionId = startOTPSession("transamerica");
    const gmailCreds = getTransamericaCredentials();
    console.log("[TA Alerts] Filling login credentials...");
    await page.evaluate((username, password) => {
      const userInput = document.querySelector('input[name="USER"]') || document.querySelector('input[name="username"]') || document.querySelector('input[type="text"]');
      const passInput = document.querySelector('input[name="PASSWORD"]') || document.querySelector('input[name="password"]') || document.querySelector('input[type="password"]');
      if (userInput) userInput.value = username;
      if (passInput) passInput.value = password;
    }, TA_USERNAME, TA_PASSWORD);
    console.log("[TA Alerts] Clicking login button...");
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]') || document.querySelector("#formLogin");
      if (btn) btn.click();
    });
    await delay(5e3);
    const pageContent = await page.content();
    if (pageContent.includes("Extra Security") || pageContent.includes("validation code")) {
      console.log("[TA Alerts] OTP verification required...");
      await page.evaluate(() => {
        const emailRadio = document.querySelector('input[value="email"]');
        if (emailRadio) emailRadio.click();
      });
      await delay(1e3);
      await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      });
      await delay(3e3);
      console.log("[TA Alerts] Waiting for OTP...");
      const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3);
      if (!otpResult.success || !otpResult.otp) {
        console.error("[TA Alerts] Failed to retrieve OTP:", otpResult.error);
        return false;
      }
      const otp = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
      console.log(`[TA Alerts] OTP received: ${otp}`);
      await page.type('input[type="text"]', otp);
      await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      });
      await delay(5e3);
    }
    const securityContent = await page.content();
    if (securityContent.includes("Unrecognized Device") || securityContent.includes("security question")) {
      console.log("[TA Alerts] Security question detected...");
      let answer = "";
      if (securityContent.toLowerCase().includes("first job")) {
        answer = SECURITY_Q_FIRST_JOB;
      } else if (securityContent.toLowerCase().includes("pet")) {
        answer = SECURITY_Q_PET;
      }
      if (answer) {
        await page.type('input[type="text"]', answer);
        await page.evaluate(() => {
          const checkboxes = document.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach((cb) => cb.checked = true);
        });
        await page.evaluate(() => {
          const btn = document.querySelector('button[type="submit"]');
          if (btn) btn.click();
        });
        await delay(5e3);
      }
    }
    console.log("[TA Alerts] Login completed");
    return true;
  } catch (error) {
    console.error("[TA Alerts] Login failed:", error);
    return false;
  }
}
async function navigateToAlerts(page) {
  console.log("[TA Alerts] Navigating to Life Access alerts...");
  try {
    await delay(3e3);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const btn of buttons) {
        if (btn.textContent?.includes("Launch")) {
          btn.click();
          break;
        }
      }
    });
    await delay(5e3);
    await page.goto("https://lifeaccess.transamerica.com/app/lifeaccess#/display/Alerts", {
      waitUntil: "networkidle2",
      timeout: 6e4
    });
    await delay(3e3);
    console.log("[TA Alerts] Navigated to Alerts page");
    return true;
  } catch (error) {
    console.error("[TA Alerts] Navigation failed:", error);
    return false;
  }
}
async function extractAlerts(page) {
  console.log("[TA Alerts] Extracting alerts...");
  const alerts = {
    totalUnreadAlerts: 0,
    reversedPremiumPayments: [],
    eftRemovals: [],
    lastSyncDate: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await delay(2e3);
    const totalAlerts = await page.evaluate(() => {
      const badge = document.querySelector('.badge, .alert-count, [class*="count"]');
      if (badge) {
        const count2 = parseInt(badge.textContent || "0", 10);
        if (!isNaN(count2)) return count2;
      }
      const rows = document.querySelectorAll('table tr, .alert-item, [class*="alert-row"]');
      return rows.length;
    });
    alerts.totalUnreadAlerts = totalAlerts;
    const extractedAlerts = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll("table tbody tr, .alert-item");
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        const text2 = row.textContent?.toLowerCase() || "";
        let type = "unknown";
        if (text2.includes("reversed") || text2.includes("chargeback") || text2.includes("premium payment")) {
          type = "reversed";
        } else if (text2.includes("eft") || text2.includes("electronic funds") || text2.includes("removed from")) {
          type = "eft";
        }
        const policyMatch = text2.match(/\b(\d{10})\b/);
        const policyNumber = policyMatch ? policyMatch[1] : "";
        const nameMatch = text2.match(/([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/);
        const ownerName = nameMatch ? nameMatch[1] : "";
        const dateMatch = text2.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        const date2 = dateMatch ? dateMatch[1] : (/* @__PURE__ */ new Date()).toLocaleDateString();
        if (policyNumber && type !== "unknown") {
          results.push({ type, policyNumber, ownerName, date: date2 });
        }
      });
      return results;
    });
    for (const alert of extractedAlerts) {
      const policyAlert = {
        policyNumber: alert.policyNumber,
        ownerName: alert.ownerName,
        alertDate: alert.date,
        alertType: alert.type === "reversed" ? "Reversed premium payment" : "Policy removed from Electronic Funds Transfer"
      };
      if (alert.type === "reversed") {
        alerts.reversedPremiumPayments.push(policyAlert);
      } else if (alert.type === "eft") {
        alerts.eftRemovals.push(policyAlert);
      }
    }
    console.log(`[TA Alerts] Extracted ${alerts.reversedPremiumPayments.length} reversed payments, ${alerts.eftRemovals.length} EFT removals`);
  } catch (error) {
    console.error("[TA Alerts] Error extracting alerts:", error);
  }
  return alerts;
}
async function extractAlertsFromDashboard(page) {
  console.log("[TA Alerts] Trying to extract alerts from dashboard...");
  const alerts = {
    totalUnreadAlerts: 0,
    reversedPremiumPayments: [],
    eftRemovals: [],
    lastSyncDate: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await page.goto("https://lifeaccess.transamerica.com/app/lifeaccess#/display/Dashboard", {
      waitUntil: "networkidle2",
      timeout: 6e4
    });
    await delay(3e3);
    const dashboardAlerts = await page.evaluate(() => {
      const results = [];
      const alertSections = document.querySelectorAll('[class*="alert"], [class*="notification"], [class*="warning"]');
      alertSections.forEach((section) => {
        const text2 = section.textContent?.toLowerCase() || "";
        if (text2.includes("reversed") || text2.includes("chargeback")) {
          const policyMatch = text2.match(/\b(\d{10})\b/);
          const nameMatch = text2.match(/([A-Z]{2,}\s+[A-Z]{2,})/);
          const dateMatch = text2.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          if (policyMatch) {
            results.push({
              type: "reversed",
              policyNumber: policyMatch[1],
              ownerName: nameMatch ? nameMatch[1] : "Unknown",
              date: dateMatch ? dateMatch[1] : (/* @__PURE__ */ new Date()).toLocaleDateString()
            });
          }
        }
        if (text2.includes("eft") || text2.includes("electronic funds")) {
          const policyMatch = text2.match(/\b(\d{10})\b/);
          const nameMatch = text2.match(/([A-Z]{2,}\s+[A-Z]{2,})/);
          const dateMatch = text2.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          if (policyMatch) {
            results.push({
              type: "eft",
              policyNumber: policyMatch[1],
              ownerName: nameMatch ? nameMatch[1] : "Unknown",
              date: dateMatch ? dateMatch[1] : (/* @__PURE__ */ new Date()).toLocaleDateString()
            });
          }
        }
      });
      return results;
    });
    for (const alert of dashboardAlerts) {
      const policyAlert = {
        policyNumber: alert.policyNumber,
        ownerName: alert.ownerName,
        alertDate: alert.date,
        alertType: alert.type === "reversed" ? "Reversed premium payment" : "Policy removed from Electronic Funds Transfer"
      };
      if (alert.type === "reversed") {
        alerts.reversedPremiumPayments.push(policyAlert);
      } else if (alert.type === "eft") {
        alerts.eftRemovals.push(policyAlert);
      }
    }
    const unreadCount = await page.evaluate(() => {
      const badge = document.querySelector('[class*="badge"], [class*="count"]');
      return badge ? parseInt(badge.textContent || "0", 10) : 0;
    });
    alerts.totalUnreadAlerts = unreadCount || alerts.reversedPremiumPayments.length + alerts.eftRemovals.length;
  } catch (error) {
    console.error("[TA Alerts] Error extracting from dashboard:", error);
  }
  return alerts;
}
async function saveAlertsToDatabase(alerts) {
  const db = await getDb2();
  if (!db) {
    console.error("[TA Alerts] Database not available");
    return;
  }
  try {
    await db.insert(syncLogs).values({
      syncType: "TRANSAMERICA_ALERTS",
      status: "SUCCESS",
      agentsProcessed: alerts.reversedPremiumPayments.length + alerts.eftRemovals.length,
      agentsCreated: 0,
      agentsUpdated: 0,
      errorsCount: 0,
      summary: `Synced ${alerts.reversedPremiumPayments.length} chargebacks, ${alerts.eftRemovals.length} EFT removals`,
      errorMessages: JSON.stringify([]),
      startedAt: /* @__PURE__ */ new Date(),
      completedAt: /* @__PURE__ */ new Date()
    });
    console.log("[TA Alerts] Saved sync log to database");
  } catch (error) {
    console.error("[TA Alerts] Error saving to database:", error);
  }
}
async function syncTransamericaAlerts() {
  const result = {
    success: false,
    alerts: {
      totalUnreadAlerts: 0,
      reversedPremiumPayments: [],
      eftRemovals: [],
      lastSyncDate: (/* @__PURE__ */ new Date()).toISOString()
    },
    newAlertsDetected: false,
    notificationSent: false,
    errors: []
  };
  let browser = null;
  let page;
  try {
    console.log("[TA Alerts] Starting alerts sync...");
    ({ browser, page } = await launchBrowser());
    const loginSuccess = await loginToTransamerica2(page);
    if (!loginSuccess) {
      result.errors.push("Failed to login to Transamerica");
      return result;
    }
    const navSuccess = await navigateToAlerts(page);
    let alerts;
    if (navSuccess) {
      alerts = await extractAlerts(page);
    } else {
      alerts = await extractAlertsFromDashboard(page);
    }
    if (alerts.reversedPremiumPayments.length === 0 && alerts.eftRemovals.length === 0) {
      console.log("[TA Alerts] No alerts found via scraping, using cached data");
      const { getCurrentTransamericaAlerts: getCurrentTransamericaAlerts2 } = await Promise.resolve().then(() => (init_chargeback_notification(), chargeback_notification_exports));
      alerts = getCurrentTransamericaAlerts2();
    }
    result.alerts = alerts;
    result.newAlertsDetected = hasNewAlerts(alerts, previousAlerts);
    if (result.newAlertsDetected) {
      console.log("[TA Alerts] New alerts detected, sending notification...");
      result.notificationSent = await sendChargebackNotification(alerts);
    }
    previousAlerts = alerts;
    await saveAlertsToDatabase(alerts);
    result.success = true;
    console.log(`[TA Alerts] Sync completed. ${alerts.reversedPremiumPayments.length} chargebacks, ${alerts.eftRemovals.length} EFT removals`);
  } catch (error) {
    console.error("[TA Alerts] Sync error:", error);
    result.errors.push(String(error));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  return result;
}
function getCachedAlerts() {
  return previousAlerts;
}
var TA_USERNAME, TA_PASSWORD, SECURITY_Q_FIRST_JOB, SECURITY_Q_PET, previousAlerts;
var init_transamerica_alerts_sync = __esm({
  "server/transamerica-alerts-sync.ts"() {
    "use strict";
    init_browser();
    init_db();
    init_schema();
    init_gmail_otp_v2();
    init_chargeback_notification();
    TA_USERNAME = mustGetEnv7("TRANSAMERICA_USERNAME");
    TA_PASSWORD = mustGetEnv7("TRANSAMERICA_PASSWORD");
    SECURITY_Q_FIRST_JOB = mustGetEnv7("TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY");
    SECURITY_Q_PET = mustGetEnv7("TRANSAMERICA_SECURITY_Q_PET_NAME");
    previousAlerts = null;
  }
});

// server/scheduler.ts
var scheduler_exports = {};
__export(scheduler_exports, {
  getLastSyncTime: () => getLastSyncTime2,
  getSchedulerStatus: () => getSchedulerStatus,
  saveQueryMetricsSnapshot: () => saveQueryMetricsSnapshot,
  startScheduler: () => startScheduler,
  stopScheduler: () => stopScheduler,
  syncTransamericaAlerts: () => syncTransamericaAlerts2
});
import crypto3 from "crypto";
async function runScheduledJob(opts) {
  const runId = crypto3.randomUUID();
  const started = Date.now();
  await createSyncRun({
    id: runId,
    jobName: opts.jobName,
    triggeredBy: opts.triggeredBy
  });
  const lockResult = await withJobLock(opts.lockName, opts.lockMs, opts.fn);
  if (lockResult.success) {
    await finishSyncRun({
      id: runId,
      status: "success",
      durationMs: Date.now() - started,
      metrics: lockResult.result ?? {}
    });
    return { success: true, result: lockResult.result, runId };
  }
  if (lockResult.reason === "locked") {
    await finishSyncRun({
      id: runId,
      status: "cancelled",
      durationMs: Date.now() - started,
      errorSummary: "Job is already running (locked)"
    });
    return { success: false, locked: true, error: "Job is already running", runId };
  }
  const artifactsPath = await captureArtifacts({
    job: opts.jobName,
    error: lockResult.error
  });
  await finishSyncRun({
    id: runId,
    status: "failed",
    durationMs: Date.now() - started,
    errorSummary: lockResult.error instanceof Error ? lockResult.error.message : String(lockResult.error),
    artifactsPath
  });
  return {
    success: false,
    error: lockResult.error instanceof Error ? lockResult.error.message : String(lockResult.error),
    runId
  };
}
function getLastSyncTime2(taskName) {
  return lastSyncTimes[taskName] || null;
}
function getSchedulerStatus() {
  return {
    isRunning: scheduledIntervals.length > 0,
    tasks: {
      transamericaAlerts: {
        lastSync: lastSyncTimes["transamericaAlerts"] || null,
        intervalHours: 6
      },
      queryMetricsSnapshot: {
        lastSync: lastSyncTimes["queryMetricsSnapshot"] || null,
        intervalHours: 1
      }
    }
  };
}
async function saveQueryMetricsSnapshot() {
  const run = await runScheduledJob({
    jobName: "scheduler:query-metrics-snapshot",
    lockName: "scheduler:query-metrics-snapshot",
    lockMs: 10 * 60 * 1e3,
    triggeredBy: "scheduler",
    fn: async () => {
      const { saveAndResetMetrics: saveAndResetMetrics2 } = await Promise.resolve().then(() => (init_queryMetrics(), queryMetrics_exports));
      return await saveAndResetMetrics2("HOURLY");
    }
  });
  if (!run.success) {
    const errorMessage = run.locked ? "Job is already running" : run.error ?? "Unknown error";
    logger.error("[Scheduler] Query metrics snapshot failed", void 0, { errorMsg: errorMessage });
    return { success: false, error: errorMessage };
  }
  const snapshot = run.result;
  lastSyncTimes["queryMetricsSnapshot"] = /* @__PURE__ */ new Date();
  logger.info("[Scheduler] Query metrics snapshot saved", {
    snapshotId: snapshot.id,
    totalQueries: snapshot.totalQueries,
    runId: run.runId
  });
  await notifySyncCompleted({
    syncType: "Query Metrics",
    duration: Date.now() - (lastSyncTimes["queryMetricsSnapshot"]?.getTime() ?? Date.now()),
    metrics: { totalQueries: snapshot.totalQueries }
  }).catch((err) => logger.warn("[Scheduler] Failed to send metrics notification", { error: String(err) }));
  return { success: true, snapshotId: snapshot.id };
}
async function syncTransamericaAlerts2() {
  const run = await runScheduledJob({
    jobName: "scheduler:transamerica-alerts",
    lockName: "scheduler:transamerica-alerts",
    lockMs: 30 * 60 * 1e3,
    triggeredBy: "scheduler",
    fn: async () => {
      logger.info("[Scheduler] Starting Transamerica alerts sync...");
      const { syncTransamericaAlerts: runSync } = await Promise.resolve().then(() => (init_transamerica_alerts_sync(), transamerica_alerts_sync_exports));
      return await runSync();
    }
  });
  if (!run.success) {
    const errorMessage = run.locked ? "Job is already running" : run.error ?? "Unknown error";
    logger.error("[Scheduler] Transamerica alerts sync failed", void 0, { errorMsg: errorMessage, runId: run.runId });
    if (!run.locked) {
      await notifySyncFailed({
        syncType: "Transamerica Alerts",
        error: errorMessage
      }).catch((err) => logger.warn("[Scheduler] Failed to send failure notification", { error: String(err) }));
    }
    return {
      success: false,
      alertsCount: 0,
      newAlertsDetected: false,
      notificationSent: false,
      error: errorMessage
    };
  }
  const result = run.result;
  lastSyncTimes["transamericaAlerts"] = /* @__PURE__ */ new Date();
  const alertsCount = (result?.alerts?.reversedPremiumPayments?.length ?? 0) + (result?.alerts?.eftRemovals?.length ?? 0);
  logger.info("[Scheduler] Transamerica alerts sync completed", {
    success: result.success,
    alertsCount,
    newAlertsDetected: result.newAlertsDetected,
    runId: run.runId
  });
  await notifySyncCompleted({
    syncType: "Transamerica Alerts",
    duration: Date.now() - (lastSyncTimes["transamericaAlerts"]?.getTime() ?? Date.now()),
    metrics: { alertsCount, newAlertsDetected: result.newAlertsDetected ? 1 : 0 }
  }).catch((err) => logger.warn("[Scheduler] Failed to send sync notification", { error: String(err) }));
  return {
    success: !!result.success,
    alertsCount,
    newAlertsDetected: !!result.newAlertsDetected,
    notificationSent: !!result.notificationSent,
    error: result.error
  };
}
function startScheduler() {
  logger.info("[Scheduler] Starting scheduled tasks...");
  const SIX_HOURS = 6 * 60 * 60 * 1e3;
  if (ENV.isProduction) {
    setTimeout(async () => {
      logger.info("[Scheduler] Running initial Transamerica alerts sync...");
      await syncTransamericaAlerts2();
    }, 6e4);
  } else {
    logger.info("[Scheduler] Skipping initial sync in development mode");
  }
  const transamericaInterval = setInterval(async () => {
    logger.info("[Scheduler] Running scheduled Transamerica alerts sync...");
    await syncTransamericaAlerts2();
  }, SIX_HOURS);
  scheduledIntervals.push(transamericaInterval);
  const ONE_HOUR = 60 * 60 * 1e3;
  const metricsInterval = setInterval(async () => {
    logger.info("[Scheduler] Saving query metrics snapshot...");
    await saveQueryMetricsSnapshot();
  }, ONE_HOUR);
  scheduledIntervals.push(metricsInterval);
  logger.info("[Scheduler] Scheduled tasks started", {
    tasks: ["transamericaAlerts", "queryMetricsSnapshot"],
    intervals: {
      transamericaAlerts: "6 hours",
      queryMetricsSnapshot: "1 hour"
    }
  });
}
function stopScheduler() {
  logger.info("[Scheduler] Stopping scheduled tasks...");
  scheduledIntervals.forEach((interval) => clearInterval(interval));
  scheduledIntervals.length = 0;
  logger.info("[Scheduler] All scheduled tasks stopped");
}
var scheduledIntervals, lastSyncTimes;
var init_scheduler = __esm({
  "server/scheduler.ts"() {
    "use strict";
    init_logger();
    init_env();
    init_jobLock();
    init_syncRuns();
    init_artifacts();
    init_notificationService();
    scheduledIntervals = [];
    lastSyncTimes = {};
    process.on("SIGTERM", () => {
      stopScheduler();
    });
    process.on("SIGINT", () => {
      stopScheduler();
    });
  }
});

// server/lib/cronAuth.ts
var cronAuth_exports = {};
__export(cronAuth_exports, {
  cronAuthMiddleware: () => cronAuthMiddleware,
  isCronAuthenticated: () => isCronAuthenticated,
  requireCronSecret: () => requireCronSecret
});
function requireCronSecret(req) {
  const syncSecret = getEnv("SYNC_SECRET");
  if (!syncSecret || syncSecret.trim() === "") {
    throw Object.assign(
      new Error("SYNC_SECRET environment variable not configured"),
      { statusCode: 500 }
    );
  }
  const headerSecret = req.header(SYNC_SECRET_HEADER);
  if (headerSecret === syncSecret) {
    return;
  }
  const querySecret = req.query[SYNC_SECRET_QUERY];
  if (querySecret === syncSecret) {
    if (ENV.isProduction && !ENV.enableCronGetSecret) {
      throw Object.assign(
        new Error("Query-string cron secret is disabled in production. Use POST with x-sync-secret header."),
        { statusCode: 401 }
      );
    }
    console.warn(
      `[Cron Auth] DEPRECATED: Using query parameter for sync secret. Request ID: ${req.requestId ?? "unknown"}. Please migrate to POST with x-sync-secret header.`
    );
    return;
  }
  throw Object.assign(
    new Error("Invalid or missing sync secret"),
    { statusCode: 401 }
  );
}
function cronAuthMiddleware(req, res, next) {
  try {
    requireCronSecret(req);
    next();
  } catch (err) {
    const statusCode = err.statusCode ?? 500;
    const message = err.message ?? "Authentication failed";
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
}
function isCronAuthenticated(req) {
  try {
    requireCronSecret(req);
    return true;
  } catch {
    return false;
  }
}
var SYNC_SECRET_HEADER, SYNC_SECRET_QUERY;
var init_cronAuth = __esm({
  "server/lib/cronAuth.ts"() {
    "use strict";
    init_env();
    init_env_schema();
    SYNC_SECRET_HEADER = "x-sync-secret";
    SYNC_SECRET_QUERY = "secret";
  }
});

// server/agent-licensing-sync.ts
var agent_licensing_sync_exports = {};
__export(agent_licensing_sync_exports, {
  importNewLicensedAgents: () => importNewLicensedAgents,
  syncAgentLicensingStatus: () => syncAgentLicensingStatus
});
import { eq as eq20 } from "drizzle-orm";
async function syncAgentLicensingStatus() {
  console.log("[Licensing Sync] Starting agent licensing status sync...");
  try {
    const result = await fetchDownlineStatus();
    if (!result.success || !result.agents) {
      return {
        success: false,
        updated: 0,
        total: 0,
        error: result.error || "Failed to fetch agents from MyWFG"
      };
    }
    const licensedAgents = result.agents;
    console.log(`[Licensing Sync] Found ${licensedAgents.length} licensed agents from MyWFG`);
    const licensedAgentCodes = /* @__PURE__ */ new Map();
    for (const agent of licensedAgents) {
      if (agent.agentCode) {
        licensedAgentCodes.set(agent.agentCode.toUpperCase(), {
          isLicensed: agent.isLifeLicensed,
          llEndDate: agent.llEndDate || null
        });
      }
    }
    const db = await getDb2();
    if (!db) {
      return { success: false, updated: 0, total: 0, error: "Database connection failed" };
    }
    const dbAgents = await db.select().from(agents);
    console.log(`[Licensing Sync] Found ${dbAgents.length} agents in database`);
    let updated = 0;
    for (const dbAgent of dbAgents) {
      if (!dbAgent.agentCode) continue;
      const licenseInfo = licensedAgentCodes.get(dbAgent.agentCode.toUpperCase());
      const isLicensed = licenseInfo?.isLicensed ?? false;
      const needsUpdate = dbAgent.isLifeLicensed !== isLicensed;
      if (needsUpdate) {
        let newStage = dbAgent.currentStage;
        if (isLicensed && dbAgent.currentStage === "EXAM_PREP") {
          newStage = "LICENSED";
        } else if (!isLicensed && dbAgent.currentStage === "LICENSED") {
          newStage = "EXAM_PREP";
        }
        let llEndDate = null;
        if (licenseInfo?.llEndDate) {
          const [month, day, year] = licenseInfo.llEndDate.split("-");
          llEndDate = /* @__PURE__ */ new Date(`20${year}-${month}-${day}`);
        }
        await db.update(agents).set({
          isLifeLicensed: isLicensed,
          currentStage: newStage
        }).where(eq20(agents.id, dbAgent.id));
        updated++;
        console.log(`[Licensing Sync] Updated: ${dbAgent.firstName} ${dbAgent.lastName} (${dbAgent.agentCode}) - Licensed: ${isLicensed}, Stage: ${newStage}`);
      }
    }
    console.log(`[Licensing Sync] Completed - Updated ${updated} of ${dbAgents.length} agents`);
    return {
      success: true,
      updated,
      total: dbAgents.length
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Licensing Sync] Error:", errorMessage);
    return {
      success: false,
      updated: 0,
      total: 0,
      error: errorMessage
    };
  }
}
async function importNewLicensedAgents() {
  console.log("[Licensing Sync] Checking for new licensed agents to import...");
  try {
    const result = await fetchDownlineStatus();
    if (!result.success || !result.agents) {
      return {
        imported: 0,
        total: 0,
        error: result.error || "Failed to fetch agents from MyWFG"
      };
    }
    const licensedAgents = result.agents;
    const db = await getDb2();
    if (!db) {
      return { imported: 0, total: 0, error: "Database connection failed" };
    }
    const existingAgents = await db.select({ agentCode: agents.agentCode }).from(agents);
    const existingCodes = new Set(existingAgents.map((a) => a.agentCode?.toUpperCase()));
    const newAgents = licensedAgents.filter((a) => a.agentCode && !existingCodes.has(a.agentCode.toUpperCase()));
    if (newAgents.length === 0) {
      console.log("[Licensing Sync] No new agents to import");
      return { imported: 0, total: licensedAgents.length };
    }
    console.log(`[Licensing Sync] Found ${newAgents.length} new agents to import`);
    let imported = 0;
    for (const agent of newAgents) {
      try {
        const rankMap = {
          "01": "TA",
          "1": "TA",
          "10": "A",
          "15": "SA",
          "17": "MD",
          "19": "SMD",
          "20": "SMD"
        };
        const wfgRank = rankMap[agent.titleLevel || "01"] || "TA";
        let llEndDate = null;
        if (agent.llEndDate) {
          const [month, day, year] = agent.llEndDate.split("-");
          llEndDate = /* @__PURE__ */ new Date(`20${year}-${month}-${day}`);
        }
        const rankEnumMap = {
          "TA": "TRAINING_ASSOCIATE",
          "A": "ASSOCIATE",
          "SA": "SENIOR_ASSOCIATE",
          "MD": "MARKETING_DIRECTOR",
          "SMD": "SENIOR_MARKETING_DIRECTOR"
        };
        const currentRank = rankEnumMap[wfgRank] || "TRAINING_ASSOCIATE";
        const commLevel = parseInt(agent.commLevel || agent.titleLevel || "25", 10) || 25;
        await db.insert(agents).values({
          firstName: agent.firstName || "Unknown",
          lastName: agent.lastName || "Unknown",
          agentCode: agent.agentCode,
          currentStage: agent.isLifeLicensed ? "LICENSED" : "EXAM_PREP",
          isLifeLicensed: agent.isLifeLicensed,
          currentRank,
          commissionLevel: commLevel
        });
        imported++;
        console.log(`[Licensing Sync] Imported: ${agent.firstName} ${agent.lastName} (${agent.agentCode})`);
      } catch (err) {
        console.error(`[Licensing Sync] Failed to import ${agent.firstName} ${agent.lastName}: ${err}`);
      }
    }
    return { imported, total: licensedAgents.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { imported: 0, total: 0, error: errorMessage };
  }
}
var init_agent_licensing_sync = __esm({
  "server/agent-licensing-sync.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_mywfg_downline_scraper();
  }
});

// server/jobs/fullsync.ts
var fullsync_exports = {};
__export(fullsync_exports, {
  executeFullSync: () => executeFullSync
});
import crypto4 from "crypto";
async function runFullSyncJob() {
  const metrics = {};
  console.log("[FullSync] Running full sync...");
  const { runFullSync: runFullSync2 } = await Promise.resolve().then(() => (init_sync_service(), sync_service_exports));
  const syncResults = await runFullSync2();
  metrics.fullSync = {
    success: syncResults.every((r) => r.success),
    platforms: syncResults.map((r) => ({
      platform: r.platform,
      success: r.success,
      error: r.error
    }))
  };
  console.log("[FullSync] Processing scheduled emails...");
  const { processScheduledEmails: processScheduledEmails2 } = await Promise.resolve().then(() => (init_email_tracking(), email_tracking_exports));
  const emailResults = await processScheduledEmails2();
  metrics.scheduledEmails = emailResults;
  console.log("[FullSync] Syncing agent licensing status...");
  try {
    const { syncAgentLicensingStatus: syncAgentLicensingStatus2 } = await Promise.resolve().then(() => (init_agent_licensing_sync(), agent_licensing_sync_exports));
    const licensingResult = await syncAgentLicensingStatus2();
    metrics.licensing = licensingResult;
  } catch (err) {
    metrics.licensing = {
      success: false,
      updated: 0,
      error: err instanceof Error ? err.message : "Unknown error"
    };
  }
  return metrics;
}
async function executeFullSync(triggeredBy = "manual") {
  const runId = crypto4.randomUUID();
  const started = Date.now();
  await createSyncRun({
    id: runId,
    jobName: JOB_NAME,
    triggeredBy
  });
  const result = await withJobLock(JOB_NAME, LOCK_DURATION_MS, async () => {
    return await runFullSyncJob();
  });
  if (result.success) {
    await finishSyncRun({
      id: runId,
      status: "success",
      durationMs: Date.now() - started,
      metrics: result.result
    });
    return {
      success: true,
      runId,
      metrics: result.result
    };
  } else if (result.reason === "locked") {
    await finishSyncRun({
      id: runId,
      status: "cancelled",
      durationMs: Date.now() - started,
      errorSummary: "Job is already running (locked)"
    });
    return {
      success: false,
      runId,
      error: "Job is already running"
    };
  } else {
    const artifactsPath = await captureArtifacts({
      job: JOB_NAME,
      error: result.error
    });
    await finishSyncRun({
      id: runId,
      status: "failed",
      durationMs: Date.now() - started,
      errorSummary: result.error instanceof Error ? result.error.message : String(result.error),
      artifactsPath
    });
    return {
      success: false,
      runId,
      error: result.error instanceof Error ? result.error.message : String(result.error)
    };
  }
}
var JOB_NAME, LOCK_DURATION_MS;
var init_fullsync = __esm({
  "server/jobs/fullsync.ts"() {
    "use strict";
    init_jobLock();
    init_syncRuns();
    init_artifacts();
    JOB_NAME = "fullsync";
    LOCK_DURATION_MS = 30 * 60 * 1e3;
    if (import.meta.url === `file://${process.argv[1]}`) {
      console.log("[FullSync] Starting full sync job...");
      executeFullSync("cli").then((result) => {
        if (result.success) {
          console.log("[FullSync] Job completed successfully");
          console.log("Run ID:", result.runId);
          console.log("Metrics:", JSON.stringify(result.metrics, null, 2));
          process.exit(0);
        } else {
          console.error("[FullSync] Job failed:", result.error);
          process.exit(1);
        }
      }).catch((err) => {
        console.error("[FullSync] Unexpected error:", err);
        process.exit(1);
      });
    }
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.secure) return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((p) => p.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  const sameSite = secure ? "none" : "lax";
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isString = (value) => typeof value === "string";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  getIssuer() {
    return "wfg-crm";
  }
  getAudience() {
    return ENV.appId;
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name ?? "",
      v: 1
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuer(this.getIssuer()).setAudience(this.getAudience()).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
        // Accept tokens with or without iss/aud for backward compatibility
        // New tokens will include these claims
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name: isString(name) ? name : ""
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
init_notification();
import { z as z2 } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
init_env_schema();
var systemRouter = router({
  health: publicProcedure.input(
    z2.object({
      timestamp: z2.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z2.object({
      title: z2.string().min(1, "title is required"),
      content: z2.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  }),
  // Get system configuration (admin only)
  getConfig: adminProcedure.query(() => {
    const syncSecret = getEnv("SYNC_SECRET");
    return {
      syncSecretConfigured: !!syncSecret && syncSecret.trim() !== "",
      syncSecret: syncSecret || null,
      appUrl: process.env.APP_URL || null,
      nodeEnv: process.env.NODE_ENV || "development"
    };
  }),
  // Trigger Chrome installation (admin only)
  installChrome: adminProcedure.mutation(async () => {
    const { execSync } = await import("child_process");
    const { existsSync: existsSync2, readdirSync: readdirSync2 } = await import("fs");
    const { resolve: resolve2 } = await import("path");
    const { homedir: homedir2 } = await import("os");
    const findChrome = () => {
      const cacheDirs = [
        resolve2(homedir2(), ".cache/puppeteer/chrome"),
        "/root/.cache/puppeteer/chrome"
      ];
      for (const dir of cacheDirs) {
        if (existsSync2(dir)) {
          try {
            const versions = readdirSync2(dir).sort().reverse();
            for (const ver of versions) {
              const bin = resolve2(dir, ver, "chrome-linux64", "chrome");
              if (existsSync2(bin)) return bin;
            }
          } catch {
          }
        }
      }
      for (const p of [
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/usr/bin/google-chrome-stable"
      ]) {
        if (existsSync2(p)) return p;
      }
      return null;
    };
    const existing = findChrome();
    if (existing) {
      return {
        success: true,
        message: "Chrome already installed",
        chromePath: existing
      };
    }
    try {
      execSync("npx puppeteer browsers install chrome", {
        stdio: "pipe",
        timeout: 3e5
      });
      const newPath = findChrome();
      return {
        success: true,
        message: "Chrome installed successfully",
        chromePath: newPath
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || "Failed to install Chrome",
        chromePath: null
      };
    }
  }),
  // Trigger deployment (admin only) - pulls from GitHub and restarts
  triggerDeploy: adminProcedure.mutation(async () => {
    const { execSync } = await import("child_process");
    const appDir = process.cwd();
    try {
      execSync("git pull origin main", {
        cwd: appDir,
        stdio: "pipe",
        timeout: 6e4
      });
      execSync("pnpm install --frozen-lockfile", {
        cwd: appDir,
        stdio: "pipe",
        timeout: 3e5
      });
      execSync("pnpm build", {
        cwd: appDir,
        stdio: "pipe",
        timeout: 3e5
      });
      setImmediate(() => {
        try {
          execSync("pm2 restart wfgcrm || pm2 restart all", {
            stdio: "pipe",
            timeout: 3e4
          });
        } catch {
        }
      });
      return {
        success: true,
        message: "Deployment completed. Application is restarting."
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || "Deployment failed"
      };
    }
  })
});

// server/routers.ts
init_db();

// server/routers/dashboard.ts
import { z as z3 } from "zod";
init_logger();
init_db();
init_email_tracking();
import { TRPCError as TRPCError3 } from "@trpc/server";
var dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    logger.info("Fetching dashboard stats");
    const allAgents = await getAgents();
    const allTasks = await getWorkflowTasks();
    const agentsByStage = {
      RECRUITMENT: allAgents.filter((a) => a.currentStage === "RECRUITMENT").length,
      EXAM_PREP: allAgents.filter((a) => a.currentStage === "EXAM_PREP").length,
      LICENSED: allAgents.filter((a) => a.currentStage === "LICENSED").length,
      PRODUCT_TRAINING: allAgents.filter((a) => a.currentStage === "PRODUCT_TRAINING").length,
      BUSINESS_LAUNCH: allAgents.filter((a) => a.currentStage === "BUSINESS_LAUNCH").length,
      NET_LICENSED: allAgents.filter((a) => a.currentStage === "NET_LICENSED").length,
      CLIENT_TRACKING: allAgents.filter((a) => a.currentStage === "CLIENT_TRACKING").length,
      CHARGEBACK_PROOF: allAgents.filter((a) => a.currentStage === "CHARGEBACK_PROOF").length
    };
    const now = /* @__PURE__ */ new Date();
    const overdueTasks = allTasks.filter((t2) => !t2.completedAt && t2.dueDate && new Date(t2.dueDate) < now);
    const taskStats = {
      total: allTasks.length,
      completed: allTasks.filter((t2) => t2.completedAt).length,
      pending: allTasks.filter((t2) => !t2.completedAt).length,
      overdue: overdueTasks.length
    };
    const latestSync = await getLatestSyncLog();
    return {
      totalAgents: allAgents.length,
      agentsByStage,
      taskStats,
      lastSyncDate: latestSync?.syncDate,
      lastUpdated: Date.now()
    };
  }),
  metrics: protectedProcedure.query(async () => {
    logger.info("Fetching dashboard metrics");
    return getDashboardMetrics();
  }),
  monthOverMonth: protectedProcedure.query(async () => {
    logger.info("Fetching month-over-month comparison");
    return getMonthOverMonthComparison();
  }),
  allProduction: protectedProcedure.query(async () => {
    logger.info("Fetching all production records");
    return getAllProductionRecords();
  }),
  syncStatus: protectedProcedure.query(async () => {
    logger.info("Fetching sync status");
    const { getSyncStatus: getSyncStatus2, getPaymentCycleInfo: getPaymentCycleInfo2 } = await Promise.resolve().then(() => (init_mywfg_sync_data(), mywfg_sync_data_exports));
    return {
      ...getSyncStatus2(),
      paymentCycle: getPaymentCycleInfo2()
    };
  }),
  monthlyCashFlow: protectedProcedure.query(async () => {
    logger.info("Fetching monthly cash flow data");
    const records = await getMonthlyTeamCashFlow("73DXR");
    return records.map((r) => ({
      monthYear: r.monthYear,
      month: r.month,
      year: r.year,
      superTeamCashFlow: parseFloat(String(r.superTeamCashFlow)),
      personalCashFlow: parseFloat(String(r.personalCashFlow))
    }));
  }),
  syncLogs: protectedProcedure.query(async () => {
    logger.info("Fetching recent sync logs");
    const { getRecentSyncLogs: getRecentSyncLogs2 } = await Promise.resolve().then(() => (init_mywfg_sync_data(), mywfg_sync_data_exports));
    return getRecentSyncLogs2(10);
  }),
  getTransamericaAlerts: protectedProcedure.query(async () => {
    logger.info("Fetching Transamerica alerts");
    const { getCurrentTransamericaAlerts: getCurrentTransamericaAlerts2 } = await Promise.resolve().then(() => (init_chargeback_notification(), chargeback_notification_exports));
    return getCurrentTransamericaAlerts2();
  }),
  sendChargebackNotification: protectedProcedure.mutation(async () => {
    logger.info("Sending chargeback notification");
    const { sendChargebackNotification: sendChargebackNotification2, getCurrentTransamericaAlerts: getCurrentTransamericaAlerts2 } = await Promise.resolve().then(() => (init_chargeback_notification(), chargeback_notification_exports));
    const alerts = getCurrentTransamericaAlerts2();
    const success = await sendChargebackNotification2(alerts);
    return { success, alertCount: alerts.reversedPremiumPayments.length + alerts.eftRemovals.length };
  }),
  triggerSync: protectedProcedure.mutation(async () => {
    logger.info("Triggering full sync");
    try {
      const { resolveChromePath: resolveChromePath2 } = await Promise.resolve().then(() => (init_browser(), browser_exports));
      if (!resolveChromePath2()) {
        logger.info("Chrome not found, attempting auto-install before sync...");
        const { execSync } = await import("child_process");
        const { resolve: resolve2 } = await import("path");
        const cacheDir = resolve2(process.cwd(), ".chrome-cache");
        execSync(`npx puppeteer browsers install chrome`, {
          stdio: "pipe",
          timeout: 3e5,
          env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir }
        });
        logger.info("Chrome auto-installed successfully");
      }
    } catch (chromeErr) {
      logger.warn("Chrome pre-install attempt failed (sync will try again)", { error: chromeErr?.message });
    }
    const { runFullSync: runFullSync2, getLastSyncTime: getLastSyncTime3 } = await Promise.resolve().then(() => (init_sync_service(), sync_service_exports));
    const results = await runFullSync2();
    return {
      results,
      lastSyncTime: getLastSyncTime3()
    };
  }),
  autoSyncStatus: protectedProcedure.query(async () => {
    logger.info("Fetching auto sync status");
    const { getLastSyncTime: getLastSyncTime3 } = await Promise.resolve().then(() => (init_sync_service(), sync_service_exports));
    const { getMyWFGCredentials: getMyWFGCredentials2, getTransamericaCredentials: getTransamericaCredentials3 } = await Promise.resolve().then(() => (init_gmail_otp(), gmail_otp_exports));
    const mywfgCreds = getMyWFGCredentials2();
    const transamericaCreds = getTransamericaCredentials3();
    return {
      lastSyncTime: getLastSyncTime3(),
      mywfgEmailConfigured: !!mywfgCreds.email && !!mywfgCreds.appPassword,
      transamericaEmailConfigured: !!transamericaCreds.email && !!transamericaCreds.appPassword,
      mywfgLoginConfigured: !!process.env.MYWFG_USERNAME && !!process.env.MYWFG_PASSWORD,
      transamericaLoginConfigured: !!process.env.TRANSAMERICA_USERNAME && !!process.env.TRANSAMERICA_PASSWORD
    };
  }),
  testGmailConnection: protectedProcedure.input(
    z3.object({
      platform: z3.enum(["mywfg", "transamerica"])
    })
  ).mutation(async ({ input }) => {
    logger.info("Testing Gmail connection", { platform: input.platform });
    const { verifyGmailCredentials: verifyGmailCredentials2, getMyWFGCredentials: getMyWFGCredentials2, getTransamericaCredentials: getTransamericaCredentials3 } = await Promise.resolve().then(() => (init_gmail_otp(), gmail_otp_exports));
    const credentials2 = input.platform === "mywfg" ? getMyWFGCredentials2() : getTransamericaCredentials3();
    const result = await verifyGmailCredentials2(credentials2);
    return result;
  }),
  getMissingLicenses: protectedProcedure.query(async () => {
    logger.info("Fetching agents with missing licenses");
    const allAgents = await getAgents();
    const missingLicenses = allAgents.filter(
      (a) => a.currentStage === "RECRUITMENT" || a.currentStage === "EXAM_PREP"
    );
    return missingLicenses.map((a) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phone: a.phone,
      currentStage: a.currentStage,
      currentRank: a.currentRank,
      examDate: a.examDate,
      uplineAgentId: a.uplineAgentId
    }));
  }),
  getNoRecurring: protectedProcedure.query(async () => {
    logger.info("Fetching policies without recurring premium");
    const policies = await getInforcePolicies();
    const noRecurring = policies.filter(
      (p) => !p.premiumFrequency || p.premiumFrequency === "Annual" || p.premiumFrequency === "Flexible"
    );
    return noRecurring.slice(0, 20).map((p) => ({
      id: p.id,
      policyNumber: p.policyNumber,
      ownerName: p.ownerName,
      writingAgentName: p.writingAgentName,
      productType: p.productType,
      faceAmount: p.faceAmount,
      premium: p.premium,
      premiumFrequency: p.premiumFrequency,
      status: p.status
    }));
  }),
  getPendingIssued: protectedProcedure.query(async () => {
    logger.info("Fetching pending issued policies");
    const pending = await getPendingPolicies();
    const issued = pending.filter(
      (p) => p.status?.toLowerCase() === "issued" || p.status?.toLowerCase() === "policy issued"
    );
    return issued.map((p) => ({
      id: p.id,
      policyNumber: p.policyNumber,
      insuredName: p.insuredName,
      writingAgent: p.writingAgent,
      product: p.product,
      faceAmount: p.faceAmount,
      premium: p.premium,
      status: p.status,
      submittedDate: p.submittedDate
    }));
  }),
  getInUnderwriting: protectedProcedure.query(async () => {
    logger.info("Fetching policies in underwriting");
    const pending = await getPendingPolicies();
    const inUnderwriting = pending.filter(
      (p) => p.status?.toLowerCase() === "pending" || p.status?.toLowerCase() === "in underwriting" || p.status?.toLowerCase() === "underwriting"
    );
    return inUnderwriting.map((p) => ({
      id: p.id,
      policyNumber: p.policyNumber,
      insuredName: p.insuredName,
      writingAgent: p.writingAgent,
      product: p.product,
      faceAmount: p.faceAmount,
      premium: p.premium,
      status: p.status,
      submittedDate: p.submittedDate
    }));
  }),
  getAnniversaries: protectedProcedure.input(z3.object({ daysAhead: z3.number().default(30) }).optional()).query(async ({ input }) => {
    logger.info("Fetching policy anniversaries", { daysAhead: input?.daysAhead });
    return getPolicyAnniversaries(input?.daysAhead || 30);
  }),
  getAnniversarySummary: protectedProcedure.query(async () => {
    logger.info("Fetching anniversary summary");
    return getAnniversarySummary();
  }),
  createPolicyReviewTask: protectedProcedure.input(z3.object({
    policyNumber: z3.string(),
    ownerName: z3.string(),
    anniversaryDate: z3.string(),
    policyAge: z3.number(),
    faceAmount: z3.number(),
    premium: z3.number(),
    productType: z3.string().optional()
  })).mutation(async ({ input, ctx }) => {
    logger.info("Creating policy review task", { policyNumber: input.policyNumber });
    const dueDate = new Date(input.anniversaryDate);
    dueDate.setDate(dueDate.getDate() - 7);
    const description = `Policy Review for ${input.ownerName}
Policy #: ${input.policyNumber}
Anniversary Date: ${input.anniversaryDate}
Policy Age: ${input.policyAge} year(s)
Face Amount: $${input.faceAmount.toLocaleString()}
Premium: $${input.premium.toLocaleString()}
Product Type: ${input.productType || "N/A"}

Review Topics:
- Coverage adequacy
- Beneficiary updates
- Premium payment status
- Additional coverage needs`;
    await createWorkflowTask({
      taskType: "POLICY_REVIEW",
      dueDate,
      priority: "MEDIUM",
      description,
      assignedToUserId: ctx.user.id
    });
    return { success: true };
  }),
  // Email tracking endpoints
  getEmailTrackingStats: protectedProcedure.input(z3.object({
    days: z3.number().optional().default(30)
  })).query(async ({ input }) => {
    logger.info("Fetching email tracking stats", { days: input.days });
    return getEmailTrackingStats(input.days);
  }),
  getRecentEmailTracking: protectedProcedure.input(z3.object({
    limit: z3.number().optional().default(50)
  })).query(async ({ input }) => {
    logger.info("Fetching recent email tracking", { limit: input.limit });
    return getRecentEmailTracking(input.limit);
  }),
  getAnniversaryEmailStats: protectedProcedure.query(async () => {
    logger.info("Fetching anniversary email stats");
    return getAnniversaryEmailStats();
  }),
  getEmailsEligibleForResend: protectedProcedure.input(z3.object({
    daysThreshold: z3.number().optional().default(3)
  })).query(async ({ input }) => {
    logger.info("Fetching emails eligible for resend", { daysThreshold: input.daysThreshold });
    return getEmailsEligibleForResend(input.daysThreshold);
  }),
  resendAnniversaryEmail: protectedProcedure.input(z3.object({
    trackingId: z3.string(),
    customContent: z3.object({
      greetingMessage: z3.string().optional(),
      personalNote: z3.string().optional(),
      closingMessage: z3.string().optional()
    }).optional()
  })).mutation(async ({ input }) => {
    logger.info("Resending anniversary email", { trackingId: input.trackingId });
    const { sendClientAnniversaryGreeting: sendClientAnniversaryGreeting2 } = await Promise.resolve().then(() => (init_email_alert(), email_alert_exports));
    const emailRecord = await getEmailByTrackingId(input.trackingId);
    if (!emailRecord) {
      throw new TRPCError3({ code: "NOT_FOUND", message: "Email record not found" });
    }
    if (emailRecord.emailType !== "ANNIVERSARY_GREETING") {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Only anniversary greeting emails can be resent" });
    }
    const metadata = emailRecord.metadata || {};
    const policyNumber = emailRecord.relatedEntityId || "";
    const clientName = emailRecord.recipientName || "Valued Client";
    const clientEmail = emailRecord.recipientEmail;
    const nameParts = clientName.split(" ");
    const firstName = nameParts[0] || "Valued";
    const lastName = nameParts.slice(1).join(" ") || "Client";
    const result = await sendClientAnniversaryGreeting2({
      email: clientEmail,
      firstName,
      lastName,
      policyNumber,
      faceAmount: metadata.faceAmount || "N/A",
      policyAge: metadata.policyAge || 1,
      productType: metadata.productType || "Life Insurance",
      agentName: metadata.agentName || "Your WFG Agent",
      agentPhone: metadata.agentPhone || "",
      agentEmail: metadata.agentEmail || ""
    }, {
      customContent: input.customContent
    });
    await markEmailResent(input.trackingId);
    return {
      success: result.success,
      message: result.success ? "Email resent successfully" : "Failed to resend email",
      newTrackingId: result.trackingId
    };
  }),
  scheduleEmail: protectedProcedure.input(z3.object({
    trackingId: z3.string(),
    scheduledFor: z3.number(),
    customContent: z3.object({
      greetingMessage: z3.string().optional(),
      personalNote: z3.string().optional(),
      closingMessage: z3.string().optional()
    }).optional()
  })).mutation(async ({ ctx, input }) => {
    logger.info("Scheduling email", { trackingId: input.trackingId, scheduledFor: input.scheduledFor });
    const emailRecord = await getEmailByTrackingId(input.trackingId);
    if (!emailRecord) {
      throw new TRPCError3({ code: "NOT_FOUND", message: "Email record not found" });
    }
    if (emailRecord.emailType !== "ANNIVERSARY_GREETING") {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Only anniversary greeting emails can be scheduled" });
    }
    const scheduled = await scheduleEmail({
      originalTrackingId: input.trackingId,
      emailType: emailRecord.emailType,
      recipientEmail: emailRecord.recipientEmail,
      recipientName: emailRecord.recipientName,
      relatedEntityType: emailRecord.relatedEntityType,
      relatedEntityId: emailRecord.relatedEntityId,
      scheduledFor: new Date(input.scheduledFor),
      customContent: input.customContent,
      metadata: emailRecord.metadata,
      createdBy: ctx.user.id
    });
    return {
      success: true,
      scheduledId: scheduled.id,
      scheduledFor: input.scheduledFor
    };
  }),
  getScheduledEmails: protectedProcedure.query(async () => {
    logger.info("Fetching scheduled emails");
    return getScheduledEmails();
  }),
  cancelScheduledEmail: protectedProcedure.input(z3.object({
    scheduledId: z3.number()
  })).mutation(async ({ input }) => {
    logger.info("Canceling scheduled email", { scheduledId: input.scheduledId });
    await cancelScheduledEmail(input.scheduledId);
    return { success: true };
  }),
  processScheduledEmails: protectedProcedure.mutation(async () => {
    logger.info("Processing scheduled emails");
    const result = await processScheduledEmails();
    return result;
  }),
  // Database query metrics endpoint
  getQueryMetrics: protectedProcedure.query(async () => {
    logger.info("Fetching database query metrics");
    const { getQueryMetrics: getQueryMetrics2 } = await Promise.resolve().then(() => (init_db_logger(), db_logger_exports));
    return getQueryMetrics2();
  }),
  // Query metrics history endpoints
  getMetricsHistory: protectedProcedure.input(z3.object({
    periodType: z3.enum(["HOURLY", "DAILY", "WEEKLY"]).optional(),
    startDate: z3.string().optional(),
    endDate: z3.string().optional(),
    limit: z3.number().optional()
  }).optional()).query(async ({ input }) => {
    logger.info("Fetching query metrics history");
    const { getMetricsHistory: getMetricsHistory2 } = await Promise.resolve().then(() => (init_queryMetrics(), queryMetrics_exports));
    return getMetricsHistory2({
      ...input,
      startDate: input?.startDate ? new Date(input.startDate) : void 0,
      endDate: input?.endDate ? new Date(input.endDate) : void 0
    });
  }),
  saveMetricsSnapshot: protectedProcedure.input(z3.object({
    periodType: z3.enum(["HOURLY", "DAILY", "WEEKLY"]).optional()
  }).optional()).mutation(async ({ input }) => {
    logger.info("Saving query metrics snapshot");
    const { saveMetricsSnapshot: saveMetricsSnapshot2 } = await Promise.resolve().then(() => (init_queryMetrics(), queryMetrics_exports));
    return saveMetricsSnapshot2(input?.periodType || "HOURLY");
  }),
  platformSyncStatus: protectedProcedure.query(async () => {
    logger.info("Fetching platform sync status");
    const { getRecentScheduledSyncLogs: getRecentScheduledSyncLogs2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const latestMywfg = await getLatestSyncLog();
    const recentScheduled = await getRecentScheduledSyncLogs2(50);
    const transamericaLogs = recentScheduled.filter(
      (l) => l.syncType?.startsWith("TRANSAMERICA")
    );
    const latestTransamerica = transamericaLogs[0] || null;
    const mywfgScheduledLogs = recentScheduled.filter(
      (l) => ["FULL_SYNC", "DOWNLINE_STATUS", "CONTACT_INFO", "CASH_FLOW", "PRODUCTION"].includes(l.syncType)
    );
    const latestMywfgScheduled = mywfgScheduledLogs[0] || null;
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMywfg = mywfgScheduledLogs.filter(
      (l) => l.createdAt && new Date(l.createdAt) >= sevenDaysAgo
    );
    const recentTA = transamericaLogs.filter(
      (l) => l.createdAt && new Date(l.createdAt) >= sevenDaysAgo
    );
    return {
      mywfg: {
        lastSyncDate: latestMywfg?.syncDate || latestMywfgScheduled?.startedAt || null,
        lastSyncStatus: latestMywfg?.status || latestMywfgScheduled?.status || null,
        lastSyncType: latestMywfg?.syncType || latestMywfgScheduled?.syncType || null,
        recordsProcessed: latestMywfg?.recordsProcessed || latestMywfgScheduled?.agentsProcessed || 0,
        summary: latestMywfg?.errorMessage || latestMywfgScheduled?.summary || null,
        recentSuccesses: recentMywfg.filter((l) => l.status === "SUCCESS").length,
        recentFailures: recentMywfg.filter((l) => l.status === "FAILED").length
      },
      transamerica: {
        lastSyncDate: latestTransamerica?.startedAt || latestTransamerica?.completedAt || null,
        lastSyncStatus: latestTransamerica?.status || null,
        lastSyncType: latestTransamerica?.syncType || null,
        recordsProcessed: latestTransamerica?.agentsProcessed || 0,
        summary: latestTransamerica?.summary || null,
        recentSuccesses: recentTA.filter((l) => l.status === "SUCCESS").length,
        recentFailures: recentTA.filter((l) => l.status === "FAILED").length
      }
    };
  }),
  getAggregatedMetrics: protectedProcedure.input(z3.object({
    startDate: z3.string(),
    endDate: z3.string()
  })).query(async ({ input }) => {
    logger.info("Fetching aggregated query metrics");
    const { getAggregatedMetrics: getAggregatedMetrics2 } = await Promise.resolve().then(() => (init_queryMetrics(), queryMetrics_exports));
    return getAggregatedMetrics2(
      new Date(input.startDate),
      new Date(input.endDate)
    );
  })
});

// server/routers/agents.ts
import { z as z4 } from "zod";
init_logger();
init_db();
var AgentSchema = z4.object({
  agentCode: z4.string().optional(),
  firstName: z4.string().min(1),
  lastName: z4.string().min(1),
  email: z4.string().email().optional(),
  phone: z4.string().optional(),
  currentStage: z4.enum(["RECRUITMENT", "EXAM_PREP", "LICENSED", "PRODUCT_TRAINING", "BUSINESS_LAUNCH", "NET_LICENSED", "CLIENT_TRACKING", "CHARGEBACK_PROOF"]).optional(),
  examDate: z4.date().optional(),
  licenseNumber: z4.string().optional(),
  notes: z4.string().optional()
});
var agentsRouter = router({
  list: protectedProcedure.input(z4.object({ stage: z4.string().optional(), isActive: z4.boolean().optional() }).optional()).query(async ({ input }) => {
    logger.info("Fetching agents", { filters: input });
    return getAgents(input);
  }),
  getById: protectedProcedure.input(z4.number()).query(async ({ input }) => {
    logger.info("Fetching agent by ID", { agentId: input });
    return getAgentById(input);
  }),
  create: protectedProcedure.input(AgentSchema).mutation(async ({ input, ctx }) => {
    logger.info("Creating new agent", { firstName: input.firstName, lastName: input.lastName });
    return createAgent({
      ...input,
      recruiterUserId: ctx.user.id,
      currentStage: input.currentStage || "RECRUITMENT",
      stageEnteredAt: /* @__PURE__ */ new Date()
    });
  }),
  update: protectedProcedure.input(z4.object({ id: z4.number(), data: AgentSchema.partial() })).mutation(async ({ input }) => {
    logger.info("Updating agent", { agentId: input.id });
    const updateData = { ...input.data };
    if (input.data.currentStage) {
      updateData.stageEnteredAt = /* @__PURE__ */ new Date();
    }
    return updateAgent(input.id, updateData);
  }),
  updateStage: protectedProcedure.input(z4.object({ id: z4.number(), stage: z4.string() })).mutation(async ({ input }) => {
    logger.info("Updating agent stage", { agentId: input.id, stage: input.stage });
    return updateAgent(input.id, {
      currentStage: input.stage,
      stageEnteredAt: /* @__PURE__ */ new Date()
    });
  })
});

// server/routers/clients.ts
import { z as z5 } from "zod";
init_logger();
init_db();
var ClientSchema = z5.object({
  agentId: z5.number(),
  firstName: z5.string().min(1),
  lastName: z5.string().min(1),
  email: z5.string().email().optional().nullable(),
  phone: z5.string().optional().nullable(),
  address: z5.string().optional(),
  renewalDate: z5.date().optional(),
  notes: z5.string().optional().nullable()
});
var ClientUpdateSchema = z5.object({
  firstName: z5.string().min(1).optional(),
  lastName: z5.string().min(1).optional(),
  email: z5.string().email().optional().nullable(),
  phone: z5.string().optional().nullable(),
  notes: z5.string().optional().nullable()
});
var clientsRouter = router({
  list: protectedProcedure.query(async () => {
    logger.info("Fetching all clients");
    return getClients();
  }),
  getById: protectedProcedure.input(z5.number()).query(async ({ input }) => {
    logger.info("Fetching client by ID", { clientId: input });
    return getClientById(input);
  }),
  create: protectedProcedure.input(ClientSchema).mutation(async ({ input }) => {
    logger.info("Creating new client", { firstName: input.firstName, lastName: input.lastName });
    return createClient(input);
  }),
  update: protectedProcedure.input(
    z5.object({
      id: z5.number(),
      data: ClientUpdateSchema
    })
  ).mutation(async ({ input }) => {
    logger.info("Updating client", { clientId: input.id });
    return updateClient(input.id, input.data);
  })
});

// server/routers/tasks.ts
import { z as z6 } from "zod";
init_logger();
init_db();
var TaskSchema = z6.object({
  agentId: z6.number().optional(),
  clientId: z6.number().optional(),
  taskType: z6.enum(["POLICY_REVIEW", "PRODUCT_TRAINING", "EXAM_PREP_FOLLOW_UP", "LICENSE_VERIFICATION", "BUSINESS_LAUNCH_PREP", "RENEWAL_REMINDER", "CHARGEBACK_MONITORING", "GENERAL_FOLLOW_UP", "ADVANCEMENT_TRACKING"]),
  dueDate: z6.date(),
  priority: z6.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  description: z6.string().optional()
});
var tasksRouter = router({
  list: protectedProcedure.input(z6.object({
    agentId: z6.number().optional(),
    clientId: z6.number().optional(),
    completed: z6.boolean().optional()
  }).optional()).query(async ({ input }) => {
    logger.info("Fetching workflow tasks", { filters: input });
    return getWorkflowTasks(input);
  }),
  create: protectedProcedure.input(TaskSchema).mutation(async ({ input, ctx }) => {
    logger.info("Creating new task", { taskType: input.taskType });
    return createWorkflowTask({
      ...input,
      assignedToUserId: ctx.user.id
    });
  }),
  complete: protectedProcedure.input(z6.number()).mutation(async ({ input }) => {
    logger.info("Completing task", { taskId: input });
    return updateWorkflowTask(input, {
      completedAt: /* @__PURE__ */ new Date()
    });
  }),
  update: protectedProcedure.input(z6.object({ id: z6.number(), data: TaskSchema.partial() })).mutation(async ({ input }) => {
    logger.info("Updating task", { taskId: input.id });
    return updateWorkflowTask(input.id, input.data);
  })
});

// server/routers/mywfg.ts
import { z as z7 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";
init_db();
init_xcel_exam_scraper();
var mywfgRouter = router({
  getLatestSync: protectedProcedure.query(async () => {
    return getLatestSyncLog();
  }),
  testSync: protectedProcedure.input(
    z7.object({
      validationCode: z7.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const { myWFGServiceV3: myWFGServiceV32 } = await Promise.resolve().then(() => (init_mywfg_service_v3(), mywfg_service_v3_exports));
    const creds = await getCredentialsByUserId(ctx.user.id);
    if (!creds) {
      throw new TRPCError4({ code: "BAD_REQUEST", message: "No credentials configured" });
    }
    try {
      const result = await myWFGServiceV32.extractData(
        creds.encryptedUsername,
        creds.encryptedPassword,
        input.validationCode
      );
      return {
        success: result.success,
        agentsExtracted: result.agentsExtracted,
        productionRecordsExtracted: result.productionRecordsExtracted,
        error: result.error,
        requiresValidation: result.requiresValidation
      };
    } catch (error) {
      throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Test sync failed" });
    }
  }),
  manualSync: protectedProcedure.input(
    z7.object({
      validationCode: z7.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const { runMyWFGSync: runMyWFGSync2 } = await Promise.resolve().then(() => (init_mywfg_sync_job(), mywfg_sync_job_exports));
    return runMyWFGSync2(ctx.user.id, input.validationCode);
  }),
  // Self-deploy: git pull + pnpm install + pnpm build + pm2 restart
  // Allows updating the production server to the latest code without SSH access
  selfDeploy: protectedProcedure.mutation(async () => {
    const { execSync } = await import("child_process");
    const appDir = process.cwd();
    console.log("[SelfDeploy] Starting self-deploy from", appDir);
    try {
      const pull = execSync("git pull origin main 2>&1", { cwd: appDir, timeout: 6e4 }).toString();
      console.log("[SelfDeploy] git pull:", pull.trim());
      execSync("pnpm install --frozen-lockfile 2>&1", { cwd: appDir, timeout: 3e5 });
      console.log("[SelfDeploy] pnpm install done");
      execSync("pnpm build 2>&1", { cwd: appDir, timeout: 3e5 });
      console.log("[SelfDeploy] pnpm build done");
      setImmediate(() => {
        try {
          execSync("pm2 restart wfgcrm 2>&1 || pm2 restart all 2>&1", { timeout: 3e4 });
        } catch {
        }
      });
      return { success: true, message: "Self-deploy complete, restarting...", pull: pull.trim() };
    } catch (err) {
      return { success: false, message: err.message || "Self-deploy failed" };
    }
  }),
  // Sync agents from MyWFG Downline Status report
  syncDownlineStatus: protectedProcedure.mutation(async () => {
    const { fetchDownlineStatus: fetchDownlineStatus3, syncAgentsFromDownlineStatus: syncAgentsFromDownlineStatus3 } = await Promise.resolve().then(() => (init_mywfg_downline_scraper(), mywfg_downline_scraper_exports));
    const { getDb: getDb3 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const schema = await Promise.resolve().then(() => (init_schema(), schema_exports));
    try {
      const { execSync } = await import("child_process");
      const { existsSync: existsSync2, readdirSync: readdirSync2 } = await import("fs");
      const { resolve: resolve2 } = await import("path");
      const { homedir: homedir2 } = await import("os");
      const { fileURLToPath } = await import("url");
      const PROJECT_ROOT_DIR = (() => {
        const oneUp = resolve2(import.meta.dirname, "..");
        const twoUp = resolve2(import.meta.dirname, "../..");
        if (existsSync2(resolve2(oneUp, "package.json"))) return oneUp;
        if (existsSync2(resolve2(twoUp, "package.json"))) return twoUp;
        return process.cwd();
      })();
      const findChrome = () => {
        const projectCacheDir = resolve2(PROJECT_ROOT_DIR, ".chrome-cache", "chrome");
        if (existsSync2(projectCacheDir)) {
          try {
            const vers = readdirSync2(projectCacheDir).sort().reverse();
            for (const v of vers) {
              const bin = resolve2(projectCacheDir, v, "chrome-linux64", "chrome");
              if (existsSync2(bin)) return bin;
            }
          } catch {
          }
        }
        for (const base of [resolve2(homedir2(), ".cache/puppeteer/chrome"), "/root/.cache/puppeteer/chrome"]) {
          if (existsSync2(base)) {
            try {
              const vers = readdirSync2(base).sort().reverse();
              for (const v of vers) {
                const bin = resolve2(base, v, "chrome-linux64", "chrome");
                if (existsSync2(bin)) return bin;
              }
            } catch {
            }
          }
        }
        for (const p of ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome-stable"]) {
          if (existsSync2(p)) return p;
        }
        return null;
      };
      const foundChrome = findChrome();
      if (!foundChrome) {
        console.log("[Manual Sync] Chrome not found, installing...");
        const isRoot = process.getuid && process.getuid() === 0;
        const cacheDir = isRoot ? "/root/.cache/puppeteer" : resolve2(homedir2(), ".cache/puppeteer");
        const puppeteerBin = resolve2(PROJECT_ROOT_DIR, "node_modules/.bin/puppeteer");
        if (existsSync2(puppeteerBin)) {
          execSync(`PUPPETEER_CACHE_DIR=${cacheDir} "${puppeteerBin}" browsers install chrome`, {
            stdio: "pipe",
            timeout: 3e5,
            env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir }
          });
        } else {
          execSync(`PUPPETEER_CACHE_DIR=${cacheDir} npx puppeteer browsers install chrome`, {
            stdio: "pipe",
            timeout: 3e5,
            env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir }
          });
        }
        console.log("[Manual Sync] Chrome installed to", cacheDir);
      } else {
        console.log("[Manual Sync] Chrome found at:", foundChrome);
      }
    } catch (chromeErr) {
      console.warn("[Manual Sync] Chrome pre-install failed (will try anyway):", chromeErr?.message);
    }
    console.log("[Manual Sync] Starting Downline Status sync...");
    const fetchResult = await fetchDownlineStatus3();
    if (!fetchResult.success) {
      return {
        success: false,
        error: fetchResult.error || "Failed to fetch downline status",
        agentsFetched: 0,
        agentsAdded: 0,
        agentsUpdated: 0,
        agentsDeactivated: 0,
        agentsReactivated: 0
      };
    }
    console.log(`[Manual Sync] Fetched ${fetchResult.agents.length} agents from MyWFG`);
    const db = await getDb3();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
        agentsFetched: fetchResult.agents.length,
        agentsAdded: 0,
        agentsUpdated: 0,
        agentsDeactivated: 0,
        agentsReactivated: 0
      };
    }
    const syncResult = await syncAgentsFromDownlineStatus3(db, schema);
    console.log(`[Manual Sync] Sync completed - Added: ${syncResult.added}, Updated: ${syncResult.updated}, Deactivated: ${syncResult.deactivated}, Reactivated: ${syncResult.reactivated}`);
    return {
      success: syncResult.success,
      error: syncResult.error,
      agentsFetched: fetchResult.agents.length,
      agentsAdded: syncResult.added,
      agentsUpdated: syncResult.updated,
      agentsDeactivated: syncResult.deactivated,
      agentsReactivated: syncResult.reactivated
    };
  }),
  // Sync exam prep status from XCEL Solutions emails
  syncExamPrep: protectedProcedure.mutation(async () => {
    console.log("[Manual Sync] Starting Exam Prep sync from XCEL emails...");
    const result = await syncExamPrepFromEmail();
    console.log(`[Manual Sync] Exam Prep sync completed - Found: ${result.recordsFound}, Matched: ${result.recordsMatched}, Created: ${result.recordsCreated}, Updated: ${result.recordsUpdated}`);
    return result;
  }),
  // Get all exam prep records
  getExamPrepRecords: protectedProcedure.query(async () => {
    return getExamPrepRecords();
  }),
  // Trigger git pull + rebuild + restart for production deployments
  triggerDeploy: protectedProcedure.mutation(async () => {
    const { execSync } = await import("child_process");
    const appDir = process.cwd();
    try {
      execSync("git pull origin main", { cwd: appDir, stdio: "pipe", timeout: 6e4 });
      execSync("pnpm install --frozen-lockfile", { cwd: appDir, stdio: "pipe", timeout: 3e5 });
      execSync("pnpm build", { cwd: appDir, stdio: "pipe", timeout: 3e5 });
      setImmediate(() => {
        try {
          execSync("pm2 restart wfgcrm || pm2 restart all", { stdio: "pipe", timeout: 3e4 });
        } catch {
        }
      });
      return { success: true, message: "Deploy triggered successfully" };
    } catch (err) {
      return { success: false, message: err.message || "Deploy failed" };
    }
  }),
  // Install Chrome for Puppeteer (fixes 'Could not find Chrome' error on production)
  installChrome: protectedProcedure.mutation(async () => {
    const { execSync } = await import("child_process");
    const { existsSync: existsSync2, readdirSync: readdirSync2 } = await import("fs");
    const { resolve: resolve2 } = await import("path");
    const { homedir: homedir2 } = await import("os");
    const PROJECT_ROOT_IC = (() => {
      const oneUp = resolve2(import.meta.dirname, "..");
      const twoUp = resolve2(import.meta.dirname, "../..");
      if (existsSync2(resolve2(oneUp, "package.json"))) return oneUp;
      if (existsSync2(resolve2(twoUp, "package.json"))) return twoUp;
      return process.cwd();
    })();
    const findChrome = () => {
      const projectCacheDir = resolve2(PROJECT_ROOT_IC, ".chrome-cache", "chrome");
      if (existsSync2(projectCacheDir)) {
        try {
          const vers = readdirSync2(projectCacheDir).sort().reverse();
          for (const v of vers) {
            const bin = resolve2(projectCacheDir, v, "chrome-linux64", "chrome");
            if (existsSync2(bin)) return bin;
          }
        } catch {
        }
      }
      for (const base of [resolve2(homedir2(), ".cache/puppeteer/chrome"), "/root/.cache/puppeteer/chrome"]) {
        if (existsSync2(base)) {
          try {
            const vers = readdirSync2(base).sort().reverse();
            for (const v of vers) {
              const bin = resolve2(base, v, "chrome-linux64", "chrome");
              if (existsSync2(bin)) return bin;
            }
          } catch {
          }
        }
      }
      for (const p of ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome-stable"]) {
        if (existsSync2(p)) return p;
      }
      return null;
    };
    const existing = findChrome();
    if (existing) {
      return { success: true, message: "Chrome already installed", chromePath: existing };
    }
    try {
      const isRoot = process.getuid && process.getuid() === 0;
      const cacheDir = isRoot ? "/root/.cache/puppeteer" : resolve2(homedir2(), ".cache/puppeteer");
      const puppeteerBin = resolve2(PROJECT_ROOT_IC, "node_modules/.bin/puppeteer");
      if (existsSync2(puppeteerBin)) {
        execSync(
          `PUPPETEER_CACHE_DIR=${cacheDir} "${puppeteerBin}" browsers install chrome`,
          { stdio: "pipe", timeout: 3e5, env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir } }
        );
      } else {
        execSync(
          `PUPPETEER_CACHE_DIR=${cacheDir} npx puppeteer browsers install chrome`,
          { stdio: "pipe", timeout: 3e5, env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir } }
        );
      }
      const newPath = findChrome();
      return { success: true, message: "Chrome installed successfully", chromePath: newPath };
    } catch (err) {
      return { success: false, message: err.message || "Failed to install Chrome", chromePath: null };
    }
  }),
  // Sync contact info for agents with missing data
  syncContactInfo: protectedProcedure.mutation(async () => {
    const { syncContactInfoFromMyWFG: syncContactInfoFromMyWFG2 } = await Promise.resolve().then(() => (init_mywfg_downline_scraper(), mywfg_downline_scraper_exports));
    const { getDb: getDb3 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const schema = await Promise.resolve().then(() => (init_schema(), schema_exports));
    console.log("[Manual Sync] Starting Contact Info sync...");
    const db = await getDb3();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
        agentsUpdated: 0
      };
    }
    const syncResult = await syncContactInfoFromMyWFG2(db, schema, 15);
    console.log(`[Manual Sync] Contact sync completed - Updated: ${syncResult.updated}`);
    return {
      success: syncResult.success,
      error: syncResult.error,
      agentsUpdated: syncResult.updated
    };
  }),
  // Test procedure to check if server is running in tsx mode
  testMode: protectedProcedure.query(async () => {
    return { mode: "tsx-live-v1", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  })
});

// server/routers/cashFlow.ts
import { z as z8 } from "zod";
import { TRPCError as TRPCError5 } from "@trpc/server";
init_db();
var cashFlowRouter = router({
  // Get all cash flow records
  getAll: protectedProcedure.query(async () => {
    return getAllCashFlowRecords();
  }),
  // Get Net Licensed agents (calculated from database)
  getNetLicensed: protectedProcedure.query(async () => {
    return getNetLicensedAgents();
  }),
  // Upsert a single cash flow record
  upsert: protectedProcedure.input(
    z8.object({
      agentCode: z8.string(),
      agentName: z8.string(),
      titleLevel: z8.string().optional(),
      uplineSMD: z8.string().optional(),
      cashFlowAmount: z8.string(),
      cumulativeCashFlow: z8.string(),
      paymentDate: z8.string().optional(),
      paymentCycle: z8.string().optional(),
      reportPeriod: z8.string().optional()
    })
  ).mutation(async ({ input }) => {
    return upsertCashFlowRecord({
      agentCode: input.agentCode,
      agentName: input.agentName,
      titleLevel: input.titleLevel,
      uplineSMD: input.uplineSMD,
      cashFlowAmount: input.cashFlowAmount,
      cumulativeCashFlow: input.cumulativeCashFlow,
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : void 0,
      paymentCycle: input.paymentCycle,
      reportPeriod: input.reportPeriod
    });
  }),
  // Bulk upsert cash flow records (from MyWFG sync)
  bulkUpsert: protectedProcedure.input(
    z8.object({
      records: z8.array(z8.object({
        agentCode: z8.string(),
        agentName: z8.string(),
        titleLevel: z8.string().optional(),
        uplineSMD: z8.string().optional(),
        cashFlowAmount: z8.string(),
        cumulativeCashFlow: z8.string(),
        paymentDate: z8.string().optional(),
        paymentCycle: z8.string().optional(),
        reportPeriod: z8.string().optional()
      }))
    })
  ).mutation(async ({ input }) => {
    return bulkUpsertCashFlowRecords(input.records.map((r) => ({
      agentCode: r.agentCode,
      agentName: r.agentName,
      titleLevel: r.titleLevel,
      uplineSMD: r.uplineSMD,
      cashFlowAmount: r.cashFlowAmount,
      cumulativeCashFlow: r.cumulativeCashFlow,
      paymentDate: r.paymentDate,
      paymentCycle: r.paymentCycle,
      reportPeriod: r.reportPeriod
    })));
  }),
  // Clear all cash flow records (for full resync)
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError5({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return clearAllCashFlowRecords();
  })
});

// server/routers/syncLogs.ts
import { z as z9 } from "zod";
init_db();
var syncLogsRouter = router({
  // Get recent sync logs
  getRecent: protectedProcedure.input(
    z9.object({
      limit: z9.number().min(1).max(100).default(20)
    }).optional()
  ).query(async ({ input }) => {
    return getRecentScheduledSyncLogs(input?.limit || 20);
  }),
  // Get paginated sync logs with filtering
  getPaginated: protectedProcedure.input(
    z9.object({
      page: z9.number().min(1).default(1),
      pageSize: z9.number().min(1).max(100).default(20),
      status: z9.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED", "PARTIAL"]).optional(),
      syncType: z9.enum(["FULL_SYNC", "DOWNLINE_STATUS", "CONTACT_INFO", "CASH_FLOW", "PRODUCTION"]).optional(),
      scheduledTime: z9.string().optional()
    })
  ).query(async ({ input }) => {
    return getScheduledSyncLogs(input);
  }),
  // Get the latest sync log
  getLatest: protectedProcedure.query(async () => {
    return getLatestScheduledSyncLog();
  }),
  // Get today's sync logs
  getToday: protectedProcedure.query(async () => {
    return getTodaySyncLogs();
  }),
  // Get weekly sync summary for dashboard
  getWeeklySummary: protectedProcedure.query(async () => {
    return getWeeklySyncSummary();
  })
});

// server/routers/pendingPolicies.ts
import { z as z10 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";
init_db();
var RequirementSchema = z10.object({
  dateRequested: z10.string().optional(),
  requirementOn: z10.string().optional(),
  status: z10.string().optional(),
  requirement: z10.string().optional(),
  instruction: z10.string().optional(),
  comments: z10.string().optional()
});
var pendingPoliciesRouter = router({
  // Get all pending policies with requirements
  list: protectedProcedure.query(async () => {
    return getPendingPoliciesWithRequirements();
  }),
  // Get summary stats for dashboard
  summary: protectedProcedure.query(async () => {
    return getPendingPolicySummary();
  }),
  // Get single policy by policy number
  getByNumber: protectedProcedure.input(z10.string()).query(async ({ input }) => {
    const policy = await getPendingPolicyByNumber(input);
    if (!policy) return null;
    const requirements = await getPendingRequirementsByPolicyId(policy.id);
    return {
      ...policy,
      requirements: {
        pendingWithProducer: requirements.filter((r) => r.category === "Pending with Producer"),
        pendingWithTransamerica: requirements.filter((r) => r.category === "Pending with Transamerica"),
        completed: requirements.filter((r) => r.category === "Completed")
      }
    };
  }),
  // Upsert a pending policy with requirements
  upsert: protectedProcedure.input(z10.object({
    policyNumber: z10.string(),
    ownerName: z10.string(),
    productType: z10.string().optional(),
    faceAmount: z10.string().optional(),
    deathBenefitOption: z10.string().optional(),
    moneyReceived: z10.string().optional(),
    premium: z10.string().optional(),
    premiumFrequency: z10.string().optional(),
    issueDate: z10.string().optional(),
    submittedDate: z10.string().optional(),
    policyClosureDate: z10.string().optional(),
    policyDeliveryTrackingNumber: z10.string().optional(),
    status: z10.enum(["Pending", "Issued", "Incomplete", "Post Approval Processing", "Declined", "Withdrawn"]),
    statusAsOf: z10.string().optional(),
    underwritingDecision: z10.string().optional(),
    underwriter: z10.string().optional(),
    riskClass: z10.string().optional(),
    agentCode: z10.string().optional(),
    agentName: z10.string().optional(),
    requirements: z10.object({
      pendingWithProducer: z10.array(RequirementSchema),
      pendingWithTransamerica: z10.array(RequirementSchema),
      completed: z10.array(RequirementSchema)
    })
  })).mutation(async ({ input }) => {
    const { requirements, ...policyData } = input;
    const policy = await upsertPendingPolicy(policyData);
    if (!policy) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upsert policy" });
    await clearPendingRequirements(policy.id);
    const allRequirements = [
      ...requirements.pendingWithProducer.map((r) => ({ ...r, policyId: policy.id, category: "Pending with Producer" })),
      ...requirements.pendingWithTransamerica.map((r) => ({ ...r, policyId: policy.id, category: "Pending with Transamerica" })),
      ...requirements.completed.map((r) => ({ ...r, policyId: policy.id, category: "Completed" }))
    ];
    if (allRequirements.length > 0) {
      await bulkInsertPendingRequirements(allRequirements);
    }
    return policy;
  })
});

// server/routers/inforcePolicies.ts
import { z as z11 } from "zod";
import { TRPCError as TRPCError7 } from "@trpc/server";
import { eq as eq16 } from "drizzle-orm";
init_schema();
init_db();
var inforcePoliciesRouter = router({
  // Get all inforce policies
  list: protectedProcedure.input(z11.object({
    status: z11.string().optional(),
    agentId: z11.number().optional()
  }).optional()).query(async ({ input }) => {
    return getInforcePolicies(input);
  }),
  // Get inforce policy by policy number
  getByPolicyNumber: protectedProcedure.input(z11.string()).query(async ({ input }) => {
    return getInforcePolicyByNumber(input);
  }),
  // Get production summary for dashboard
  getSummary: protectedProcedure.query(async () => {
    return getProductionSummary();
  }),
  // Get top producers by premium
  getTopProducers: protectedProcedure.input(z11.number().optional()).query(async ({ input }) => {
    return getTopProducersByPremium(input || 10);
  }),
  // Get production by writing agent
  getByWritingAgent: protectedProcedure.query(async () => {
    return getProductionByWritingAgent();
  }),
  // Get top agents by commission
  getTopAgentsByCommission: protectedProcedure.input(z11.number().optional()).query(async ({ input }) => {
    return getTopAgentsByCommission(input || 10);
  }),
  // Update policy with Target Premium and Split Agent data
  updatePolicy: protectedProcedure.input(z11.object({
    policyNumber: z11.string(),
    targetPremium: z11.number().optional(),
    writingAgentName: z11.string().optional(),
    writingAgentCode: z11.string().optional(),
    writingAgentSplit: z11.number().min(0).max(100).optional(),
    writingAgentLevel: z11.number().min(0).max(1).optional(),
    secondAgentName: z11.string().optional().nullable(),
    secondAgentCode: z11.string().optional().nullable(),
    secondAgentSplit: z11.number().min(0).max(100).optional().nullable(),
    secondAgentLevel: z11.number().min(0).max(1).optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb2();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const existing = await getInforcePolicyByNumber(input.policyNumber);
    if (!existing) {
      throw new TRPCError7({ code: "NOT_FOUND", message: "Policy not found" });
    }
    const targetPremium = input.targetPremium || parseFloat(existing.targetPremium?.toString() || existing.premium?.toString() || "0");
    const multiplier = 1.25;
    const writingAgentSplit = input.writingAgentSplit ?? existing.writingAgentSplit ?? 100;
    const writingAgentLevel = input.writingAgentLevel ?? parseFloat(existing.writingAgentLevel?.toString() || "0.65");
    const writingAgentCommission = targetPremium * multiplier * writingAgentLevel * (writingAgentSplit / 100);
    let secondAgentCommission = null;
    const secondAgentSplit = input.secondAgentSplit ?? existing.secondAgentSplit ?? 0;
    const secondAgentLevel = input.secondAgentLevel ?? parseFloat(existing.secondAgentLevel?.toString() || "0.25");
    if (secondAgentSplit > 0) {
      secondAgentCommission = targetPremium * multiplier * secondAgentLevel * (secondAgentSplit / 100);
    }
    const totalCommission = writingAgentCommission + (secondAgentCommission || 0);
    await db.update(inforcePolicies).set({
      targetPremium: targetPremium.toString(),
      writingAgentName: input.writingAgentName ?? existing.writingAgentName,
      writingAgentCode: input.writingAgentCode ?? existing.writingAgentCode,
      writingAgentSplit,
      writingAgentLevel: writingAgentLevel.toString(),
      writingAgentCommission: writingAgentCommission.toString(),
      secondAgentName: input.secondAgentName ?? existing.secondAgentName,
      secondAgentCode: input.secondAgentCode ?? existing.secondAgentCode,
      secondAgentSplit,
      secondAgentLevel: secondAgentLevel.toString(),
      secondAgentCommission: secondAgentCommission?.toString() || null,
      calculatedCommission: totalCommission.toString(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq16(inforcePolicies.policyNumber, input.policyNumber));
    return getInforcePolicyByNumber(input.policyNumber);
  }),
  // Bulk update policies with Target Premium data
  bulkUpdateTargetPremium: protectedProcedure.input(z11.array(z11.object({
    policyNumber: z11.string(),
    targetPremium: z11.number()
  }))).mutation(async ({ input }) => {
    const db = await getDb2();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    let updated = 0;
    for (const policy of input) {
      const existing = await getInforcePolicyByNumber(policy.policyNumber);
      if (existing) {
        const multiplier = 1.25;
        const writingAgentLevel = parseFloat(existing.writingAgentLevel?.toString() || "0.65");
        const writingAgentSplit = existing.writingAgentSplit ?? 100;
        const writingAgentCommission = policy.targetPremium * multiplier * writingAgentLevel * (writingAgentSplit / 100);
        let secondAgentCommission = null;
        const secondAgentSplit = existing.secondAgentSplit ?? 0;
        const secondAgentLevel = parseFloat(existing.secondAgentLevel?.toString() || "0.25");
        if (secondAgentSplit > 0) {
          secondAgentCommission = policy.targetPremium * multiplier * secondAgentLevel * (secondAgentSplit / 100);
        }
        const totalCommission = writingAgentCommission + (secondAgentCommission || 0);
        await db.update(inforcePolicies).set({
          targetPremium: policy.targetPremium.toString(),
          writingAgentCommission: writingAgentCommission.toString(),
          secondAgentCommission: secondAgentCommission?.toString() || null,
          calculatedCommission: totalCommission.toString(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq16(inforcePolicies.policyNumber, policy.policyNumber));
        updated++;
      }
    }
    return { updated };
  })
});

// server/routers/credentials.ts
import { z as z12 } from "zod";
import { TRPCError as TRPCError8 } from "@trpc/server";
init_db();
init_encryption();
var CredentialSchema = z12.object({
  username: z12.string().min(1),
  password: z12.string().min(1),
  apiKey: z12.string().optional()
});
var credentialsRouter = router({
  // Get credentials for current user
  get: protectedProcedure.query(async ({ ctx }) => {
    const cred = await getCredentialsByUserId(ctx.user.id);
    if (!cred) return null;
    return {
      id: cred.id,
      isActive: cred.isActive,
      lastUsedAt: cred.lastUsedAt
    };
  }),
  // Save credentials
  save: protectedProcedure.input(CredentialSchema).mutation(async ({ input, ctx }) => {
    try {
      const encryptedUsername = encryptCredential(input.username);
      const encryptedPassword = encryptCredential(input.password);
      const encryptedApiKey = input.apiKey ? encryptCredential(input.apiKey) : void 0;
      await createOrUpdateCredential({
        userId: ctx.user.id,
        encryptedUsername,
        encryptedPassword,
        encryptedApiKey,
        isActive: true
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to save credentials:", error);
      throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save credentials" });
    }
  })
});

// server/routers/production.ts
import { z as z13 } from "zod";
init_db();
init_schema();
var ProductionRecordSchema = z13.object({
  agentId: z13.number(),
  policyNumber: z13.string(),
  policyType: z13.string(),
  commissionAmount: z13.string().optional(),
  premiumAmount: z13.string().optional(),
  issueDate: z13.date()
});
var productionRouter = router({
  // List all production records
  list: protectedProcedure.query(async () => {
    const db = await getDb2();
    if (!db) return [];
    return db.select().from(productionRecords);
  }),
  // Get production records by agent
  getByAgent: protectedProcedure.input(z13.number()).query(async ({ input }) => {
    return getProductionRecords(input);
  }),
  // Create a production record
  create: protectedProcedure.input(ProductionRecordSchema).mutation(async ({ input }) => {
    return createProductionRecord({
      ...input
    });
  })
});

// server/routers/team.ts
import { TRPCError as TRPCError9 } from "@trpc/server";
init_db();
var teamRouter = router({
  // List all users (admin only)
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError9({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return getAllUsers();
  })
});

// server/routers/alerts.ts
import { z as z14 } from "zod";

// server/repositories/alerts.ts
init_db();
init_schema();
import { eq as eq17, and as and12, desc as desc11 } from "drizzle-orm";
async function isAlertDismissed(policyNumber, alertType, alertDate) {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  const result = await db.select({ id: dismissedAlerts.id }).from(dismissedAlerts).where(
    and12(
      eq17(dismissedAlerts.policyNumber, policyNumber),
      eq17(dismissedAlerts.alertType, alertType),
      eq17(dismissedAlerts.alertDate, alertDate)
    )
  ).limit(1);
  return result.length > 0;
}
async function dismissAlert(data) {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  const insertData = {
    alertType: data.alertType,
    policyNumber: data.policyNumber,
    ownerName: data.ownerName,
    alertDate: data.alertDate,
    dismissedBy: data.dismissedBy,
    dismissReason: data.dismissReason,
    originalAlertData: data.originalAlertData
  };
  await db.insert(dismissedAlerts).values(insertData);
  const [result] = await db.select().from(dismissedAlerts).where(eq17(dismissedAlerts.policyNumber, data.policyNumber)).orderBy(desc11(dismissedAlerts.id)).limit(1);
  return result;
}
async function restoreAlert(id) {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  await db.delete(dismissedAlerts).where(eq17(dismissedAlerts.id, id));
}
async function getDismissedAlerts(options) {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  let query = db.select().from(dismissedAlerts);
  if (options?.alertType) {
    query = query.where(eq17(dismissedAlerts.alertType, options.alertType));
  }
  query = query.orderBy(desc11(dismissedAlerts.dismissedAt));
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.offset(options.offset);
  }
  return query;
}
async function getDismissedAlertById(id) {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.select().from(dismissedAlerts).where(eq17(dismissedAlerts.id, id)).limit(1);
  return result || null;
}
async function getDismissedAlertCounts() {
  const db = await getDb2();
  if (!db) throw new Error("Database not initialized");
  const results = await db.select({
    alertType: dismissedAlerts.alertType
  }).from(dismissedAlerts);
  const counts = {
    REVERSED_PREMIUM_PAYMENT: 0,
    EFT_REMOVAL: 0,
    CHARGEBACK: 0,
    OTHER: 0
  };
  results.forEach((r) => {
    counts[r.alertType] = (counts[r.alertType] || 0) + 1;
  });
  return counts;
}

// server/routers/alerts.ts
var alertsRouter = router({
  /**
   * Check if a specific alert has been dismissed
   */
  isAlertDismissed: publicProcedure.input(z14.object({
    policyNumber: z14.string(),
    alertType: z14.string(),
    alertDate: z14.string()
  })).query(async ({ input }) => {
    return isAlertDismissed(input.policyNumber, input.alertType, input.alertDate);
  }),
  /**
   * Dismiss an alert
   */
  dismissAlert: protectedProcedure.input(z14.object({
    alertType: z14.enum(["REVERSED_PREMIUM_PAYMENT", "EFT_REMOVAL", "CHARGEBACK", "OTHER"]),
    policyNumber: z14.string(),
    ownerName: z14.string().optional(),
    alertDate: z14.string().optional(),
    dismissReason: z14.string().optional(),
    originalAlertData: z14.any().optional()
  })).mutation(async ({ input, ctx }) => {
    return dismissAlert({
      ...input,
      dismissedBy: ctx.user.id
    });
  }),
  /**
   * Restore (un-dismiss) an alert
   */
  restoreAlert: protectedProcedure.input(z14.object({
    id: z14.number()
  })).mutation(async ({ input }) => {
    await restoreAlert(input.id);
    return { success: true };
  }),
  /**
   * Get all dismissed alerts
   */
  getDismissedAlerts: protectedProcedure.input(z14.object({
    alertType: z14.string().optional(),
    limit: z14.number().optional(),
    offset: z14.number().optional()
  }).optional()).query(async ({ input }) => {
    return getDismissedAlerts(input);
  }),
  /**
   * Get a specific dismissed alert by ID
   */
  getDismissedAlertById: protectedProcedure.input(z14.object({
    id: z14.number()
  })).query(async ({ input }) => {
    return getDismissedAlertById(input.id);
  }),
  /**
   * Get counts of dismissed alerts by type
   */
  getDismissedAlertCounts: protectedProcedure.query(async () => {
    return getDismissedAlertCounts();
  })
});

// server/routers/notifications.ts
import { z as z15 } from "zod";
init_notifications();
init_schema();
var notificationsRouter = router({
  /**
   * Get notifications for the current user
   */
  list: protectedProcedure.input(z15.object({
    type: z15.enum(NOTIFICATION_TYPES).optional(),
    isRead: z15.boolean().optional(),
    isDismissed: z15.boolean().optional(),
    priority: z15.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    limit: z15.number().min(1).max(100).default(50),
    offset: z15.number().min(0).default(0)
  }).optional()).query(async ({ ctx, input }) => {
    const filters = {
      userId: ctx.user.id,
      type: input?.type,
      isRead: input?.isRead,
      isDismissed: input?.isDismissed ?? false,
      // Default to not dismissed
      priority: input?.priority,
      limit: input?.limit ?? 50,
      offset: input?.offset ?? 0
    };
    return getNotifications(filters);
  }),
  /**
   * Get unread notification count for the current user
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return getUnreadCount(ctx.user.id);
  }),
  /**
   * Mark a notification as read
   */
  markAsRead: protectedProcedure.input(z15.object({
    notificationId: z15.number()
  })).mutation(async ({ ctx, input }) => {
    const notification = await getNotificationById(input.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    if (notification.userId !== null && notification.userId !== ctx.user.id) {
      throw new Error("Unauthorized");
    }
    await markAsRead(input.notificationId);
    return { success: true };
  }),
  /**
   * Mark all notifications as read for the current user
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const count2 = await markAllAsRead(ctx.user.id);
    return { success: true, count: count2 };
  }),
  /**
   * Dismiss a notification
   */
  dismiss: protectedProcedure.input(z15.object({
    notificationId: z15.number()
  })).mutation(async ({ ctx, input }) => {
    const notification = await getNotificationById(input.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    if (notification.userId !== null && notification.userId !== ctx.user.id) {
      throw new Error("Unauthorized");
    }
    await dismissNotification(input.notificationId);
    return { success: true };
  }),
  /**
   * Dismiss all notifications for the current user
   */
  dismissAll: protectedProcedure.mutation(async ({ ctx }) => {
    const count2 = await dismissAllNotifications(ctx.user.id);
    return { success: true, count: count2 };
  }),
  /**
   * Get a single notification by ID
   */
  getById: protectedProcedure.input(z15.object({
    notificationId: z15.number()
  })).query(async ({ ctx, input }) => {
    const notification = await getNotificationById(input.notificationId);
    if (!notification) {
      return null;
    }
    if (notification.userId !== null && notification.userId !== ctx.user.id) {
      return null;
    }
    return notification;
  })
});

// server/routers/goals.ts
import { z as z16 } from "zod";
init_db();
var goalsRouter = router({
  // List goals with optional filters
  list: protectedProcedure.input(z16.object({
    periodYear: z16.number().optional(),
    periodMonth: z16.number().optional(),
    periodQuarter: z16.number().optional(),
    status: z16.string().optional()
  }).optional()).query(async ({ ctx, input }) => {
    await archiveExpiredGoals(ctx.user.id);
    return getGoals(ctx.user.id, input);
  }),
  // Get active goals for dashboard display
  active: protectedProcedure.query(async ({ ctx }) => {
    await archiveExpiredGoals(ctx.user.id);
    return getActiveGoals(ctx.user.id);
  }),
  // Get single goal
  getById: protectedProcedure.input(z16.object({ id: z16.number() })).query(async ({ input }) => {
    return getGoalById(input.id);
  }),
  // Create a new goal
  create: protectedProcedure.input(z16.object({
    metricKey: z16.string().max(64),
    title: z16.string().max(255),
    description: z16.string().optional(),
    targetValue: z16.string(),
    unit: z16.enum(["count", "currency", "percentage"]).default("count"),
    periodType: z16.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
    periodMonth: z16.number().min(1).max(12).optional(),
    periodQuarter: z16.number().min(1).max(4).optional(),
    periodYear: z16.number(),
    color: z16.string().max(32).optional(),
    icon: z16.string().max(64).optional(),
    sortOrder: z16.number().optional()
  })).mutation(async ({ ctx, input }) => {
    return createGoal({
      ...input,
      userId: ctx.user.id
    });
  }),
  // Update a goal
  update: protectedProcedure.input(z16.object({
    id: z16.number(),
    title: z16.string().max(255).optional(),
    description: z16.string().optional(),
    targetValue: z16.string().optional(),
    currentValue: z16.string().optional(),
    unit: z16.enum(["count", "currency", "percentage"]).optional(),
    status: z16.enum(["ACTIVE", "COMPLETED", "MISSED", "ARCHIVED"]).optional(),
    color: z16.string().max(32).optional(),
    icon: z16.string().max(64).optional(),
    sortOrder: z16.number().optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return updateGoal(id, data);
  }),
  // Update progress on a goal
  updateProgress: protectedProcedure.input(z16.object({
    id: z16.number(),
    currentValue: z16.string()
  })).mutation(async ({ input }) => {
    return updateGoalProgress(input.id, input.currentValue);
  }),
  // Delete a goal
  delete: protectedProcedure.input(z16.object({ id: z16.number() })).mutation(async ({ input }) => {
    return deleteGoal(input.id);
  })
});

// server/routers.ts
var authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true
    };
  }),
  listUsers: protectedProcedure.query(async () => {
    return getAllUsers();
  })
});
var appRouter = router({
  system: systemRouter,
  auth: authRouter,
  agents: agentsRouter,
  clients: clientsRouter,
  tasks: tasksRouter,
  production: productionRouter,
  credentials: credentialsRouter,
  dashboard: dashboardRouter,
  mywfg: mywfgRouter,
  cashFlow: cashFlowRouter,
  team: teamRouter,
  syncLogs: syncLogsRouter,
  pendingPolicies: pendingPoliciesRouter,
  inforcePolicies: inforcePoliciesRouter,
  alerts: alertsRouter,
  notifications: notificationsRouter,
  goals: goalsRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { visualizer } from "rollup-plugin-visualizer";
var plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime()
];
if (process.env.ANALYZE === "true") {
  plugins.push(
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap"
      // Options: treemap, sunburst, network
    })
  );
}
var vite_config_default = defineConfig({
  base: "./",
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
    // Let Rollup handle chunk splitting automatically.
    // Manual chunking was removed because splitting React into a separate
    // vendor-react chunk causes TDZ errors: other chunks that call
    // React.forwardRef() at module top-level (Radix UI, recharts) can
    // execute before vendor-react finishes initializing, producing:
    //   "Uncaught ReferenceError: Cannot access 'S' before initialization"
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(
    "/assets",
    express.static(path2.resolve(distPath, "assets"), {
      maxAge: "1y",
      immutable: true
    })
  );
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
init_logger();
init_env();
function isPortAvailable(port) {
  return new Promise((resolve2) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve2(true));
    });
    server.on("error", () => resolve2(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.use(requestCorrelationMiddleware());
  app.use(helmet({
    contentSecurityPolicy: false
    // CSP managed by Vite/app
  }));
  app.use(express2.json({ limit: "2mb" }));
  app.use(express2.urlencoded({ limit: "2mb", extended: true }));
  const sensitiveLimiter = rateLimit({
    windowMs: 6e4,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use("/api/cron", sensitiveLimiter);
  app.use("/api/track", sensitiveLimiter);
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const requestId = req.requestId;
      logger.info(`${req.method} ${req.path}`, {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    });
    next();
  });
  const { healthz: healthz2, readyz: readyz2, healthDetailed: healthDetailed2 } = await Promise.resolve().then(() => (init_health(), health_exports));
  app.get("/healthz", healthz2);
  app.get("/api/healthz", healthz2);
  app.get("/readyz", readyz2);
  app.get("/api/readyz", readyz2);
  app.get("/api/health", healthDetailed2);
  app.get("/api/health/detailed", healthDetailed2);
  app.post("/api/setup/install-chrome", async (req, res) => {
    try {
      const { execSync: execSync2 } = await import("child_process");
      const { existsSync: existsSync3, readdirSync: readdirSync2, mkdirSync: mkdirSync2 } = await import("fs");
      const { resolve: resolve3 } = await import("path");
      const { homedir: homedir2 } = await import("os");
      const appDir = process.cwd();
      const findChrome = () => {
        const cacheDirs = [
          resolve3(appDir, ".chrome-cache", "chrome"),
          resolve3(appDir, ".chrome-cache", "chrome-direct", "chrome-linux64"),
          resolve3(homedir2(), ".cache/puppeteer/chrome"),
          "/root/.cache/puppeteer/chrome"
        ];
        for (const dir of cacheDirs) {
          if (existsSync3(dir)) {
            try {
              if (dir.endsWith("chrome-linux64")) {
                const bin = resolve3(dir, "chrome");
                if (existsSync3(bin)) return bin;
              } else {
                const versions = readdirSync2(dir).sort().reverse();
                for (const ver of versions) {
                  const bin = resolve3(dir, ver, "chrome-linux64", "chrome");
                  if (existsSync3(bin)) return bin;
                }
              }
            } catch {
            }
          }
        }
        for (const p of ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome"]) {
          if (existsSync3(p)) return p;
        }
        return null;
      };
      const existing = findChrome();
      if (existing) {
        return res.status(200).json({ success: true, message: "Chrome already installed", chromePath: existing });
      }
      console.log("[Setup] Chrome not found, installing...");
      const results = [];
      try {
        const puppeteerBin = resolve3(appDir, "node_modules/.bin/puppeteer");
        const cacheDir = resolve3(appDir, ".chrome-cache");
        mkdirSync2(cacheDir, { recursive: true });
        if (existsSync3(puppeteerBin)) {
          execSync2(`PUPPETEER_CACHE_DIR=${cacheDir} "${puppeteerBin}" browsers install chrome`, {
            stdio: "pipe",
            timeout: 3e5,
            env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir }
          });
          results.push("Strategy 1 (puppeteer CLI): success");
        } else {
          execSync2(`PUPPETEER_CACHE_DIR=${cacheDir} npx puppeteer browsers install chrome`, {
            stdio: "pipe",
            timeout: 3e5,
            env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir }
          });
          results.push("Strategy 1 (npx puppeteer): success");
        }
      } catch (e) {
        results.push(`Strategy 1 failed: ${e.message?.substring(0, 200)}`);
      }
      let chromePath = findChrome();
      if (chromePath) {
        return res.status(200).json({ success: true, message: "Chrome installed", chromePath, strategies: results });
      }
      try {
        const downloadDir = resolve3(appDir, ".chrome-cache", "chrome-direct");
        mkdirSync2(downloadDir, { recursive: true });
        const versionJson = execSync2(
          'curl -sS "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"',
          { stdio: "pipe", timeout: 3e4 }
        ).toString();
        const data = JSON.parse(versionJson);
        const url = data?.channels?.Stable?.downloads?.chrome?.find((d) => d.platform === "linux64")?.url;
        if (url) {
          execSync2(
            `cd "${downloadDir}" && curl -sSL "${url}" -o chrome.zip && unzip -q -o chrome.zip && rm -f chrome.zip && chmod +x chrome-linux64/chrome`,
            { stdio: "pipe", timeout: 3e5 }
          );
          results.push("Strategy 2 (direct download): success");
        }
      } catch (e) {
        results.push(`Strategy 2 failed: ${e.message?.substring(0, 200)}`);
      }
      chromePath = findChrome();
      if (chromePath) {
        return res.status(200).json({ success: true, message: "Chrome installed", chromePath, strategies: results });
      }
      try {
        execSync2(
          'wget -q -O /tmp/google-chrome.deb "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb" && dpkg -i /tmp/google-chrome.deb 2>/dev/null || apt-get install -f -y -qq 2>/dev/null && rm -f /tmp/google-chrome.deb',
          { stdio: "pipe", timeout: 3e5 }
        );
        results.push("Strategy 3 (dpkg): success");
      } catch (e) {
        results.push(`Strategy 3 failed: ${e.message?.substring(0, 200)}`);
      }
      chromePath = findChrome();
      res.status(chromePath ? 200 : 500).json({
        success: !!chromePath,
        message: chromePath ? "Chrome installed" : "All strategies failed",
        chromePath,
        strategies: results
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/setup/deploy", async (req, res) => {
    try {
      const { execSync: execSync2 } = await import("child_process");
      const appDir = process.cwd();
      console.log(`[Setup Deploy] Starting deployment from ${appDir}`);
      const pull = execSync2("git pull origin main", { cwd: appDir, stdio: "pipe", timeout: 6e4 }).toString();
      console.log("[Setup Deploy] git pull:", pull.trim());
      execSync2("pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1", { cwd: appDir, stdio: "pipe", timeout: 3e5 });
      console.log("[Setup Deploy] pnpm install done");
      execSync2("pnpm build 2>&1", { cwd: appDir, stdio: "pipe", timeout: 3e5 });
      console.log("[Setup Deploy] pnpm build done");
      res.status(202).json({ success: true, message: "Deploy started, restarting...", pull: pull.trim() });
      setImmediate(() => {
        try {
          execSync2("pm2 restart wfgcrm 2>&1 || pm2 restart all 2>&1", { timeout: 3e4 });
        } catch {
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/monitoring/sync", async (req, res) => {
    try {
      const { getMonitoringReport: getMonitoringReport2 } = await Promise.resolve().then(() => (init_monitoring(), monitoring_exports));
      const report = await getMonitoringReport2();
      const statusCode = report.overall.isHealthy ? 200 : 503;
      res.status(statusCode).json(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: errorMessage });
    }
  });
  app.post("/api/webhook/github", async (req, res) => {
    try {
      const payload = req.body;
      const event = req.headers["x-github-event"];
      if (event !== "push" || payload?.ref !== "refs/heads/main") {
        return res.status(200).json({ ok: true, skipped: true });
      }
      res.status(200).json({ ok: true, message: "Deploy triggered" });
      setImmediate(async () => {
        try {
          const { execSync } = await import("child_process");
          const appDir = process.cwd();
          console.log("[Webhook] Pulling latest code...");
          execSync("git pull origin main", { cwd: appDir, stdio: "pipe", timeout: 6e4 });
          execSync("pnpm install --frozen-lockfile", { cwd: appDir, stdio: "pipe", timeout: 3e5 });
          execSync("pnpm build", { cwd: appDir, stdio: "pipe", timeout: 3e5 });
          setTimeout(() => {
            try {
              execSync("pm2 restart wfgcrm || pm2 restart all", { stdio: "pipe", timeout: 3e4 });
            } catch {
            }
          }, 1e3);
          console.log("[Webhook] Deploy completed");
        } catch (err) {
          console.error("[Webhook] Deploy error:", err.message);
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Webhook failed" });
    }
  });
  const { startScheduler: startScheduler2 } = await Promise.resolve().then(() => (init_scheduler(), scheduler_exports));
  startScheduler2();
  app.post("/api/cron/sync", async (req, res) => {
    try {
      const { requireCronSecret: requireCronSecret2 } = await Promise.resolve().then(() => (init_cronAuth(), cronAuth_exports));
      requireCronSecret2(req);
      console.log("[Cron Sync] Starting scheduled sync with job locking...");
      const { executeFullSync: executeFullSync2 } = await Promise.resolve().then(() => (init_fullsync(), fullsync_exports));
      const result = await executeFullSync2("cron-post");
      if (result.success) {
        res.status(200).json({
          success: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          runId: result.runId,
          metrics: result.metrics
        });
      } else {
        const statusCode = result.error === "Job is already running" ? 409 : 500;
        res.status(statusCode).json({
          success: false,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          runId: result.runId,
          error: result.error
        });
      }
    } catch (error) {
      const statusCode = error.statusCode ?? 500;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Cron Sync] Error:", errorMessage);
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.post("/api/admin/install-chrome", async (req, res) => {
    try {
      const { requireCronSecret: requireCronSecret2 } = await Promise.resolve().then(() => (init_cronAuth(), cronAuth_exports));
      requireCronSecret2(req);
      const { execSync } = await import("child_process");
      const { existsSync: existsSync2, readdirSync: readdirSync2 } = await import("fs");
      const { resolve: resolve2 } = await import("path");
      const { homedir: homedir2 } = await import("os");
      const findChrome = () => {
        const cacheDirs = [
          resolve2(homedir2(), ".cache/puppeteer/chrome"),
          "/root/.cache/puppeteer/chrome"
        ];
        for (const dir of cacheDirs) {
          if (existsSync2(dir)) {
            try {
              const versions = readdirSync2(dir).sort().reverse();
              for (const ver of versions) {
                const bin = resolve2(dir, ver, "chrome-linux64", "chrome");
                if (existsSync2(bin)) return bin;
              }
            } catch {
            }
          }
        }
        for (const p of ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome-stable"]) {
          if (existsSync2(p)) return p;
        }
        return null;
      };
      const existing = findChrome();
      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Chrome already installed",
          chromePath: existing,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      console.log("[Admin] Installing Chrome for Puppeteer...");
      const isRoot = process.getuid && process.getuid() === 0;
      const cacheDir = isRoot ? "/root/.cache/puppeteer" : resolve2(homedir2(), ".cache/puppeteer");
      console.log(`[Admin] Using cache dir: ${cacheDir} (isRoot: ${isRoot})`);
      execSync(
        `PUPPETEER_CACHE_DIR=${cacheDir} npx puppeteer browsers install chrome`,
        { stdio: "pipe", timeout: 3e5, env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir } }
      );
      const newPath = findChrome();
      res.status(200).json({
        success: true,
        message: "Chrome installed successfully",
        chromePath: newPath,
        cacheDir,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      const statusCode = error.statusCode ?? 500;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Admin] Chrome install error:", errorMessage);
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.post("/api/admin/deploy", async (req, res) => {
    try {
      const { requireCronSecret: requireCronSecret2 } = await Promise.resolve().then(() => (init_cronAuth(), cronAuth_exports));
      requireCronSecret2(req);
      const { execSync } = await import("child_process");
      const { existsSync: existsSync2 } = await import("fs");
      const appDir = process.cwd();
      console.log(`[Deploy] Starting deployment from ${appDir}`);
      res.status(202).json({
        success: true,
        message: "Deployment started",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      setImmediate(async () => {
        try {
          console.log("[Deploy] Pulling latest code from GitHub...");
          execSync("git pull origin main", { cwd: appDir, stdio: "pipe", timeout: 6e4 });
          console.log("[Deploy] Installing dependencies...");
          execSync("pnpm install --frozen-lockfile", { cwd: appDir, stdio: "pipe", timeout: 3e5 });
          console.log("[Deploy] Building application...");
          execSync("pnpm build", { cwd: appDir, stdio: "pipe", timeout: 3e5 });
          console.log("[Deploy] Restarting application with PM2...");
          execSync("pm2 restart wfgcrm || pm2 restart all", { stdio: "pipe", timeout: 3e4 });
          console.log("[Deploy] Deployment completed successfully");
        } catch (err) {
          console.error("[Deploy] Deployment failed:", err.message);
        }
      });
    } catch (error) {
      const statusCode = error.statusCode ?? 500;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Deploy] Error:", errorMessage);
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  const handleTransamericaAlertsCron = async (req, res) => {
    try {
      const { requireCronSecret: requireCronSecret2 } = await Promise.resolve().then(() => (init_cronAuth(), cronAuth_exports));
      requireCronSecret2(req);
      console.log("[Cron] Starting Transamerica alerts sync with job locking...");
      const { withJobLock: withJobLock2 } = await Promise.resolve().then(() => (init_jobLock(), jobLock_exports));
      const { syncTransamericaAlerts: syncTransamericaAlerts3 } = await Promise.resolve().then(() => (init_scheduler(), scheduler_exports));
      const lockResult = await withJobLock2("transamerica-alerts", 20 * 60 * 1e3, async () => {
        return await syncTransamericaAlerts3();
      });
      if (lockResult.success) {
        const result = lockResult.result;
        res.status(200).json({
          success: result.success,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          alertsCount: result.alertsCount,
          newAlertsDetected: result.newAlertsDetected,
          notificationSent: result.notificationSent,
          error: result.error
        });
      } else if (lockResult.reason === "locked") {
        res.status(409).json({
          success: false,
          error: "Transamerica alerts sync is already running",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        throw lockResult.error;
      }
    } catch (error) {
      const statusCode = error.statusCode ?? 500;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(statusCode).json({ success: false, error: errorMessage });
    }
  };
  app.post("/api/cron/transamerica-alerts", handleTransamericaAlertsCron);
  if (!ENV.isProduction || ENV.enableCronGetSecret) {
    app.get("/api/cron/transamerica-alerts", handleTransamericaAlertsCron);
  }
  if (!ENV.isProduction || ENV.enableCronGetSecret) {
    app.get("/api/cron/sync", async (req, res) => {
      try {
        const { requireCronSecret: requireCronSecret2 } = await Promise.resolve().then(() => (init_cronAuth(), cronAuth_exports));
        requireCronSecret2(req);
        console.warn("[Cron Sync GET] DEPRECATED: Use POST /api/cron/sync with x-sync-secret header");
        console.log("[Cron Sync GET] Starting scheduled sync with job locking...");
        const { executeFullSync: executeFullSync2 } = await Promise.resolve().then(() => (init_fullsync(), fullsync_exports));
        const result = await executeFullSync2("cron-get");
        if (result.success) {
          res.status(200).json({
            success: true,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            runId: result.runId,
            metrics: result.metrics,
            deprecated: "Use POST /api/cron/sync with x-sync-secret header"
          });
        } else {
          const statusCode = result.error === "Job is already running" ? 409 : 500;
          res.status(statusCode).json({
            success: false,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            runId: result.runId,
            error: result.error
          });
        }
      } catch (error) {
        const statusCode = error.statusCode ?? 500;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(statusCode).json({ success: false, error: errorMessage });
      }
    });
  }
  app.get("/api/track/open/:trackingId", async (req, res) => {
    try {
      const { trackingId } = req.params;
      const userAgent = req.headers["user-agent"] || "";
      const ipAddress = req.ip ?? "";
      const { recordEmailOpen: recordEmailOpen2 } = await Promise.resolve().then(() => (init_email_tracking(), email_tracking_exports));
      await recordEmailOpen2(trackingId, userAgent, ipAddress);
      const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.set("Content-Type", "image/gif");
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.send(pixel);
    } catch (error) {
      const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.set("Content-Type", "image/gif");
      res.send(pixel);
    }
  });
  app.get("/api/track/click/:trackingId", async (req, res) => {
    try {
      const { trackingId } = req.params;
      const { url } = req.query;
      const userAgent = req.headers["user-agent"] || "";
      const ipAddress = req.ip ?? "";
      const { recordEmailClick: recordEmailClick2, getValidatedRedirectUrl: getValidatedRedirectUrl2 } = await Promise.resolve().then(() => (init_email_tracking(), email_tracking_exports));
      const validatedUrl = await getValidatedRedirectUrl2(trackingId, url);
      if (!validatedUrl) {
        console.warn(`[Click Tracking] Invalid or missing redirect URL for tracking ID: ${trackingId}`);
        res.status(400).send("Invalid or missing redirect URL");
        return;
      }
      await recordEmailClick2(trackingId, validatedUrl, userAgent, ipAddress);
      res.redirect(302, validatedUrl);
    } catch (error) {
      console.error("[Click Tracking] Error:", error);
      res.status(400).send("Invalid tracking request");
    }
  });
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);

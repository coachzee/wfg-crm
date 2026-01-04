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

// Agents (Recruits) - Track newly recruited agents through their lifecycle
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  agentCode: varchar("agentCode", { length: 64 }).unique(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  recruiterUserId: int("recruiterUserId").references(() => users.id),
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
  examDate: date("examDate"),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  firstPolicyDate: date("firstPolicyDate"),
  firstProductionAmount: decimal("firstProductionAmount", { precision: 10, scale: 2 }),
  productionMilestoneDate: date("productionMilestoneDate"),
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
  renewalDate: date("renewalDate"),
  lastContactDate: timestamp("lastContactDate"),
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
  policyNumber: varchar("policyNumber", { length: 100 }).notNull(),
  policyType: varchar("policyType", { length: 50 }).notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 12, scale: 2 }),
  premiumAmount: decimal("premiumAmount", { precision: 12, scale: 2 }),
  issueDate: date("issueDate").notNull(),
  chargebackProofDate: date("chargebackProofDate"),
  isChargebackProof: boolean("isChargebackProof").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionRecord = typeof productionRecords.$inferSelect;
export type InsertProductionRecord = typeof productionRecords.$inferInsert;

// MyWFG Integration Logs - Track automated data syncs from mywfg.com
export const mywfgSyncLogs = mysqlTable("mywfgSyncLogs", {
  id: int("id").autoincrement().primaryKey(),
  syncDate: timestamp("syncDate").defaultNow().notNull(),
  status: mysqlEnum("status", ["SUCCESS", "FAILED", "PARTIAL"]).notNull(),
  recordsProcessed: int("recordsProcessed").default(0),
  errorMessage: text("errorMessage"),
  syncedAgentCodes: json("syncedAgentCodes"),
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
  clients: many(clients),
  tasks: many(workflowTasks),
  productionRecords: many(productionRecords),
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

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}));
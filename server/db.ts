import { eq, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, agents, clients, workflowTasks, productionRecords, credentials, mywfgSyncLogs, InsertAgent, InsertClient, InsertWorkflowTask, InsertProductionRecord, InsertCredential, InsertMywfgSyncLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Export types for use in procedures
export type { Agent, Client, WorkflowTask, ProductionRecord, Credential, MywfgSyncLog } from "../drizzle/schema";

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
}

// Agent queries
export async function getAgents(filters?: { stage?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];

  let query: any = db.select().from(agents);
  if (filters?.stage) {
    query = query.where(eq(agents.currentStage, filters.stage as any));
  }
  if (filters?.isActive !== undefined) {
    query = query.where(eq(agents.isActive, filters.isActive));
  }
  return query;
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0] || null;
}

export async function createAgent(data: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Insert the agent
  const insertResult = await db.insert(agents).values(data);
  
  // Get the inserted ID from the result
  const insertId = (insertResult as any)[0]?.insertId;
  
  if (!insertId) {
    throw new Error("Failed to get inserted agent ID");
  }
  
  // Fetch and return the created agent
  const created = await db.select().from(agents).where(eq(agents.id, insertId)).limit(1);
  return created[0];
}

export async function updateAgent(id: number, data: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(agents).set(data).where(eq(agents.id, id));
  
  // Return the updated agent
  const updated = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return updated[0];
}

// Client queries
export async function getClients(agentId?: number) {
  const db = await getDb();
  if (!db) return [];
  let query: any = db.select().from(clients);
  if (agentId) {
    query = query.where(eq(clients.agentId, agentId));
  }
  return query;
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(clients).values(data);
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(clients).set(data).where(eq(clients.id, id));
}

// Workflow task queries
export async function getWorkflowTasks(filters?: { agentId?: number; clientId?: number; completed?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let query: any = db.select().from(workflowTasks);
  if (filters?.agentId) {
    query = query.where(eq(workflowTasks.agentId, filters.agentId));
  }
  if (filters?.clientId) {
    query = query.where(eq(workflowTasks.clientId, filters.clientId));
  }
  if (filters?.completed !== undefined) {
    if (filters.completed) {
      query = query.where(sql`${workflowTasks.completedAt} IS NOT NULL`);
    } else {
      query = query.where(sql`${workflowTasks.completedAt} IS NULL`);
    }
  }
  return query;
}

export async function createWorkflowTask(data: InsertWorkflowTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workflowTasks).values(data);
}

export async function updateWorkflowTask(id: number, data: Partial<InsertWorkflowTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(workflowTasks).set(data).where(eq(workflowTasks.id, id));
}

// Production record queries
export async function getProductionRecords(agentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionRecords).where(eq(productionRecords.agentId, agentId));
}

export async function createProductionRecord(data: InsertProductionRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(productionRecords).values(data);
}

// Credential queries
export async function getCredentialsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(credentials).where(eq(credentials.userId, userId)).limit(1);
  return result[0];
}

export async function createOrUpdateCredential(data: InsertCredential) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(credentials).values(data).onDuplicateKeyUpdate({
    set: {
      encryptedUsername: data.encryptedUsername,
      encryptedPassword: data.encryptedPassword,
      encryptedApiKey: data.encryptedApiKey,
      isActive: data.isActive,
      updatedAt: new Date(),
    },
  });
}

// MyWFG sync log queries
export async function createSyncLog(data: InsertMywfgSyncLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(mywfgSyncLogs).values(data);
}

export async function getLatestSyncLog() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(mywfgSyncLogs).orderBy(desc(mywfgSyncLogs.syncDate)).limit(1);
  return result[0] || null;
}

// Dashboard metrics for face amount and families protected
// Note: Some values are pulled from MyWFG data exploration (Jan 2025 - Dec 2025)
export async function getDashboardMetrics() {
  const db = await getDb();
  
  // MyWFG extracted data (from Total Cash Flow, Commissions Summary, and MY BUSINESS reports)
  // These are the actual values from the MyWFG account as of Jan 4, 2026
  const mywfgData = {
    superTeamCashFlow: 290099.22, // Super Team Total Cash Flow (Jan-Dec 2025)
    personalCashFlow: 189931.39, // Personal Total Cash Flow (Jan-Dec 2025)
    familiesProtected: 77, // Unique policies from Commissions Summary
    totalPolicies: 77, // Total policies written in 2025
    activeAssociates: 91, // Active Associates from Team Summary - Base (as of 12/30/25)
    licensedAgents: 27, // Life Licensed Associates from Team Summary (as of 12/30/25)
    securitiesLicensed: 0, // Securities Licensed Associates (as of 12/30/25)
  };
  
  if (!db) return {
    totalFaceAmount: 0,
    totalPolicies: mywfgData.totalPolicies,
    familiesProtected: mywfgData.familiesProtected,
    totalClients: 0,
    superTeamCashFlow: mywfgData.superTeamCashFlow,
    personalCashFlow: mywfgData.personalCashFlow,
    activeAssociates: mywfgData.activeAssociates,
    licensedAgents: mywfgData.licensedAgents,
  };

  // Get total face amount from production records (manual entries)
  const faceAmountResult = await db.select({
    totalFaceAmount: sql<string>`COALESCE(SUM(${productionRecords.faceAmount}), 0)`,
    dbPolicies: sql<number>`COUNT(*)`,
  }).from(productionRecords);

  // Get unique families (households) protected from clients table
  const familiesResult = await db.select({
    dbFamilies: sql<number>`COUNT(DISTINCT CASE WHEN ${clients.householdId} IS NOT NULL THEN ${clients.householdId} ELSE ${clients.id} END)`,
    totalClients: sql<number>`COUNT(*)`,
  }).from(clients);

  // Use MyWFG data for families/policies, but allow DB to add more
  const dbPolicies = Number(faceAmountResult[0]?.dbPolicies || 0);
  const dbFamilies = Number(familiesResult[0]?.dbFamilies || 0);
  
  return {
    totalFaceAmount: parseFloat(faceAmountResult[0]?.totalFaceAmount || '0'),
    totalPolicies: Math.max(mywfgData.totalPolicies, dbPolicies),
    familiesProtected: Math.max(mywfgData.familiesProtected, dbFamilies),
    totalClients: Number(familiesResult[0]?.totalClients || 0),
    superTeamCashFlow: mywfgData.superTeamCashFlow,
    personalCashFlow: mywfgData.personalCashFlow,
    activeAssociates: mywfgData.activeAssociates,
    licensedAgents: mywfgData.licensedAgents,
  };
}

// Get all production records with face amount
export async function getAllProductionRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionRecords).orderBy(desc(productionRecords.issueDate));
}

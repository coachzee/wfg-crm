/**
 * Agents Repository
 * 
 * Database operations for agent management including:
 * - CRUD operations
 * - Agent filtering and search
 * - Cash flow history
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { agents, agentCashFlowHistory, InsertAgent, InsertAgentCashFlowHistory } from "../../drizzle/schema";
import { logger } from "../_core/logger";

// Re-export types
export type { Agent, AgentCashFlowHistory } from "../../drizzle/schema";

// Import getDb from parent - will be injected
let _getDb: () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;

export function initAgentsRepository(getDb: typeof _getDb) {
  _getDb = getDb;
}

export async function getAgents(filters?: { stage?: string; isActive?: boolean }) {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get agents: database not available");
    return [];
  }

  let query: any = db.select().from(agents);
  if (filters?.stage) {
    query = query.where(eq(agents.currentStage, filters.stage as any));
  }
  if (filters?.isActive !== undefined) {
    query = query.where(eq(agents.isActive, filters.isActive));
  }
  
  logger.debug("Fetching agents", { filters });
  return query;
}

export async function getAgentById(id: number) {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get agent: database not available");
    return null;
  }
  
  logger.debug("Fetching agent by ID", { agentId: id });
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0] || null;
}

export async function createAgent(data: InsertAgent) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Creating new agent", { firstName: data.firstName, lastName: data.lastName });
  const insertResult = await db.insert(agents).values(data);
  const insertId = (insertResult as any)[0]?.insertId;
  
  if (!insertId) {
    throw new Error("Failed to get inserted agent ID");
  }
  
  const created = await db.select().from(agents).where(eq(agents.id, insertId)).limit(1);
  return created[0];
}

export async function updateAgent(id: number, data: Partial<InsertAgent>) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Updating agent", { agentId: id });
  await db.update(agents).set(data).where(eq(agents.id, id));
  
  const updated = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return updated[0];
}

export async function getAgentCashFlowHistory(agentCode: string) {
  const db = await _getDb();
  if (!db) return [];
  
  logger.debug("Fetching agent cash flow history", { agentCode });
  return db.select()
    .from(agentCashFlowHistory)
    .where(eq(agentCashFlowHistory.agentCode, agentCode))
    .orderBy(desc(agentCashFlowHistory.syncedAt));
}

export async function getAllCashFlowRecords() {
  const db = await _getDb();
  if (!db) return [];
  
  logger.debug("Fetching all cash flow records");
  return db.select()
    .from(agentCashFlowHistory)
    .orderBy(desc(agentCashFlowHistory.syncedAt));
}

export async function getNetLicensedAgents() {
  const db = await _getDb();
  if (!db) return [];
  
  logger.debug("Fetching net licensed agents");
  
  // Get all agents with their latest cash flow data
  const allAgents = await db.select().from(agents).where(eq(agents.isActive, true));
  
  // Get all cash flow records
  const cashFlowRecords = await db.select().from(agentCashFlowHistory);
  
  // Create a map of agent code to their latest cumulative cash flow
  const cashFlowMap = new Map<string, number>();
  for (const record of cashFlowRecords) {
    const current = cashFlowMap.get(record.agentCode) || 0;
    const recordValue = parseFloat(String(record.cumulativeCashFlow || 0));
    if (recordValue > current) {
      cashFlowMap.set(record.agentCode, recordValue);
    }
  }
  
  // Filter agents who are net licensed (cumulative cash flow >= $1000 and not SMD)
  const netLicensed = allAgents.filter(agent => {
    if (!agent.agentCode) return false;
    const cashFlow = cashFlowMap.get(agent.agentCode) || 0;
    const titleLevel = agent.currentRank || '';
    // SMD and above are not counted as net licensed (they're already established)
    if (['SMD', 'EMD', 'CEO'].includes(titleLevel)) return false;
    return cashFlow >= 1000;
  });
  
  return netLicensed;
}

interface CashFlowRecordInput {
  agentCode: string;
  agentName: string;
  titleLevel: string;
  cashFlowAmount: string;
  cumulativeCashFlow: string;
  paymentDate?: Date | null;
}

export async function upsertCashFlowRecord(data: InsertAgentCashFlowHistory) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Upserting cash flow record", { agentCode: data.agentCode });
  
  // Check if record exists for this agent
  const existing = await db.select()
    .from(agentCashFlowHistory)
    .where(eq(agentCashFlowHistory.agentCode, data.agentCode))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing record
    await db.update(agentCashFlowHistory)
      .set({
        agentName: data.agentName,
        titleLevel: data.titleLevel,
        cumulativeCashFlow: data.cumulativeCashFlow,
        cashFlowAmount: data.cashFlowAmount,
      })
      .where(eq(agentCashFlowHistory.id, existing[0].id));
    
    const updated = await db.select()
      .from(agentCashFlowHistory)
      .where(eq(agentCashFlowHistory.id, existing[0].id))
      .limit(1);
    return updated[0];
  } else {
    // Insert new record
    const insertResult = await db.insert(agentCashFlowHistory).values(data);
    const insertId = (insertResult as any)[0]?.insertId;
    
    if (!insertId) {
      throw new Error("Failed to get inserted cash flow record ID");
    }
    
    const created = await db.select()
      .from(agentCashFlowHistory)
      .where(eq(agentCashFlowHistory.id, insertId))
      .limit(1);
    return created[0];
  }
}

export async function bulkUpsertCashFlowRecords(records: CashFlowRecordInput[]) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Bulk upserting cash flow records", { count: records.length });
  
  const results = [];
  for (const record of records) {
    const result = await upsertCashFlowRecord({
      agentCode: record.agentCode,
      agentName: record.agentName,
      titleLevel: record.titleLevel,
      cashFlowAmount: record.cashFlowAmount,
      cumulativeCashFlow: record.cumulativeCashFlow,
      paymentDate: record.paymentDate || null,
    });
    results.push(result);
  }
  
  return results;
}

export async function clearAllCashFlowRecords() {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.warn("Clearing all cash flow records");
  await db.delete(agentCashFlowHistory);
  return { success: true };
}

export async function getAgentContactInfo(agentCode: string): Promise<{
  name: string;
  phone: string;
  email: string;
} | null> {
  const db = await _getDb();
  if (!db) return null;
  
  logger.debug("Fetching agent contact info", { agentCode });
  
  const result = await db.select({
    firstName: agents.firstName,
    lastName: agents.lastName,
    phone: agents.phone,
    email: agents.email,
  })
  .from(agents)
  .where(eq(agents.agentCode, agentCode))
  .limit(1);
  
  if (result.length === 0) return null;
  
  const agent = result[0];
  return {
    name: `${agent.firstName} ${agent.lastName}`,
    phone: agent.phone || '',
    email: agent.email || '',
  };
}

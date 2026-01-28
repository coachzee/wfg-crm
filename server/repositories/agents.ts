/**
 * Agents Repository
 * 
 * Database operations for agent management including:
 * - CRUD operations
 * - Agent filtering and search
 * - Cash flow history
 * - Net Licensed tracking
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
    .orderBy(desc(agentCashFlowHistory.cumulativeCashFlow));
}

// Get Net Licensed agents (cumulative cash flow >= $1,000 and title TA or A)
export async function getNetLicensedAgents(): Promise<{
  netLicensedAgents: Array<{
    rank: number;
    name: string;
    code: string;
    titleLevel: string;
    totalCashFlow: number;
    uplineSMD: string;
    netLicensedDate: Date | null;
  }>;
  notNetLicensedAgents: Array<{
    name: string;
    code: string;
    titleLevel: string;
    totalCashFlow: number;
    uplineSMD: string;
    amountToNetLicensed: number;
  }>;
  totalNetLicensed: number;
  reportPeriod: string;
  lastSyncDate: string;
}> {
  const db = await _getDb();
  if (!db) {
    return { 
      netLicensedAgents: [], 
      notNetLicensedAgents: [], 
      totalNetLicensed: 0,
      reportPeriod: 'N/A',
      lastSyncDate: new Date().toISOString(),
    };
  }
  
  logger.debug("Fetching net licensed agents");
  
  // Get all cash flow records
  const allRecords = await db.select()
    .from(agentCashFlowHistory)
    .orderBy(desc(agentCashFlowHistory.cumulativeCashFlow));
  
  // Filter for Net Licensed (>= $1,000 and TA/A only)
  const netLicensedAgents = allRecords.filter(r => {
    const cashFlow = parseFloat(r.cumulativeCashFlow?.toString() || '0');
    const title = r.titleLevel?.toUpperCase() || '';
    // Only TA (Training Associate) and A (Associate) qualify
    // Exclude SA (Senior Associate), MD, SMD, EMD, etc.
    return cashFlow >= 1000 && (title === 'TA' || title === 'A');
  }).map((r, index) => ({
    rank: index + 1,
    name: r.agentName,
    code: r.agentCode,
    titleLevel: r.titleLevel || 'TA',
    totalCashFlow: parseFloat(r.cumulativeCashFlow?.toString() || '0'),
    uplineSMD: r.uplineSMD || 'Unknown',
    netLicensedDate: r.netLicensedDate || null,
  }));
  
  // Filter for agents working toward Net Licensed (< $1,000 and TA/A only)
  const notNetLicensedAgents = allRecords.filter(r => {
    const cashFlow = parseFloat(r.cumulativeCashFlow?.toString() || '0');
    const title = r.titleLevel?.toUpperCase() || '';
    return cashFlow < 1000 && cashFlow > 0 && (title === 'TA' || title === 'A');
  }).map(r => ({
    name: r.agentName,
    code: r.agentCode,
    titleLevel: r.titleLevel || 'TA',
    totalCashFlow: parseFloat(r.cumulativeCashFlow?.toString() || '0'),
    uplineSMD: r.uplineSMD || 'Unknown',
    amountToNetLicensed: 1000 - parseFloat(r.cumulativeCashFlow?.toString() || '0'),
  })).slice(0, 10); // Limit to top 10 closest to Net Licensed
  
  return {
    netLicensedAgents,
    notNetLicensedAgents,
    totalNetLicensed: netLicensedAgents.length,
    reportPeriod: allRecords[0]?.reportPeriod || 'N/A',
    lastSyncDate: allRecords[0]?.syncedAt?.toISOString() || new Date().toISOString(),
  };
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
        uplineSMD: data.uplineSMD,
        cashFlowAmount: data.cashFlowAmount,
        cumulativeCashFlow: data.cumulativeCashFlow,
        paymentDate: data.paymentDate,
        paymentCycle: data.paymentCycle,
        isNetLicensed: parseFloat(data.cumulativeCashFlow?.toString() || '0') >= 1000,
        netLicensedDate: parseFloat(data.cumulativeCashFlow?.toString() || '0') >= 1000 
          ? (existing[0].netLicensedDate || data.paymentDate) 
          : null,
        reportPeriod: data.reportPeriod,
        syncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentCashFlowHistory.agentCode, data.agentCode));
    
    const updated = await db.select()
      .from(agentCashFlowHistory)
      .where(eq(agentCashFlowHistory.agentCode, data.agentCode))
      .limit(1);
    return updated[0];
  } else {
    // Insert new record
    const isNetLicensed = parseFloat(data.cumulativeCashFlow?.toString() || '0') >= 1000;
    const insertResult = await db.insert(agentCashFlowHistory).values({
      ...data,
      isNetLicensed,
      netLicensedDate: isNetLicensed ? data.paymentDate : null,
      syncedAt: new Date(),
    });
    
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

// Input type for bulk operations - allows optional fields
export interface CashFlowRecordInput {
  agentCode: string;
  agentName: string;
  titleLevel?: string;
  uplineSMD?: string;
  cashFlowAmount: string;
  cumulativeCashFlow: string;
  paymentDate?: string;
  paymentCycle?: string;
  reportPeriod?: string;
}

export async function bulkUpsertCashFlowRecords(records: CashFlowRecordInput[]) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Bulk upserting cash flow records", { count: records.length });
  
  const results = [];
  for (const record of records) {
    try {
      const insertData: InsertAgentCashFlowHistory = {
        agentCode: record.agentCode,
        agentName: record.agentName,
        titleLevel: record.titleLevel,
        uplineSMD: record.uplineSMD,
        cashFlowAmount: record.cashFlowAmount,
        cumulativeCashFlow: record.cumulativeCashFlow,
        paymentDate: record.paymentDate ? new Date(record.paymentDate) : undefined,
        paymentCycle: record.paymentCycle,
        reportPeriod: record.reportPeriod,
      };
      await upsertCashFlowRecord(insertData);
      results.push({ agentCode: record.agentCode, success: true });
    } catch (error) {
      results.push({ agentCode: record.agentCode, success: false, error: String(error) });
    }
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
  phone: string | null;
  email: string | null;
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
    phone: agent.phone,
    email: agent.email,
  };
}

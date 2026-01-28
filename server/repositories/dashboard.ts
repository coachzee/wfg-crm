/**
 * Dashboard Repository
 * 
 * Database operations for dashboard metrics and summaries including:
 * - Agent statistics
 * - Production metrics
 * - Cash flow summaries
 */

import { eq, sql, count, sum, and, gte, lte } from "drizzle-orm";
import { 
  agents, 
  clients, 
  workflowTasks, 
  inforcePolicies, 
  agentCashFlowHistory,
  monthlyTeamCashFlow,
  InsertMonthlyTeamCashFlow
} from "../../drizzle/schema";
import { logger } from "../_core/logger";

// Import getDb from parent - will be injected
let _getDb: () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;

export function initDashboardRepository(getDb: typeof _getDb) {
  _getDb = getDb;
}

export async function getDashboardMetrics() {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get dashboard metrics: database not available");
    return {
      totalAgents: 0,
      activeAgents: 0,
      totalClients: 0,
      totalPolicies: 0,
      familiesProtected: 0,
      totalFaceAmount: 0,
      superTeamCashFlow: 319570.24,
      personalCashFlow: 210864.80,
      activeAssociates: 0,
      licensedAgents: 0,
    };
  }
  
  logger.debug("Fetching dashboard metrics");
  
  // Get agent counts
  const allAgents = await db.select().from(agents);
  const activeAgents = allAgents.filter(a => a.isActive);
  
  // Get client count
  const clientCount = await db.select({ count: count() }).from(clients);
  
  // Get policy metrics from inforce policies
  const policyMetrics = await db.select({
    count: count(),
    totalFaceAmount: sum(inforcePolicies.faceAmount),
  }).from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  
  // Get unique families (owner names)
  const uniqueFamilies = await db.selectDistinct({ ownerName: inforcePolicies.ownerName })
    .from(inforcePolicies)
    .where(eq(inforcePolicies.status, 'Active'));
  
  // Get task completion stats
  const allTasks = await db.select().from(workflowTasks);
  const completedTasks = allTasks.filter(t => t.completedAt !== null);
  
  // Calculate licensed agents (those with $1000+ cash flow, excluding SMD and above)
  const cashFlowRecords = await db.select().from(agentCashFlowHistory);
  const cashFlowMap = new Map<string, number>();
  for (const record of cashFlowRecords) {
    const current = cashFlowMap.get(record.agentCode) || 0;
    const recordValue = parseFloat(String(record.cumulativeCashFlow || 0));
    if (recordValue > current) {
      cashFlowMap.set(record.agentCode, recordValue);
    }
  }
  
  const licensedAgents = activeAgents.filter(agent => {
    if (!agent.agentCode) return false;
    const cashFlow = cashFlowMap.get(agent.agentCode) || 0;
    const titleLevel = agent.currentRank || '';
    if (['SMD', 'EMD', 'CEO'].includes(titleLevel)) return false;
    return cashFlow >= 1000;
  });
  
  return {
    totalAgents: allAgents.length,
    activeAgents: activeAgents.length,
    totalClients: clientCount[0]?.count || 0,
    totalPolicies: policyMetrics[0]?.count || 0,
    familiesProtected: uniqueFamilies.length,
    totalFaceAmount: parseFloat(String(policyMetrics[0]?.totalFaceAmount || 0)),
    superTeamCashFlow: 319570.24,
    personalCashFlow: 210864.80,
    activeAssociates: activeAgents.length,
    licensedAgents: licensedAgents.length,
    taskCompletion: {
      total: allTasks.length,
      completed: completedTasks.length,
      percentage: allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0,
    },
  };
}

export async function getAgentStats() {
  const db = await _getDb();
  if (!db) {
    return { total: 0, active: 0, inactive: 0, byStage: {} };
  }
  
  logger.debug("Fetching agent statistics");
  
  const allAgents = await db.select().from(agents);
  const active = allAgents.filter(a => a.isActive);
  const inactive = allAgents.filter(a => !a.isActive);
  
  // Group by stage
  const byStage: Record<string, number> = {};
  for (const agent of allAgents) {
    const stage = agent.currentStage || 'UNKNOWN';
    byStage[stage] = (byStage[stage] || 0) + 1;
  }
  
  return {
    total: allAgents.length,
    active: active.length,
    inactive: inactive.length,
    byStage,
  };
}

export async function getProductionStats() {
  const db = await _getDb();
  if (!db) {
    return { totalPremium: 0, totalCommission: 0, policyCount: 0 };
  }
  
  logger.debug("Fetching production statistics");
  
  const metrics = await db.select({
    totalPremium: sum(inforcePolicies.targetPremium),
    totalCommission: sum(inforcePolicies.calculatedCommission),
    count: count(),
  }).from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  
  return {
    totalPremium: parseFloat(String(metrics[0]?.totalPremium || 0)),
    totalCommission: parseFloat(String(metrics[0]?.totalCommission || 0)),
    policyCount: metrics[0]?.count || 0,
  };
}

export async function getMonthlyTeamCashFlow(agentCode: string = "73DXR") {
  const db = await _getDb();
  if (!db) return [];
  
  logger.debug("Fetching monthly team cash flow", { agentCode });
  
  return db.select()
    .from(monthlyTeamCashFlow)
    .where(eq(monthlyTeamCashFlow.agentCode, agentCode));
}

export async function upsertMonthlyTeamCashFlow(data: InsertMonthlyTeamCashFlow) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Upserting monthly team cash flow", { agentCode: data.agentCode, monthYear: data.monthYear });
  
  return db.insert(monthlyTeamCashFlow)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        superTeamCashFlow: data.superTeamCashFlow,
        personalCashFlow: data.personalCashFlow,
      },
    });
}

export async function bulkUpsertMonthlyTeamCashFlow(records: InsertMonthlyTeamCashFlow[]) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Bulk upserting monthly team cash flow", { count: records.length });
  
  const results = [];
  for (const record of records) {
    const result = await upsertMonthlyTeamCashFlow(record);
    results.push(result);
  }
  return results;
}

export async function getCashFlowTotals(agentCode: string = "73DXR") {
  const db = await _getDb();
  if (!db) {
    return { superTeamTotal: 0, personalTotal: 0 };
  }
  
  logger.debug("Fetching cash flow totals", { agentCode });
  
  const records = await db.select()
    .from(monthlyTeamCashFlow)
    .where(eq(monthlyTeamCashFlow.agentCode, agentCode));
  
  let superTeamTotal = 0;
  let personalTotal = 0;
  
  for (const record of records) {
    superTeamTotal += parseFloat(String(record.superTeamCashFlow || 0));
    personalTotal += parseFloat(String(record.personalCashFlow || 0));
  }
  
  return { superTeamTotal, personalTotal };
}

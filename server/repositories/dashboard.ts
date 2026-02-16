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

export async function getMonthOverMonthComparison() {
  const db = await _getDb();
  if (!db) {
    return {
      activeAssociates: { current: 0, previous: 0, change: 0, changePercent: 0 },
      licensedAgents: { current: 0, previous: 0, change: 0, changePercent: 0 },
      totalPolicies: { current: 0, previous: 0, change: 0, changePercent: 0 },
      familiesProtected: { current: 0, previous: 0, change: 0, changePercent: 0 },
      superTeamCashFlow: { current: 0, previous: 0, change: 0, changePercent: 0 },
      totalFaceAmount: { current: 0, previous: 0, change: 0, changePercent: 0 },
    };
  }

  logger.debug("Calculating month-over-month comparison");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Current month start/end
  const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const previousMonthStart = new Date(prevYear, prevMonth - 1, 1);
  const previousMonthEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59);

  // Agent counts: current active vs agents active before this month
  const allAgents = await db.select().from(agents);
  const currentActive = allAgents.filter(a => a.isActive).length;
  // Agents created before current month that are still active (approximation of previous month count)
  const previousActive = allAgents.filter(a => a.isActive && new Date(a.createdAt) < currentMonthStart).length;

  // Licensed agents: compare current vs previous
  const cashFlowRecords = await db.select().from(agentCashFlowHistory);
  const cashFlowMap = new Map<string, number>();
  for (const record of cashFlowRecords) {
    const current = cashFlowMap.get(record.agentCode) || 0;
    const recordValue = parseFloat(String(record.cumulativeCashFlow || 0));
    if (recordValue > current) {
      cashFlowMap.set(record.agentCode, recordValue);
    }
  }
  const currentLicensed = allAgents.filter(agent => {
    if (!agent.isActive || !agent.agentCode) return false;
    const cf = cashFlowMap.get(agent.agentCode) || 0;
    if (['SMD', 'EMD', 'CEO'].includes(agent.currentRank || '')) return false;
    return cf >= 1000;
  }).length;
  // Approximate previous licensed: agents that were created before this month and are licensed
  const previousLicensed = allAgents.filter(agent => {
    if (!agent.isActive || !agent.agentCode) return false;
    if (new Date(agent.createdAt) >= currentMonthStart) return false;
    const cf = cashFlowMap.get(agent.agentCode) || 0;
    if (['SMD', 'EMD', 'CEO'].includes(agent.currentRank || '')) return false;
    return cf >= 1000;
  }).length;

  // Policy counts
  const allPolicies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  const currentPolicies = allPolicies.length;
  const previousPolicies = allPolicies.filter(p => {
    const issueDate = p.issueDate ? new Date(p.issueDate) : null;
    return !issueDate || issueDate < currentMonthStart;
  }).length;

  // Families protected
  const currentFamilies = new Set(allPolicies.map(p => p.ownerName)).size;
  const prevPolicies = allPolicies.filter(p => {
    const issueDate = p.issueDate ? new Date(p.issueDate) : null;
    return !issueDate || issueDate < currentMonthStart;
  });
  const previousFamilies = new Set(prevPolicies.map(p => p.ownerName)).size;

  // Face amount
  const currentFaceAmount = allPolicies.reduce((sum, p) => sum + parseFloat(String(p.faceAmount || 0)), 0);
  const previousFaceAmount = prevPolicies.reduce((sum, p) => sum + parseFloat(String(p.faceAmount || 0)), 0);

  // Cash flow from monthlyTeamCashFlow table
  const cashFlowData = await db.select().from(monthlyTeamCashFlow)
    .where(eq(monthlyTeamCashFlow.agentCode, '73DXR'));
  
  const currentCashFlow = cashFlowData.find(r => r.month === currentMonth && r.year === currentYear);
  const previousCashFlow = cashFlowData.find(r => r.month === prevMonth && r.year === prevYear);
  const currentSuperTeam = parseFloat(String(currentCashFlow?.superTeamCashFlow || 0));
  const previousSuperTeam = parseFloat(String(previousCashFlow?.superTeamCashFlow || 0));

  function calcChange(current: number, previous: number) {
    const change = current - previous;
    const changePercent = previous > 0 ? Math.round((change / previous) * 100) : (current > 0 ? 100 : 0);
    return { current, previous, change, changePercent };
  }

  return {
    activeAssociates: calcChange(currentActive, previousActive),
    licensedAgents: calcChange(currentLicensed, previousLicensed),
    totalPolicies: calcChange(currentPolicies, previousPolicies),
    familiesProtected: calcChange(currentFamilies, previousFamilies),
    superTeamCashFlow: calcChange(currentSuperTeam, previousSuperTeam),
    totalFaceAmount: calcChange(currentFaceAmount, previousFaceAmount),
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

/**
 * Database Access Layer
 * 
 * This file provides the core database connection and re-exports
 * domain-specific functions from repository modules for backward compatibility.
 * 
 * Architecture:
 * - Core utilities (getDb, user functions) are defined here
 * - Domain-specific functions are delegated to server/repositories/*.ts
 * - All exports maintain backward compatibility with existing imports
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, agents, clients, workflowTasks, productionRecords, 
  credentials, mywfgSyncLogs, inforcePolicies, pendingPolicies, pendingRequirements,
  InsertAgent, InsertClient, InsertWorkflowTask, InsertProductionRecord, 
  InsertCredential, InsertMywfgSyncLog, InsertAgentCashFlowHistory,
  InsertPendingPolicy, InsertPendingRequirement, InsertInforcePolicy,
  InsertMonthlyTeamCashFlow, agentCashFlowHistory, incomeHistory, InsertIncomeHistory
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Import and initialize repositories
import {
  initAgentsRepository,
  initClientsRepository,
  initTasksRepository,
  initDashboardRepository,
  initSyncLogsRepository,
  initPoliciesRepository,
  initIncomeRepository,
} from './repositories';

import { initSyncRunsRepository } from './repositories/syncRuns';

// Re-export types for use in procedures
export type { Agent, Client, WorkflowTask, ProductionRecord, Credential, MywfgSyncLog, AgentCashFlowHistory, SyncLog, InforcePolicy } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _repositoriesInitialized = false;

// ============================================
// Core Database Connection
// ============================================

// Initialize repositories immediately so they can be used even before getDb is called
function initializeRepositories() {
  if (_repositoriesInitialized) return;
  _repositoriesInitialized = true;
  
  initAgentsRepository(getDb);
  initClientsRepository(getDb);
  initTasksRepository(getDb);
  initDashboardRepository(getDb);
  initSyncLogsRepository(getDb);
  initPoliciesRepository(getDb);
  initIncomeRepository(getDb, getDashboardMetrics);
  initSyncRunsRepository(getDb);
}

// Initialize repositories on module load
initializeRepositories();

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

// ============================================
// User Functions (Core - kept in db.ts)
// ============================================

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
    const values: InsertUser = { openId: user.openId };
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
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

// ============================================
// Re-exports from Repository Modules
// ============================================

// Agent functions
export {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  getAgentCashFlowHistory,
  getAllCashFlowRecords,
  getNetLicensedAgents,
  upsertCashFlowRecord,
  bulkUpsertCashFlowRecords,
  clearAllCashFlowRecords,
  getAgentContactInfo,
} from './repositories/agents';

// Client functions
export {
  getClients,
  getClientById,
  createClient,
  updateClient,
  getClientEmailByName,
} from './repositories/clients';

// Task functions
export {
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTask,
  getTaskById,
  completeTask,
  getTaskStats,
} from './repositories/tasks';

// Sync log functions
export {
  createScheduledSyncLog,
  updateScheduledSyncLog,
  getRecentScheduledSyncLogs,
  getScheduledSyncLogsByPeriod,
  getWeeklySyncSummary,
  getScheduledSyncLogs,
  getLatestScheduledSyncLog,
  getTodaySyncLogs,
} from './repositories/syncLogs';

// Policy functions
export {
  getPendingPolicies,
  getPendingPolicyByNumber,
  upsertPendingPolicy,
  getPendingRequirementsByPolicyId,
  clearPendingRequirements,
  insertPendingRequirement,
  bulkInsertPendingRequirements,
  getPendingPoliciesWithRequirements,
  getPendingPolicySummary,
  getInforcePolicies,
  getInforcePolicyByNumber,
  upsertInforcePolicy,
  getProductionSummary,
  getTopProducersByPremium,
  getProductionByWritingAgent,
  getTopAgentsByCommission,
} from './repositories/policies';

// Dashboard functions
export {
  getAgentStats,
  getProductionStats,
  getMonthlyTeamCashFlow,
  upsertMonthlyTeamCashFlow,
  bulkUpsertMonthlyTeamCashFlow,
  getCashFlowTotals,
  getMonthOverMonthComparison,
} from './repositories/dashboard';

// Income functions
export {
  saveIncomeSnapshot,
  updateActualIncome,
  getIncomeHistory,
  getIncomeAccuracyStats,
} from './repositories/income';

// ============================================
// Legacy Functions (kept for compatibility)
// ============================================

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

export async function getAllProductionRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionRecords).orderBy(desc(productionRecords.issueDate));
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

// MyWFG sync log queries (legacy - different from scheduled sync logs)
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

// ============================================
// Dashboard Metrics (Complex - kept in db.ts)
// ============================================

// Calculate projected income based on pending policies and inforce policies
async function calculateProjectedIncome(db: ReturnType<typeof drizzle> | null) {
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
    transamericaConstant: TRANSAMERICA_CONSTANT,
  };
  
  if (!db) return defaultResult;
  
  try {
    const pending = await db.select().from(pendingPolicies);
    const inforce = await db.select().from(inforcePolicies);
    
    const pendingIssued = pending.filter(p => p.status === 'Issued');
    const pendingUnderwriting = pending.filter(p => ['Pending', 'Post Approval Processing'].includes(p.status));
    
    let pendingIssuedIncome = 0;
    let pendingUnderwritingIncome = 0;
    
    pendingIssued.forEach(p => {
      const targetPremium = parseFloat(p.premium?.toString() || '0');
      if (targetPremium > 0) {
        pendingIssuedIncome += targetPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL;
      } else {
        const faceAmount = parseFloat(p.faceAmount?.toString() || '0');
        const estimatedPremium = faceAmount / 1000 * 10;
        pendingIssuedIncome += estimatedPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL;
      }
    });
    
    pendingUnderwriting.forEach(p => {
      const targetPremium = parseFloat(p.premium?.toString() || '0');
      if (targetPremium > 0) {
        pendingUnderwritingIncome += targetPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL * 0.7;
      } else {
        const faceAmount = parseFloat(p.faceAmount?.toString() || '0');
        const estimatedPremium = faceAmount / 1000 * 10;
        pendingUnderwritingIncome += estimatedPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL * 0.7;
      }
    });
    
    const inforceActive = inforce.filter(p => p.status === 'Active');
    const inforceCommission = inforceActive.reduce((sum, p) => {
      return sum + parseFloat(p.calculatedCommission?.toString() || '0');
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
        inforceActive: Math.round(inforceCommission * 100) / 100,
      },
      agentLevel: SMD_AGENT_LEVEL,
      transamericaConstant: TRANSAMERICA_CONSTANT,
    };
  } catch (error) {
    console.error('[calculateProjectedIncome] Error:', error);
    return defaultResult;
  }
}

// Main dashboard metrics function
export async function getDashboardMetrics() {
  const db = await getDb();
  
  const mywfgData = {
    superTeamCashFlow: 319570.24,
    personalCashFlow: 210864.80,
    familiesProtected: 77,
    totalPolicies: 77,
    securitiesLicensed: 0,
  };
  
  let activeAssociates = 0;
  let licensedAgents = 0;
  
  if (db) {
    const agentCounts = await db.select({
      total: sql<number>`COUNT(*)`,
      active: sql<number>`SUM(CASE WHEN ${agents.isActive} = true THEN 1 ELSE 0 END)`,
      licensed: sql<number>`SUM(CASE WHEN ${agents.isLifeLicensed} = true AND ${agents.isActive} = true THEN 1 ELSE 0 END)`,
      inactive: sql<number>`SUM(CASE WHEN ${agents.isActive} = false THEN 1 ELSE 0 END)`,
    }).from(agents);
    
    activeAssociates = Number(agentCounts[0]?.active || 0);
    licensedAgents = Number(agentCounts[0]?.licensed || 0);
  }
  
  let transamericaTotalFaceAmount = 0;
  let transamericaTotalPolicies = 0;
  
  if (db) {
    const inforceSummary = await db.select({
      totalFaceAmount: sql<string>`COALESCE(SUM(${inforcePolicies.faceAmount}), 0)`,
      totalPolicies: sql<number>`COUNT(*)`,
    }).from(inforcePolicies);
    
    transamericaTotalFaceAmount = parseFloat(inforceSummary[0]?.totalFaceAmount || '0');
    transamericaTotalPolicies = Number(inforceSummary[0]?.totalPolicies || 0);
  }
  
  const transamericaData = { totalFaceAmount: transamericaTotalFaceAmount, totalPolicies: transamericaTotalPolicies };
  
  const transamericaAlerts = {
    totalUnreadAlerts: 39,
    reversedPremiumPayments: [
      { policyNumber: '6602249306', ownerName: 'OLUWAMUYIWA ONAMUTI', alertDate: '01/01/2026', alertType: 'Reversed premium payment' },
      { policyNumber: '6602037542', ownerName: 'OLATUNDE OYEWANDE', alertDate: '12/27/2025', alertType: 'Reversed premium payment' },
      { policyNumber: '6602103743', ownerName: 'BEN WALKER', alertDate: '12/25/2025', alertType: 'Reversed premium payment' },
    ],
    eftRemovals: [
      { policyNumber: '6602249306', ownerName: 'OLUWAMUYIWA ONAMUTI', alertDate: '01/01/2026', alertType: 'Policy removed from Electronic Funds Transfer' },
      { policyNumber: '6602122713', ownerName: 'OLUWAKEMISOLA OYEWANDE', alertDate: '01/01/2026', alertType: 'Policy removed from Electronic Funds Transfer' },
    ],
    lastSyncDate: '2026-01-04T23:58:00Z',
  };
  
  const { getNetLicensedAgents } = await import('./repositories/agents');
  const netLicensedData = await getNetLicensedAgents();
  
  const complianceData = {
    missingLicenses: 11,
    notEnrolledRecurring: 15,
    complianceFirstNotice: 3,
    complianceFinalNotice: 3,
    commissionsOnHold: [
      { agentCode: 'C8U78', name: 'STEPHEN MONYE', balance: 45.00, email: 'STEVEN.MONYE@GMAIL.COM' },
      { agentCode: 'D3Y01', name: 'Esther Aikens', balance: 45.00, email: 'estherunba111@gmail.com' },
      { agentCode: 'D3U63', name: 'ESE MOSES', balance: 30.58, email: 'ESEMOSES2001@GMAIL.COM' },
    ],
    firstNoticeAgents: [
      { agentCode: 'D3C5U', name: 'STANLEY EJIME', balance: 30.00, email: 'EJIMSTAN@YAHOO.COM' },
      { agentCode: 'D3C69', name: 'JOY EJIME', balance: 30.00, email: 'JOYEJIME@YAHOO.COM' },
      { agentCode: 'E1U8L', name: 'BUKOLA JUMOKE KOLAWOLE', balance: 30.00, email: 'JUMOK2018@GMAIL.COM' },
    ],
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
    projectedIncome: null as any,
  };

  const faceAmountResult = await db.select({
    totalFaceAmount: sql<string>`COALESCE(SUM(${productionRecords.faceAmount}), 0)`,
    dbPolicies: sql<number>`COUNT(*)`,
  }).from(productionRecords);

  const familiesResult = await db.select({
    dbFamilies: sql<number>`COUNT(DISTINCT CASE WHEN ${clients.householdId} IS NOT NULL THEN ${clients.householdId} ELSE ${clients.id} END)`,
    totalClients: sql<number>`COUNT(*)`,
  }).from(clients);

  const dbPolicies = Number(faceAmountResult[0]?.dbPolicies || 0);
  const dbFamilies = Number(familiesResult[0]?.dbFamilies || 0);
  const dbFaceAmount = parseFloat(faceAmountResult[0]?.totalFaceAmount || '0');
  
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
    projectedIncome: await calculateProjectedIncome(db),
  };
}

// ============================================
// Policy Anniversary Functions
// ============================================

export async function getPolicyAnniversaries(daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const anniversaries = policies
      .filter(policy => policy.issueDate)
      .map(policy => {
        let issueDate: Date;
        const issueDateStr = policy.issueDate as string;
        
        if (issueDateStr.includes('/')) {
          const [month, day, year] = issueDateStr.split('/');
          issueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          issueDate = new Date(issueDateStr);
        }
        
        if (isNaN(issueDate.getTime())) return null;
        
        let anniversaryDate = new Date(currentYear, issueDate.getMonth(), issueDate.getDate());
        if (anniversaryDate < today) {
          anniversaryDate = new Date(currentYear + 1, issueDate.getMonth(), issueDate.getDate());
        }
        
        const daysUntil = Math.ceil((anniversaryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const policyAge = anniversaryDate.getFullYear() - issueDate.getFullYear();
        
        return {
          id: policy.id,
          policyNumber: policy.policyNumber,
          ownerName: policy.ownerName,
          productType: policy.productType,
          faceAmount: parseFloat(policy.faceAmount?.toString() || '0'),
          premium: parseFloat(policy.premium?.toString() || '0'),
          issueDate: issueDateStr,
          anniversaryDate: anniversaryDate.toISOString().split('T')[0],
          daysUntilAnniversary: daysUntil,
          policyAge,
          writingAgentName: policy.writingAgentName,
          writingAgentCode: policy.writingAgentCode,
          status: policy.status,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null && a.daysUntilAnniversary <= daysAhead)
      .sort((a, b) => a.daysUntilAnniversary - b.daysUntilAnniversary);
    
    return anniversaries;
  } catch (error) {
    console.error('[getPolicyAnniversaries] Error:', error);
    return [];
  }
}

export async function getAnniversarySummary() {
  const db = await getDb();
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
      upcomingAnniversaries: thisMonth,
    };
  } catch (error) {
    console.error('[getAnniversarySummary] Error:', error);
    return null;
  }
}

export async function getPoliciesWithAnniversaryInDays(days: number = 7) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);
    
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    
    const matchingPolicies = policies
      .filter(policy => policy.issueDate)
      .filter(policy => {
        let issueDate: Date;
        const issueDateStr = policy.issueDate as string;
        
        if (issueDateStr.includes('/')) {
          const parts = issueDateStr.split('/');
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
      })
      .map(policy => {
        let issueDate: Date;
        const issueDateStr = policy.issueDate as string;
        
        if (issueDateStr.includes('/')) {
          const parts = issueDateStr.split('/');
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
          ownerName: policy.ownerName || 'Unknown',
          anniversaryDate: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          policyAge,
          faceAmount: policy.faceAmount || 0,
          premium: policy.premium || 0,
          productType: policy.productType,
          writingAgentName: policy.writingAgentName,
          writingAgentCode: policy.writingAgentCode,
        };
      });
    
    return matchingPolicies;
  } catch (error) {
    console.error('[getPoliciesWithAnniversaryInDays] Error:', error);
    return [];
  }
}

export async function getPoliciesWithAnniversaryToday() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const currentYear = today.getFullYear();
    
    const todayAnniversaries = policies
      .filter(policy => policy.issueDate)
      .filter(policy => {
        let issueDate: Date;
        const issueDateStr = policy.issueDate as string;
        
        if (issueDateStr.includes('/')) {
          const parts = issueDateStr.split('/');
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
      })
      .map(policy => {
        let issueDate: Date;
        const issueDateStr = policy.issueDate as string;
        
        if (issueDateStr.includes('/')) {
          const parts = issueDateStr.split('/');
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
          ownerName: policy.ownerName || 'Unknown',
          policyAge,
          faceAmount: policy.faceAmount || 0,
          premium: policy.premium || 0,
          productType: policy.productType,
          writingAgentName: policy.writingAgentName,
          writingAgentCode: policy.writingAgentCode,
        };
      })
      .filter(policy => policy.policyAge > 0);
    
    return todayAnniversaries;
  } catch (error) {
    console.error('[getPoliciesWithAnniversaryToday] Error:', error);
    return [];
  }
}

// Anniversary greeting tracking
export async function hasAnniversaryGreetingBeenSent(policyNumber: string, year: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const existingTask = await db.select()
      .from(workflowTasks)
      .where(
        and(
          eq(workflowTasks.taskType, 'POLICY_REVIEW'),
          sql`${workflowTasks.description} LIKE ${`%ANNIVERSARY_GREETING_SENT:${policyNumber}:${year}%`}`
        )
      )
      .limit(1);
    
    return existingTask.length > 0;
  } catch (error) {
    console.error('[hasAnniversaryGreetingBeenSent] Error:', error);
    return false;
  }
}

export async function recordAnniversaryGreetingSent(policyNumber: string, year: number, clientEmail: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    const today = new Date();
    
    await db.insert(workflowTasks).values({
      taskType: 'POLICY_REVIEW',
      dueDate: today,
      description: `ANNIVERSARY_GREETING_SENT:${policyNumber}:${year} - Automated anniversary greeting email sent to ${clientEmail}`,
      priority: 'LOW',
      completedAt: today,
    });
  } catch (error) {
    console.error('[recordAnniversaryGreetingSent] Error:', error);
  }
}

// Re-export CashFlowRecordInput type for compatibility
export type { CashFlowRecordInput } from './repositories/agents';

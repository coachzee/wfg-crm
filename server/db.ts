import { eq, desc, sql, count, sum, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, agents, clients, workflowTasks, productionRecords, credentials, mywfgSyncLogs, agentCashFlowHistory, syncLogs, InsertAgent, InsertClient, InsertWorkflowTask, InsertProductionRecord, InsertCredential, InsertMywfgSyncLog, InsertAgentCashFlowHistory, InsertSyncLog, SyncLog, inforcePolicies, InsertInforcePolicy, InforcePolicy } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Export types for use in procedures
export type { Agent, Client, WorkflowTask, ProductionRecord, Credential, MywfgSyncLog, AgentCashFlowHistory, SyncLog } from "../drizzle/schema";

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

// Calculate projected income based on pending policies and inforce policies
// Uses the WFG commission formula: Target Premium x 125% (Transamerica constant) x Agent Level (65% for SMD)
async function calculateProjectedIncome(db: ReturnType<typeof drizzle> | null) {
  const SMD_AGENT_LEVEL = 0.65; // 65% for SMD and above
  const TRANSAMERICA_CONSTANT = 1.25; // 125%
  
  // Default values if no database
  const defaultResult = {
    fromPendingPolicies: 0,
    fromInforcePolicies: 0,
    totalProjected: 0,
    pendingPoliciesCount: 0,
    inforcePoliciesCount: 0,
    breakdown: {
      pendingIssued: 0,
      pendingUnderwriting: 0,
      inforceActive: 0,
    },
    agentLevel: SMD_AGENT_LEVEL,
    transamericaConstant: TRANSAMERICA_CONSTANT,
  };
  
  if (!db) return defaultResult;
  
  try {
    // Import pending policies table (already imported at bottom of file)
    const { pendingPolicies } = await import("../drizzle/schema");
    
    // Get pending policies with target premium
    const pending = await db.select().from(pendingPolicies);
    
    // Get inforce policies
    const inforce = await db.select().from(inforcePolicies);
    
    // Calculate projected income from pending policies
    // Only count policies that are likely to result in commission (Issued, Pending, Post Approval Processing)
    const pendingIssued = pending.filter(p => p.status === 'Issued');
    const pendingUnderwriting = pending.filter(p => ['Pending', 'Post Approval Processing'].includes(p.status));
    
    // For pending policies, estimate based on target premium if available, otherwise use face amount / 1000 as rough estimate
    let pendingIssuedIncome = 0;
    let pendingUnderwritingIncome = 0;
    
    pendingIssued.forEach(p => {
      // Use premium field (targetPremium is not in schema, premium is the available field)
      const targetPremium = parseFloat(p.premium?.toString() || '0');
      if (targetPremium > 0) {
        pendingIssuedIncome += targetPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL;
      } else {
        // Estimate from face amount (rough approximation: $10 per $1000 face amount for term life)
        const faceAmount = parseFloat(p.faceAmount?.toString() || '0');
        const estimatedPremium = faceAmount / 1000 * 10; // $10 per $1000
        pendingIssuedIncome += estimatedPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL;
      }
    });
    
    pendingUnderwriting.forEach(p => {
      const targetPremium = parseFloat(p.premium?.toString() || '0');
      if (targetPremium > 0) {
        pendingUnderwritingIncome += targetPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL * 0.7; // 70% probability factor
      } else {
        const faceAmount = parseFloat(p.faceAmount?.toString() || '0');
        const estimatedPremium = faceAmount / 1000 * 10;
        pendingUnderwritingIncome += estimatedPremium * TRANSAMERICA_CONSTANT * SMD_AGENT_LEVEL * 0.7;
      }
    });
    
    // Calculate actual commission from inforce policies (already calculated in DB)
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
  
  // Transamerica Life Access data - Zaid Shopeju's Writing Agent Book of Business
  // Extracted on Jan 4, 2026 from Transamerica Life Access portal
  // 52 policies total with Writing agent role filter
  const transamericaData = {
    totalFaceAmount: 26025000, // $26,025,000 total face amount from 52 policies
    totalPolicies: 52, // Writing agent policies (Zaid Shopeju: 73DXR)
  };
  
  // Transamerica Policy Alerts - Unread Notifications (as of Jan 4, 2026)
  // Source: Transamerica Life Access portal - Policy Alerts section
  // These are critical alerts requiring immediate attention
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
  
  // Net Licensed data - fetched dynamically from database
  // Net Licensed = Agent with $1,000+ total cash flow AND title level TA or A
  // Excludes Senior Associate (SA) and above
  // Data is synced from MyWFG Custom Reports - Personal Cash Flow YTD
  const netLicensedData = await getNetLicensedAgents();
  
  // Compliance data from MyWFG reports (as of Jan 4, 2026)
  // Source: Missing Licenses, Platform Fee Recurring, First Notice, Final Notice reports
  const complianceData = {
    missingLicenses: 11, // Missing Licenses and Appointments report (11 state jurisdictions)
    notEnrolledRecurring: 15, // Platform Fee Recurring Enrollment (Recurring = No)
    complianceFirstNotice: 3, // Platform Fee First Notice (Stanley Ejime, Joy Ejime, Bukola Kolawole - $30 each)
    complianceFinalNotice: 3, // Platform Fee Final Notice - Commissions On Hold (Stephen Monye $45, Esther Aikens $45, Ese Moses $30.58)
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
    activeAssociates: mywfgData.activeAssociates,
    licensedAgents: mywfgData.licensedAgents,
    // Compliance metrics
    missingLicenses: complianceData.missingLicenses,
    notEnrolledRecurring: complianceData.notEnrolledRecurring,
    complianceFirstNotice: complianceData.complianceFirstNotice,
    complianceFinalNotice: complianceData.complianceFinalNotice,
    commissionsOnHold: complianceData.commissionsOnHold,
    firstNoticeAgents: complianceData.firstNoticeAgents,
    // Transamerica alerts
    transamericaAlerts: transamericaAlerts,
    // Net Licensed data
    netLicensedData: netLicensedData,
    // Projected income placeholder (will be calculated below)
    projectedIncome: null as any,
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
  
  // Combine Transamerica face amount with any DB entries
  const dbFaceAmount = parseFloat(faceAmountResult[0]?.totalFaceAmount || '0');
  
  return {
    totalFaceAmount: transamericaData.totalFaceAmount + dbFaceAmount,
    totalPolicies: Math.max(mywfgData.totalPolicies + transamericaData.totalPolicies, dbPolicies),
    familiesProtected: Math.max(mywfgData.familiesProtected, dbFamilies),
    totalClients: Number(familiesResult[0]?.totalClients || 0),
    superTeamCashFlow: mywfgData.superTeamCashFlow,
    personalCashFlow: mywfgData.personalCashFlow,
    activeAssociates: mywfgData.activeAssociates,
    licensedAgents: mywfgData.licensedAgents,
    // Compliance metrics
    missingLicenses: complianceData.missingLicenses,
    notEnrolledRecurring: complianceData.notEnrolledRecurring,
    complianceFirstNotice: complianceData.complianceFirstNotice,
    complianceFinalNotice: complianceData.complianceFinalNotice,
    commissionsOnHold: complianceData.commissionsOnHold,
    firstNoticeAgents: complianceData.firstNoticeAgents,
    // Transamerica alerts
    transamericaAlerts: transamericaAlerts,
    // Net Licensed data
    netLicensedData: netLicensedData,
    // Projected income (calculated from pending policies and inforce data)
    projectedIncome: await calculateProjectedIncome(db),
  };
}

// Get all production records with face amount
export async function getAllProductionRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionRecords).orderBy(desc(productionRecords.issueDate));
}


// ============================================
// Agent Cash Flow History - For Net Licensed Tracking
// ============================================

// Get all cash flow records for an agent
export async function getAgentCashFlowHistory(agentCode: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(agentCashFlowHistory)
    .where(eq(agentCashFlowHistory.agentCode, agentCode))
    .orderBy(desc(agentCashFlowHistory.syncedAt));
}

// Get all cash flow records (for Net Licensed calculation)
export async function getAllCashFlowRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentCashFlowHistory).orderBy(desc(agentCashFlowHistory.cumulativeCashFlow));
}

// Get Net Licensed agents (cumulative cash flow >= $1,000 and title TA or A)
export async function getNetLicensedAgents() {
  const db = await getDb();
  if (!db) return { netLicensedAgents: [], notNetLicensedAgents: [], totalNetLicensed: 0 };
  
  // Get all cash flow records
  const allRecords = await db.select().from(agentCashFlowHistory).orderBy(desc(agentCashFlowHistory.cumulativeCashFlow));
  
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
    netLicensedDate: r.netLicensedDate,
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

// Upsert cash flow record (update if exists, insert if not)
export async function upsertCashFlowRecord(data: InsertAgentCashFlowHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if record exists for this agent code
  const existing = await db.select()
    .from(agentCashFlowHistory)
    .where(eq(agentCashFlowHistory.agentCode, data.agentCode))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing record
    return db.update(agentCashFlowHistory)
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
  } else {
    // Insert new record
    const isNetLicensed = parseFloat(data.cumulativeCashFlow?.toString() || '0') >= 1000;
    return db.insert(agentCashFlowHistory).values({
      ...data,
      isNetLicensed,
      netLicensedDate: isNetLicensed ? data.paymentDate : null,
      syncedAt: new Date(),
    });
  }
}

// Simple cash flow record input type (for seeding and API)
export interface CashFlowRecordInput {
  agentCode: string;
  agentName: string;
  titleLevel?: string;
  uplineSMD?: string;
  cashFlowAmount: string;
  cumulativeCashFlow: string;
  paymentDate?: string; // ISO date string
  paymentCycle?: string;
  reportPeriod?: string;
}

// Bulk upsert cash flow records from MyWFG sync
export async function bulkUpsertCashFlowRecords(records: CashFlowRecordInput[]) {
  const results = [];
  for (const record of records) {
    try {
      // Convert string date to Date object if provided
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

// Delete all cash flow records (for full resync)
export async function clearAllCashFlowRecords() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(agentCashFlowHistory);
}


// ==================== SCHEDULED SYNC LOGS ====================

// Create a new scheduled sync log entry
export async function createScheduledSyncLog(data: {
  syncType: 'FULL_SYNC' | 'DOWNLINE_STATUS' | 'CONTACT_INFO' | 'CASH_FLOW' | 'PRODUCTION';
  scheduledTime?: string;
  status?: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  startedAt?: Date;
}): Promise<SyncLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(syncLogs).values({
    syncType: data.syncType,
    scheduledTime: data.scheduledTime,
    status: data.status || 'RUNNING',
    startedAt: data.startedAt || new Date(),
  });
  
  const insertId = Number(result[0].insertId);
  const [syncLog] = await db.select().from(syncLogs).where(eq(syncLogs.id, insertId));
  return syncLog;
}

// Update scheduled sync log with results
export async function updateScheduledSyncLog(id: number, data: {
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  agentsProcessed?: number;
  agentsUpdated?: number;
  agentsCreated?: number;
  contactsUpdated?: number;
  errorsCount?: number;
  errorMessages?: string[];
  summary?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const completedAt = new Date();
  const startedAt = await db.select({ startedAt: syncLogs.startedAt })
    .from(syncLogs)
    .where(eq(syncLogs.id, id))
    .limit(1);
  
  const durationSeconds = startedAt[0]?.startedAt 
    ? Math.round((completedAt.getTime() - startedAt[0].startedAt.getTime()) / 1000)
    : 0;
  
  return db.update(syncLogs)
    .set({
      status: data.status,
      completedAt,
      durationSeconds,
      agentsProcessed: data.agentsProcessed,
      agentsUpdated: data.agentsUpdated,
      agentsCreated: data.agentsCreated,
      contactsUpdated: data.contactsUpdated,
      errorsCount: data.errorsCount,
      errorMessages: data.errorMessages,
      summary: data.summary,
    })
    .where(eq(syncLogs.id, id));
}

// Get recent scheduled sync logs
export async function getRecentScheduledSyncLogs(limit: number = 20): Promise<SyncLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(syncLogs)
    .orderBy(desc(syncLogs.createdAt))
    .limit(limit);
}

// Get scheduled sync logs for a specific time period (for weekly summary)
export async function getScheduledSyncLogsByPeriod(startDate: Date, endDate: Date): Promise<SyncLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(syncLogs)
    .where(sql`${syncLogs.createdAt} >= ${startDate} AND ${syncLogs.createdAt} <= ${endDate}`)
    .orderBy(desc(syncLogs.createdAt));
}

// Get weekly sync summary stats
export async function getWeeklySyncSummary(): Promise<{
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  partialSyncs: number;
  totalAgentsProcessed: number;
  totalAgentsUpdated: number;
  totalContactsUpdated: number;
  totalErrors: number;
  averageDuration: number;
  syncsByTime: { time: string; success: number; failed: number }[];
  recentLogs: SyncLog[];
}> {
  const db = await getDb();
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
      recentLogs: [],
    };
  }
  
  // Get logs from the past 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const logs = await db.select()
    .from(syncLogs)
    .where(sql`${syncLogs.createdAt} >= ${sevenDaysAgo}`)
    .orderBy(desc(syncLogs.createdAt));
  
  const successfulSyncs = logs.filter(l => l.status === 'SUCCESS').length;
  const failedSyncs = logs.filter(l => l.status === 'FAILED').length;
  const partialSyncs = logs.filter(l => l.status === 'PARTIAL').length;
  
  const totalAgentsProcessed = logs.reduce((sum, l) => sum + (l.agentsProcessed || 0), 0);
  const totalAgentsUpdated = logs.reduce((sum, l) => sum + (l.agentsUpdated || 0), 0);
  const totalContactsUpdated = logs.reduce((sum, l) => sum + (l.contactsUpdated || 0), 0);
  const totalErrors = logs.reduce((sum, l) => sum + (l.errorsCount || 0), 0);
  
  const completedLogs = logs.filter(l => l.durationSeconds);
  const averageDuration = completedLogs.length > 0
    ? Math.round(completedLogs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / completedLogs.length)
    : 0;
  
  // Group by scheduled time
  const syncsByTime = [
    { 
      time: '3:30 PM', 
      success: logs.filter(l => l.scheduledTime === '3:30 PM' && l.status === 'SUCCESS').length,
      failed: logs.filter(l => l.scheduledTime === '3:30 PM' && l.status !== 'SUCCESS').length,
    },
    { 
      time: '6:30 PM', 
      success: logs.filter(l => l.scheduledTime === '6:30 PM' && l.status === 'SUCCESS').length,
      failed: logs.filter(l => l.scheduledTime === '6:30 PM' && l.status !== 'SUCCESS').length,
    },
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
    recentLogs: logs.slice(0, 10),
  };
}

// Get paginated scheduled sync logs with filtering
export async function getScheduledSyncLogs(options: {
  page?: number;
  pageSize?: number;
  status?: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  syncType?: 'FULL_SYNC' | 'DOWNLINE_STATUS' | 'CONTACT_INFO' | 'CASH_FLOW' | 'PRODUCTION';
  scheduledTime?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  logs: SyncLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = await getDb();
  if (!db) {
    return { logs: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
  
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  // Build conditions array
  const conditions: any[] = [];
  
  if (options.status) {
    conditions.push(eq(syncLogs.status, options.status));
  }
  if (options.syncType) {
    conditions.push(eq(syncLogs.syncType, options.syncType));
  }
  if (options.scheduledTime) {
    conditions.push(eq(syncLogs.scheduledTime, options.scheduledTime));
  }
  if (options.startDate) {
    conditions.push(sql`${syncLogs.createdAt} >= ${options.startDate}`);
  }
  if (options.endDate) {
    conditions.push(sql`${syncLogs.createdAt} <= ${options.endDate}`);
  }
  
  // Build where clause
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Get total count
  const countResult = await db.select({ count: sql<number>`COUNT(*)` })
    .from(syncLogs)
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);
  
  // Get paginated logs
  const logs = await db.select()
    .from(syncLogs)
    .where(whereClause)
    .orderBy(desc(syncLogs.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Get the latest sync log (most recent)
export async function getLatestScheduledSyncLog(): Promise<SyncLog | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [log] = await db.select()
    .from(syncLogs)
    .orderBy(desc(syncLogs.createdAt))
    .limit(1);
  
  return log || null;
}

// Get sync logs for today
export async function getTodaySyncLogs(): Promise<SyncLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return db.select()
    .from(syncLogs)
    .where(sql`${syncLogs.createdAt} >= ${today} AND ${syncLogs.createdAt} < ${tomorrow}`)
    .orderBy(desc(syncLogs.createdAt));
}


// Pending Policies queries (Transamerica Life Access)
import { pendingPolicies, pendingRequirements, InsertPendingPolicy, InsertPendingRequirement } from "../drizzle/schema";

export async function getPendingPolicies(filters?: { status?: string; agentCode?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  let query: any = db.select().from(pendingPolicies);
  if (filters?.status) {
    query = query.where(eq(pendingPolicies.status, filters.status as any));
  }
  if (filters?.agentCode) {
    query = query.where(eq(pendingPolicies.agentCode, filters.agentCode));
  }
  return query.orderBy(desc(pendingPolicies.updatedAt));
}

export async function getPendingPolicyByNumber(policyNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(pendingPolicies).where(eq(pendingPolicies.policyNumber, policyNumber)).limit(1);
  return result[0] || null;
}

export async function upsertPendingPolicy(data: InsertPendingPolicy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if policy exists
  const existing = await getPendingPolicyByNumber(data.policyNumber);
  
  if (existing) {
    // Update existing policy
    await db.update(pendingPolicies)
      .set({ ...data, lastSyncedAt: new Date() })
      .where(eq(pendingPolicies.policyNumber, data.policyNumber));
    return getPendingPolicyByNumber(data.policyNumber);
  } else {
    // Insert new policy
    const result = await db.insert(pendingPolicies).values({ ...data, lastSyncedAt: new Date() });
    const insertId = (result as any)[0]?.insertId;
    if (!insertId) throw new Error("Failed to insert pending policy");
    const created = await db.select().from(pendingPolicies).where(eq(pendingPolicies.id, insertId)).limit(1);
    return created[0];
  }
}

export async function getPendingRequirementsByPolicyId(policyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pendingRequirements).where(eq(pendingRequirements.policyId, policyId));
}

export async function clearPendingRequirements(policyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pendingRequirements).where(eq(pendingRequirements.policyId, policyId));
}

export async function insertPendingRequirement(data: InsertPendingRequirement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(pendingRequirements).values(data);
}

export async function bulkInsertPendingRequirements(requirements: InsertPendingRequirement[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (requirements.length === 0) return;
  return db.insert(pendingRequirements).values(requirements);
}

export async function getPendingPoliciesWithRequirements() {
  const db = await getDb();
  if (!db) return [];
  
  const policies = await db.select().from(pendingPolicies).orderBy(desc(pendingPolicies.updatedAt));
  
  const policiesWithRequirements = await Promise.all(
    policies.map(async (policy) => {
      const requirements = await getPendingRequirementsByPolicyId(policy.id);
      return {
        ...policy,
        requirements: {
          pendingWithProducer: requirements.filter(r => r.category === "Pending with Producer"),
          pendingWithTransamerica: requirements.filter(r => r.category === "Pending with Transamerica"),
          completed: requirements.filter(r => r.category === "Completed"),
        },
      };
    })
  );
  
  return policiesWithRequirements;
}

export async function getPendingPolicySummary() {
  const db = await getDb();
  if (!db) return { total: 0, byStatus: {}, totalPendingRequirements: 0 };
  
  const policies = await db.select().from(pendingPolicies);
  const requirements = await db.select().from(pendingRequirements);
  
  const byStatus: Record<string, number> = {};
  policies.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });
  
  const pendingWithProducerCount = requirements.filter(r => r.category === "Pending with Producer").length;
  const pendingWithTransamericaCount = requirements.filter(r => r.category === "Pending with Transamerica").length;
  
  return {
    total: policies.length,
    byStatus,
    totalPendingRequirements: pendingWithProducerCount + pendingWithTransamericaCount,
    pendingWithProducerCount,
    pendingWithTransamericaCount,
  };
}


// ============================================
// Inforce Policies (Transamerica Production Data)
// ============================================

// Get all inforce policies
export async function getInforcePolicies(filters?: { status?: string; agentId?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query: any = db.select().from(inforcePolicies);
  if (filters?.status) {
    query = query.where(eq(inforcePolicies.status, filters.status as any));
  }
  if (filters?.agentId) {
    query = query.where(eq(inforcePolicies.agentId, filters.agentId));
  }
  return query.orderBy(desc(inforcePolicies.updatedAt));
}

// Get inforce policy by policy number
export async function getInforcePolicyByNumber(policyNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(inforcePolicies).where(eq(inforcePolicies.policyNumber, policyNumber)).limit(1);
  return result[0] || null;
}

// Upsert inforce policy
export async function upsertInforcePolicy(data: InsertInforcePolicy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getInforcePolicyByNumber(data.policyNumber);
  
  if (existing) {
    await db.update(inforcePolicies)
      .set({ ...data, lastSyncedAt: new Date() })
      .where(eq(inforcePolicies.policyNumber, data.policyNumber));
    return getInforcePolicyByNumber(data.policyNumber);
  } else {
    const result = await db.insert(inforcePolicies).values({ ...data, lastSyncedAt: new Date() });
    const insertId = (result as any)[0]?.insertId;
    if (!insertId) throw new Error("Failed to insert inforce policy");
    const created = await db.select().from(inforcePolicies).where(eq(inforcePolicies.id, insertId)).limit(1);
    return created[0];
  }
}

// Get production summary (for dashboard)
export async function getProductionSummary() {
  const db = await getDb();
  if (!db) return {
    totalPolicies: 0,
    activePolicies: 0,
    totalPremium: 0,
    totalCommission: 0,
    totalFaceAmount: 0,
    byStatus: {},
  };
  
  const policies = await db.select().from(inforcePolicies);
  
  const activePolicies = policies.filter(p => p.status === 'Active');
  const totalPremium = policies.reduce((sum, p) => sum + parseFloat(p.premium?.toString() || '0'), 0);
  const totalCommission = policies.reduce((sum, p) => sum + parseFloat(p.calculatedCommission?.toString() || '0'), 0);
  const totalFaceAmount = policies.reduce((sum, p) => sum + parseFloat(p.faceAmount?.toString() || '0'), 0);
  
  const byStatus: Record<string, number> = {};
  policies.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });
  
  return {
    totalPolicies: policies.length,
    activePolicies: activePolicies.length,
    totalPremium,
    totalCommission,
    totalFaceAmount,
    byStatus,
  };
}

// Get top producers by premium
export async function getTopProducersByPremium(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  
  // Group by owner name and sum premiums
  const producerMap = new Map<string, { name: string; totalPremium: number; totalCommission: number; policyCount: number; totalFaceAmount: number }>();
  
  for (const policy of policies) {
    const name = policy.ownerName;
    const existing = producerMap.get(name) || { name, totalPremium: 0, totalCommission: 0, policyCount: 0, totalFaceAmount: 0 };
    existing.totalPremium += parseFloat(policy.premium?.toString() || '0');
    existing.totalCommission += parseFloat(policy.calculatedCommission?.toString() || '0');
    existing.totalFaceAmount += parseFloat(policy.faceAmount?.toString() || '0');
    existing.policyCount += 1;
    producerMap.set(name, existing);
  }
  
  // Sort by total premium and return top N
  return Array.from(producerMap.values())
    .sort((a, b) => b.totalPremium - a.totalPremium)
    .slice(0, limit);
}

// Get production by writing agent (for agent-level tracking)
export async function getProductionByWritingAgent() {
  const db = await getDb();
  if (!db) return [];
  
  const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  
  // Group by writing agent
  const agentMap = new Map<string, { name: string; totalPremium: number; totalCommission: number; policyCount: number }>();
  
  for (const policy of policies) {
    const name = policy.writingAgentName || 'Unknown';
    const existing = agentMap.get(name) || { name, totalPremium: 0, totalCommission: 0, policyCount: 0 };
    existing.totalPremium += parseFloat(policy.premium?.toString() || '0');
    existing.totalCommission += parseFloat(policy.calculatedCommission?.toString() || '0');
    existing.policyCount += 1;
    agentMap.set(name, existing);
  }
  
  return Array.from(agentMap.values())
    .sort((a, b) => b.totalPremium - a.totalPremium);
}

// Get top agents by commission (includes split agent commissions)
export async function getTopAgentsByCommission(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  
  // Group by agent (both primary and secondary) and sum their commissions
  const agentMap = new Map<string, { 
    name: string; 
    agentCode: string;
    totalCommission: number; 
    totalPremium: number;
    policyCount: number;
    avgCommissionLevel: number;
    commissionLevelSum: number;
  }>();
  
  for (const policy of policies) {
    const targetPremium = parseFloat(policy.targetPremium?.toString() || policy.premium?.toString() || '0');
    const multiplier = 1.25;
    
    // Primary agent
    const primaryName = policy.writingAgentName || 'Unknown';
    const primaryCode = policy.writingAgentCode || '';
    const primarySplit = Number(policy.writingAgentSplit) || 100;
    const primaryLevel = Number(policy.writingAgentLevel) || 55;
    const primaryCommission = targetPremium * multiplier * (primaryLevel / 100) * (primarySplit / 100);
    
    const existingPrimary = agentMap.get(primaryName) || { 
      name: primaryName, 
      agentCode: primaryCode,
      totalCommission: 0, 
      totalPremium: 0, 
      policyCount: 0,
      avgCommissionLevel: 0,
      commissionLevelSum: 0
    };
    existingPrimary.totalCommission += primaryCommission;
    existingPrimary.totalPremium += targetPremium * (primarySplit / 100);
    existingPrimary.policyCount += 1;
    existingPrimary.commissionLevelSum += Number(primaryLevel);
    existingPrimary.avgCommissionLevel = existingPrimary.commissionLevelSum / existingPrimary.policyCount;
    if (!existingPrimary.agentCode && primaryCode) {
      existingPrimary.agentCode = primaryCode;
    }
    agentMap.set(primaryName, existingPrimary);
    
    // Secondary agent (if split)
    if (policy.secondAgentName && policy.secondAgentSplit && policy.secondAgentSplit > 0) {
      const secondaryName = policy.secondAgentName;
      const secondaryCode = policy.secondAgentCode || '';
      const secondarySplit = Number(policy.secondAgentSplit);
      const secondaryLevel = Number(policy.secondAgentLevel) || 25;
      const secondaryCommission = targetPremium * multiplier * (secondaryLevel / 100) * (secondarySplit / 100);
      
      const existingSecondary = agentMap.get(secondaryName) || { 
        name: secondaryName, 
        agentCode: secondaryCode,
        totalCommission: 0, 
        totalPremium: 0, 
        policyCount: 0,
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
  
  return Array.from(agentMap.values())
    .sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, limit);
}

export type { InforcePolicy };

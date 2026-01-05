import { eq, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, agents, clients, workflowTasks, productionRecords, credentials, mywfgSyncLogs, agentCashFlowHistory, InsertAgent, InsertClient, InsertWorkflowTask, InsertProductionRecord, InsertCredential, InsertMywfgSyncLog, InsertAgentCashFlowHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Export types for use in procedures
export type { Agent, Client, WorkflowTask, ProductionRecord, Credential, MywfgSyncLog, AgentCashFlowHistory } from "../drizzle/schema";

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

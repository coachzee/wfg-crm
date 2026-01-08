/**
 * MyWFG Sync Data Storage
 * 
 * This module stores the extracted MyWFG data that can be updated periodically.
 * Since MyWFG requires OTP authentication, fully automated sync isn't possible.
 * 
 * Data is stored in the database and can be refreshed via:
 * 1. Manual sync through the UI (user provides OTP)
 * 2. Scheduled reminders to prompt user to sync
 */

import { getDb } from "./db";
import { mywfgSyncLogs } from "../drizzle/schema";
import { desc, sql } from "drizzle-orm";

// Cached MyWFG data structure
export interface MyWFGCachedData {
  // Cash Flow Data
  personalCashFlow: number;
  superTeamCashFlow: number;
  baseCashFlow: number;
  superBaseCashFlow: number;
  
  // Monthly breakdown
  monthlyCashFlow: Array<{
    month: string;
    year: number;
    personal: number;
    superTeam: number;
  }>;
  
  // Policy Data
  totalPolicies: number;
  familiesProtected: number;
  policies: Array<{
    policyNumber: string;
    company: string;
    customerName: string;
    commissionAmount: number;
    issueDate?: string;
  }>;
  
  // Team Data
  activeAssociates: number;
  lifeLicensedAssociates: number;
  securitiesLicensedAssociates: number;
  
  // Key Metrics
  personalPoints: number;
  personalRecruits: number;
  netRecruits: number;
  
  // Sync metadata
  lastSyncDate: Date;
  syncSource: string;
  agentCode: string;
  agentName: string;
}

// Default data from MyWFG exploration (Jan 4, 2026)
// This serves as the baseline until user performs a manual sync
const DEFAULT_MYWFG_DATA: MyWFGCachedData = {
  // Cash Flow Data (from Total Cash Flow report - Super Team)
  personalCashFlow: 189931.39,
  superTeamCashFlow: 290099.22,
  baseCashFlow: 0, // Not yet extracted
  superBaseCashFlow: 0, // Not yet extracted
  
  // Monthly breakdown (from Total Cash Flow report)
  monthlyCashFlow: [
    { month: "January", year: 2025, personal: 2948.93, superTeam: 3905.84 },
    { month: "February", year: 2025, personal: 1657.80, superTeam: 3092.63 },
    { month: "March", year: 2025, personal: 4025.81, superTeam: 5496.92 },
    { month: "April", year: 2025, personal: 5890.65, superTeam: 6830.54 },
    { month: "May", year: 2025, personal: 6820.06, superTeam: 8168.29 },
    { month: "June", year: 2025, personal: 22868.80, superTeam: 35120.41 },
    { month: "July", year: 2025, personal: 31870.48, superTeam: 31508.35 },
    { month: "August", year: 2025, personal: 15194.60, superTeam: 22343.85 },
    { month: "September", year: 2025, personal: 11350.79, superTeam: 20779.43 },
    { month: "October", year: 2025, personal: 24129.16, superTeam: 62300.19 },
    { month: "November", year: 2025, personal: 48242.63, superTeam: 66160.33 },
    { month: "December", year: 2025, personal: 14931.68, superTeam: 23392.44 },
  ],
  
  // Policy Data (from Commissions Summary report)
  totalPolicies: 77,
  familiesProtected: 77, // Each policy = 1 family
  policies: [], // Individual policies stored separately
  
  // Team Data (from MY BUSINESS dashboard)
  activeAssociates: 91,
  lifeLicensedAssociates: 27,
  securitiesLicensedAssociates: 0,
  
  // Key Metrics (from MY BUSINESS dashboard)
  personalPoints: 12760,
  personalRecruits: 3,
  netRecruits: 0,
  
  // Sync metadata
  lastSyncDate: new Date("2026-01-04T19:00:00Z"),
  syncSource: "manual_exploration",
  agentCode: "73DXR",
  agentName: "ZAID SHOPEJU",
};

// In-memory cache
let cachedData: MyWFGCachedData = { ...DEFAULT_MYWFG_DATA };

/**
 * Get the current cached MyWFG data
 */
export function getCachedMyWFGData(): MyWFGCachedData {
  return { ...cachedData };
}

/**
 * Update the cached MyWFG data
 */
export function updateCachedMyWFGData(newData: Partial<MyWFGCachedData>): void {
  cachedData = {
    ...cachedData,
    ...newData,
    lastSyncDate: new Date(),
  };
}

/**
 * Get dashboard metrics from cached data
 */
export function getDashboardMetricsFromCache() {
  return {
    totalFaceAmount: 0, // Not available from MyWFG
    totalPolicies: cachedData.totalPolicies,
    familiesProtected: cachedData.familiesProtected,
    totalClients: cachedData.familiesProtected,
    superTeamCashFlow: cachedData.superTeamCashFlow,
    personalCashFlow: cachedData.personalCashFlow,
    personalPoints: cachedData.personalPoints,
    activeAssociates: cachedData.activeAssociates,
    lifeLicensedAssociates: cachedData.lifeLicensedAssociates,
    lastSyncDate: cachedData.lastSyncDate,
  };
}

/**
 * Get monthly cash flow data for charts
 */
export function getMonthlyCashFlowData() {
  return cachedData.monthlyCashFlow.map(m => ({
    month: `${m.month.substring(0, 3)} ${m.year}`,
    personal: m.personal,
    superTeam: m.superTeam,
  }));
}

/**
 * Calculate sync status
 */
export function getSyncStatus(): {
  isStale: boolean;
  hoursSinceSync: number;
  lastSyncDate: Date;
  nextSyncRecommended: Date;
} {
  const now = new Date();
  const hoursSinceSync = Math.floor(
    (now.getTime() - cachedData.lastSyncDate.getTime()) / (1000 * 60 * 60)
  );
  
  // Data is considered stale after 6 hours
  const isStale = hoursSinceSync >= 6;
  
  // Next sync recommended 6 hours after last sync
  const nextSyncRecommended = new Date(cachedData.lastSyncDate.getTime() + 6 * 60 * 60 * 1000);
  
  return {
    isStale,
    hoursSinceSync,
    lastSyncDate: cachedData.lastSyncDate,
    nextSyncRecommended,
  };
}

/**
 * Log a sync attempt to the database
 */
export async function logSyncAttempt(
  status: "SUCCESS" | "FAILED" | "PENDING_OTP",
  recordsProcessed: number,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[MyWFG Sync] Cannot log sync: database not available");
    return;
  }
  
  try {
    await db.insert(mywfgSyncLogs).values({
      syncDate: new Date(),
      status,
      recordsProcessed,
      errorMessage,
    });
  } catch (error) {
    console.error("[MyWFG Sync] Failed to log sync attempt:", error);
  }
}

/**
 * Get recent sync logs
 */
export async function getRecentSyncLogs(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const logs = await db
      .select()
      .from(mywfgSyncLogs)
      .orderBy(desc(mywfgSyncLogs.syncDate))
      .limit(limit);
    return logs;
  } catch (error) {
    console.error("[MyWFG Sync] Failed to get sync logs:", error);
    return [];
  }
}

/**
 * Payment cycle information
 * WFG pays 9 times per month on Tuesdays and Fridays
 */
export function getPaymentCycleInfo(): {
  nextPaymentDate: Date;
  paymentDaysThisMonth: Date[];
  isPayDay: boolean;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Find all Tuesdays and Fridays in the current month
  const paymentDays: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    // Tuesday = 2, Friday = 5
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      paymentDays.push(date);
    }
  }
  
  // Find next payment date
  const today = new Date(year, month, now.getDate());
  let nextPaymentDate = paymentDays.find(d => d >= today) || paymentDays[0];
  
  // If no more payment days this month, get first of next month
  if (!nextPaymentDate || nextPaymentDate < today) {
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
    
    for (let day = 1; day <= 7; day++) {
      const date = new Date(nextYear, adjustedMonth, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 2 || dayOfWeek === 5) {
        nextPaymentDate = date;
        break;
      }
    }
  }
  
  // Check if today is a pay day
  const isPayDay = paymentDays.some(
    d => d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  );
  
  return {
    nextPaymentDate: nextPaymentDate!,
    paymentDaysThisMonth: paymentDays,
    isPayDay,
  };
}

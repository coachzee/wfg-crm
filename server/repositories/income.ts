/**
 * Income Repository
 * 
 * Database operations for income tracking including:
 * - Income snapshots (projected vs actual)
 * - Income history for charting
 * - Accuracy statistics
 */

import { eq, and, sql, desc } from "drizzle-orm";
import { incomeHistory, InsertIncomeHistory } from "../../drizzle/schema";
import { logger } from "../_core/logger";

let _getDb: () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;
let _getDashboardMetrics: () => Promise<any>;

export function initIncomeRepository(
  getDb: typeof _getDb,
  getDashboardMetrics: typeof _getDashboardMetrics
) {
  _getDb = getDb;
  _getDashboardMetrics = getDashboardMetrics;
}

// Save a daily income snapshot (called during sync or manually)
export async function saveIncomeSnapshot() {
  const db = await _getDb();
  if (!db) return null;
  
  try {
    const metrics = await _getDashboardMetrics();
    const projectedIncome = metrics.projectedIncome;
    
    if (!projectedIncome) {
      logger.warn('[saveIncomeSnapshot] No projected income data available');
      return null;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingSnapshot = await db.select()
      .from(incomeHistory)
      .where(and(
        sql`${incomeHistory.snapshotDate} >= ${today}`,
        sql`${incomeHistory.snapshotDate} < ${tomorrow}`
      ))
      .limit(1);
    
    const snapshotData: InsertIncomeHistory = {
      snapshotDate: new Date(),
      projectedTotal: projectedIncome.totalProjected.toString(),
      projectedFromPending: projectedIncome.fromPendingPolicies.toString(),
      projectedFromInforce: projectedIncome.fromInforcePolicies.toString(),
      projectedPendingIssued: projectedIncome.breakdown.pendingIssued.toString(),
      projectedPendingUnderwriting: projectedIncome.breakdown.pendingUnderwriting.toString(),
      projectedInforceActive: projectedIncome.breakdown.inforceActive.toString(),
      pendingPoliciesCount: projectedIncome.pendingPoliciesCount,
      inforcePoliciesCount: projectedIncome.inforcePoliciesCount,
      agentLevel: projectedIncome.agentLevel.toString(),
      transamericaConstant: projectedIncome.transamericaConstant.toString(),
    };
    
    if (existingSnapshot.length > 0) {
      await db.update(incomeHistory)
        .set(snapshotData)
        .where(eq(incomeHistory.id, existingSnapshot[0].id));
      return existingSnapshot[0].id;
    } else {
      const result = await db.insert(incomeHistory).values(snapshotData);
      return (result as any)[0]?.insertId;
    }
  } catch (error) {
    logger.error('[saveIncomeSnapshot] Error', error instanceof Error ? error : undefined);
    return null;
  }
}

// Update actual income for a specific date
export async function updateActualIncome(date: Date, actualIncome: number, source: string) {
  const db = await _getDb();
  if (!db) return false;
  
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    await db.update(incomeHistory)
      .set({
        actualIncome: actualIncome.toString(),
        actualIncomeSource: source,
        actualIncomeUpdatedAt: new Date(),
      })
      .where(and(
        sql`${incomeHistory.snapshotDate} >= ${startOfDay}`,
        sql`${incomeHistory.snapshotDate} < ${endOfDay}`
      ));
    
    return true;
  } catch (error) {
    logger.error('[updateActualIncome] Error', error instanceof Error ? error : undefined);
    return false;
  }
}

// Get income history for charting
export async function getIncomeHistory(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  const db = await _getDb();
  if (!db) return [];
  
  try {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const history = await db.select()
      .from(incomeHistory)
      .where(sql`${incomeHistory.snapshotDate} >= ${startDate}`)
      .orderBy(incomeHistory.snapshotDate);
    
    return history.map(h => ({
      date: h.snapshotDate,
      projectedTotal: parseFloat(h.projectedTotal?.toString() || '0'),
      projectedFromPending: parseFloat(h.projectedFromPending?.toString() || '0'),
      projectedFromInforce: parseFloat(h.projectedFromInforce?.toString() || '0'),
      actualIncome: parseFloat(h.actualIncome?.toString() || '0'),
      pendingPoliciesCount: h.pendingPoliciesCount || 0,
      inforcePoliciesCount: h.inforcePoliciesCount || 0,
      accuracy: h.actualIncome && parseFloat(h.actualIncome.toString()) > 0
        ? Math.round((parseFloat(h.actualIncome.toString()) / parseFloat(h.projectedTotal?.toString() || '1')) * 100)
        : null,
    }));
  } catch (error) {
    logger.error('[getIncomeHistory] Error', error instanceof Error ? error : undefined);
    return [];
  }
}

// Get income accuracy statistics
export async function getIncomeAccuracyStats() {
  const db = await _getDb();
  if (!db) return null;
  
  try {
    const history = await db.select()
      .from(incomeHistory)
      .where(sql`${incomeHistory.actualIncome} > 0`);
    
    if (history.length === 0) {
      return {
        totalSnapshots: 0,
        snapshotsWithActual: 0,
        averageAccuracy: null,
        totalProjected: 0,
        totalActual: 0,
      };
    }
    
    let totalProjected = 0;
    let totalActual = 0;
    let accuracySum = 0;
    
    for (const h of history) {
      const projected = parseFloat(h.projectedTotal?.toString() || '0');
      const actual = parseFloat(h.actualIncome?.toString() || '0');
      totalProjected += projected;
      totalActual += actual;
      if (projected > 0) {
        accuracySum += (actual / projected) * 100;
      }
    }
    
    const allSnapshots = await db.select({ count: sql<number>`COUNT(*)` }).from(incomeHistory);
    
    return {
      totalSnapshots: allSnapshots[0]?.count || 0,
      snapshotsWithActual: history.length,
      averageAccuracy: Math.round(accuracySum / history.length),
      totalProjected: Math.round(totalProjected * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
    };
  } catch (error) {
    logger.error('[getIncomeAccuracyStats] Error', error instanceof Error ? error : undefined);
    return null;
  }
}

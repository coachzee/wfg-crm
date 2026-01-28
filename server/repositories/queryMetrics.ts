/**
 * Query Metrics Repository
 * 
 * Handles storing and retrieving query performance metrics history
 */

import { eq, desc, gte, lte, and } from "drizzle-orm";
import { getDb } from "../db";
import { queryMetricsHistory, type InsertQueryMetricsHistory, type QueryMetricsHistory } from "../../drizzle/schema";
import { getQueryMetrics, resetQueryMetrics, getSlowQueries } from "../db-logger";

/**
 * Save a snapshot of current query metrics
 */
export async function saveMetricsSnapshot(
  periodType: "HOURLY" | "DAILY" | "WEEKLY" = "HOURLY"
): Promise<QueryMetricsHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const metricsResponse = getQueryMetrics();
  const stats = metricsResponse.stats;
  const slowQueries = getSlowQueries(5);
  const now = new Date();
  
  // Calculate period start based on type
  let periodStart: Date;
  const periodEnd = now;
  
  switch (periodType) {
    case "HOURLY":
      periodStart = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "DAILY":
      periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "WEEKLY":
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }
  
  // Calculate max and min from recent queries
  const recentQueries = metricsResponse.recentQueries;
  const durations = recentQueries.map(q => q.duration);
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  
  const insertData: InsertQueryMetricsHistory = {
    snapshotAt: now,
    totalQueries: stats.totalQueries,
    totalDurationMs: String(stats.totalDuration),
    avgDurationMs: String(stats.avgDuration.toFixed(2)),
    maxDurationMs: String(maxDuration),
    minDurationMs: String(minDuration),
    selectCount: stats.queriesByType['SELECT'] || 0,
    insertCount: stats.queriesByType['INSERT'] || 0,
    updateCount: stats.queriesByType['UPDATE'] || 0,
    deleteCount: stats.queriesByType['DELETE'] || 0,
    otherCount: stats.queriesByType['OTHER'] || 0,
    slowQueryCount: stats.slowQueries,
    failedQueryCount: stats.failedQueries,
    slowQueries: slowQueries.map(q => ({
      query: q.query,
      duration: q.duration,
      timestamp: q.timestamp.toISOString(),
    })),
    periodType,
    periodStart,
    periodEnd,
  };
  
  await db.insert(queryMetricsHistory).values(insertData);
  
  // Return the inserted record
  const [result] = await db
    .select()
    .from(queryMetricsHistory)
    .orderBy(desc(queryMetricsHistory.id))
    .limit(1);
  
  return result;
}

/**
 * Save snapshot and reset metrics (for periodic snapshots)
 */
export async function saveAndResetMetrics(
  periodType: "HOURLY" | "DAILY" | "WEEKLY" = "HOURLY"
): Promise<QueryMetricsHistory> {
  const snapshot = await saveMetricsSnapshot(periodType);
  resetQueryMetrics();
  return snapshot;
}

/**
 * Get metrics history with optional filters
 */
export async function getMetricsHistory(options?: {
  periodType?: "HOURLY" | "DAILY" | "WEEKLY";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<QueryMetricsHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const conditions = [];
  
  if (options?.periodType) {
    conditions.push(eq(queryMetricsHistory.periodType, options.periodType));
  }
  
  if (options?.startDate) {
    conditions.push(gte(queryMetricsHistory.snapshotAt, options.startDate));
  }
  
  if (options?.endDate) {
    conditions.push(lte(queryMetricsHistory.snapshotAt, options.endDate));
  }
  
  let query = db
    .select()
    .from(queryMetricsHistory)
    .orderBy(desc(queryMetricsHistory.snapshotAt));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  
  return query;
}

/**
 * Get the latest metrics snapshot
 */
export async function getLatestSnapshot(): Promise<QueryMetricsHistory | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const [result] = await db
    .select()
    .from(queryMetricsHistory)
    .orderBy(desc(queryMetricsHistory.snapshotAt))
    .limit(1);
  
  return result || null;
}

/**
 * Get aggregated metrics for a time range
 */
export async function getAggregatedMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalQueries: number;
  avgDuration: number;
  slowQueries: number;
  failedQueries: number;
  snapshotCount: number;
}> {
  const snapshots = await getMetricsHistory({
    startDate,
    endDate,
  });
  
  if (snapshots.length === 0) {
    return {
      totalQueries: 0,
      avgDuration: 0,
      slowQueries: 0,
      failedQueries: 0,
      snapshotCount: 0,
    };
  }
  
  const totals = snapshots.reduce(
    (acc, s) => ({
      totalQueries: acc.totalQueries + s.totalQueries,
      totalDuration: acc.totalDuration + Number(s.totalDurationMs),
      slowQueries: acc.slowQueries + s.slowQueryCount,
      failedQueries: acc.failedQueries + s.failedQueryCount,
    }),
    { totalQueries: 0, totalDuration: 0, slowQueries: 0, failedQueries: 0 }
  );
  
  return {
    totalQueries: totals.totalQueries,
    avgDuration: totals.totalQueries > 0 ? totals.totalDuration / totals.totalQueries : 0,
    slowQueries: totals.slowQueries,
    failedQueries: totals.failedQueries,
    snapshotCount: snapshots.length,
  };
}

/**
 * Delete old metrics snapshots (for cleanup)
 */
export async function deleteOldSnapshots(olderThan: Date): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const result = await db
    .delete(queryMetricsHistory)
    .where(lte(queryMetricsHistory.snapshotAt, olderThan));
  
  return (result as any).rowsAffected || 0;
}

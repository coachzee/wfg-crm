/**
 * Sync Logs Repository
 * 
 * Database operations for sync log management including:
 * - Creating and updating sync logs
 * - Querying sync history
 * - Weekly sync summaries
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { syncLogs, InsertSyncLog, SyncLog } from "../../drizzle/schema";
import { logger } from "../_core/logger";

// Re-export types
export type { SyncLog } from "../../drizzle/schema";

// Import getDb from parent - will be injected
let _getDb: () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;

export function initSyncLogsRepository(getDb: typeof _getDb) {
  _getDb = getDb;
}

export async function createScheduledSyncLog(data: {
  syncType: 'FULL_SYNC' | 'DOWNLINE_STATUS' | 'CONTACT_INFO' | 'CASH_FLOW' | 'PRODUCTION';
  scheduledTime?: string;
  status?: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  startedAt?: Date;
}): Promise<SyncLog> {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Creating sync log", { syncType: data.syncType });
  
  const result = await db.insert(syncLogs).values({
    syncType: data.syncType,
    scheduledTime: data.scheduledTime,
    status: data.status || 'RUNNING',
    startedAt: data.startedAt || new Date(),
  });
  
  const insertId = Number((result as any)[0].insertId);
  const [syncLog] = await db.select().from(syncLogs).where(eq(syncLogs.id, insertId));
  return syncLog;
}

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
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Updating sync log", { syncLogId: id, status: data.status });
  
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

export async function getRecentScheduledSyncLogs(limit: number = 20): Promise<SyncLog[]> {
  const db = await _getDb();
  if (!db) return [];
  
  logger.debug("Fetching recent sync logs", { limit });
  return db.select()
    .from(syncLogs)
    .orderBy(desc(syncLogs.createdAt))
    .limit(limit);
}

export async function getScheduledSyncLogsByPeriod(startDate: Date, endDate: Date): Promise<SyncLog[]> {
  const db = await _getDb();
  if (!db) return [];
  
  logger.debug("Fetching sync logs by period", { startDate, endDate });
  return db.select()
    .from(syncLogs)
    .where(sql`${syncLogs.createdAt} >= ${startDate} AND ${syncLogs.createdAt} <= ${endDate}`)
    .orderBy(desc(syncLogs.createdAt));
}

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
  const db = await _getDb();
  if (!db) {
    return {
      totalSyncs: 0, successfulSyncs: 0, failedSyncs: 0, partialSyncs: 0,
      totalAgentsProcessed: 0, totalAgentsUpdated: 0, totalContactsUpdated: 0,
      totalErrors: 0, averageDuration: 0, syncsByTime: [], recentLogs: [],
    };
  }
  
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
    totalSyncs: logs.length, successfulSyncs, failedSyncs, partialSyncs,
    totalAgentsProcessed, totalAgentsUpdated, totalContactsUpdated,
    totalErrors, averageDuration, syncsByTime, recentLogs: logs.slice(0, 10),
  };
}

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
  const db = await _getDb();
  if (!db) {
    return { logs: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
  
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  const conditions: any[] = [];
  if (options.status) conditions.push(eq(syncLogs.status, options.status));
  if (options.syncType) conditions.push(eq(syncLogs.syncType, options.syncType));
  if (options.scheduledTime) conditions.push(eq(syncLogs.scheduledTime, options.scheduledTime));
  if (options.startDate) conditions.push(sql`${syncLogs.createdAt} >= ${options.startDate}`);
  if (options.endDate) conditions.push(sql`${syncLogs.createdAt} <= ${options.endDate}`);
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const countResult = await db.select({ count: sql<number>`COUNT(*)` })
    .from(syncLogs)
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);
  
  const logs = await db.select()
    .from(syncLogs)
    .where(whereClause)
    .orderBy(desc(syncLogs.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getLatestScheduledSyncLog(): Promise<SyncLog | null> {
  const db = await _getDb();
  if (!db) return null;
  
  const [log] = await db.select()
    .from(syncLogs)
    .orderBy(desc(syncLogs.createdAt))
    .limit(1);
  
  return log || null;
}

export async function getTodaySyncLogs(): Promise<SyncLog[]> {
  const db = await _getDb();
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

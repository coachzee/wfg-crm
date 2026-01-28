/**
 * Sync Runs Repository
 * 
 * Tracks sync job execution history for monitoring and debugging.
 */

import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { syncRuns, InsertSyncRun, SyncRun } from "../../drizzle/schema";

type DbGetter = () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;

let _getDb: DbGetter;

export function initSyncRunsRepository(getDb: DbGetter) {
  _getDb = getDb;
}

function getDb() {
  if (!_getDb) {
    throw new Error("SyncRuns repository not initialized. Call initSyncRunsRepository first.");
  }
  return _getDb();
}

/**
 * Create a new sync run record.
 */
export async function createSyncRun(data: {
  id: string;
  jobName: string;
  triggeredBy?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(syncRuns).values({
    id: data.id,
    jobName: data.jobName,
    status: "running",
    triggeredBy: data.triggeredBy ?? "unknown",
  });
}

/**
 * Mark a sync run as completed (success or failed).
 */
export async function finishSyncRun(data: {
  id: string;
  status: "success" | "failed" | "cancelled";
  durationMs: number;
  errorSummary?: string;
  metrics?: Record<string, unknown>;
  artifactsPath?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(syncRuns)
    .set({
      status: data.status,
      finishedAt: new Date(),
      durationMs: data.durationMs,
      errorSummary: data.errorSummary,
      metrics: data.metrics,
      artifactsPath: data.artifactsPath,
    })
    .where(eq(syncRuns.id, data.id));
}

/**
 * Get recent sync runs for a job.
 */
export async function getRecentSyncRuns(
  jobName: string,
  limit: number = 20
): Promise<SyncRun[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(syncRuns)
    .where(eq(syncRuns.jobName, jobName))
    .orderBy(desc(syncRuns.startedAt))
    .limit(limit);
}

/**
 * Get all recent sync runs across all jobs.
 */
export async function getAllRecentSyncRuns(limit: number = 50): Promise<SyncRun[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(syncRuns)
    .orderBy(desc(syncRuns.startedAt))
    .limit(limit);
}

/**
 * Get sync run by ID.
 */
export async function getSyncRunById(id: string): Promise<SyncRun | null> {
  const db = await getDb();
  if (!db) return null;

  const runs = await db
    .select()
    .from(syncRuns)
    .where(eq(syncRuns.id, id))
    .limit(1);

  return runs[0] ?? null;
}

/**
 * Get sync runs in a date range.
 */
export async function getSyncRunsInRange(
  startDate: Date,
  endDate: Date,
  jobName?: string
): Promise<SyncRun[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    gte(syncRuns.startedAt, startDate),
    lte(syncRuns.startedAt, endDate),
  ];

  if (jobName) {
    conditions.push(eq(syncRuns.jobName, jobName));
  }

  return db
    .select()
    .from(syncRuns)
    .where(and(...conditions))
    .orderBy(desc(syncRuns.startedAt));
}

/**
 * Get sync run statistics.
 */
export async function getSyncRunStats(jobName?: string): Promise<{
  totalRuns: number;
  successCount: number;
  failedCount: number;
  avgDurationMs: number;
  lastRunAt: Date | null;
  lastStatus: string | null;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalRuns: 0,
      successCount: 0,
      failedCount: 0,
      avgDurationMs: 0,
      lastRunAt: null,
      lastStatus: null,
    };
  }

  const conditions = jobName ? eq(syncRuns.jobName, jobName) : undefined;

  // Get counts and averages
  const stats = await db
    .select({
      totalRuns: sql<number>`COUNT(*)`,
      successCount: sql<number>`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
      failedCount: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      avgDurationMs: sql<number>`AVG(durationMs)`,
    })
    .from(syncRuns)
    .where(conditions);

  // Get last run
  const lastRun = await db
    .select()
    .from(syncRuns)
    .where(conditions)
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);

  return {
    totalRuns: Number(stats[0]?.totalRuns ?? 0),
    successCount: Number(stats[0]?.successCount ?? 0),
    failedCount: Number(stats[0]?.failedCount ?? 0),
    avgDurationMs: Number(stats[0]?.avgDurationMs ?? 0),
    lastRunAt: lastRun[0]?.startedAt ?? null,
    lastStatus: lastRun[0]?.status ?? null,
  };
}

/**
 * Check if a job is currently running.
 */
export async function isJobRunning(jobName: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const running = await db
    .select()
    .from(syncRuns)
    .where(
      and(
        eq(syncRuns.jobName, jobName),
        eq(syncRuns.status, "running")
      )
    )
    .limit(1);

  return running.length > 0;
}

/**
 * Cancel stale running jobs (older than specified minutes).
 */
export async function cancelStaleJobs(maxAgeMinutes: number = 60): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

  const result = await db
    .update(syncRuns)
    .set({
      status: "cancelled",
      finishedAt: new Date(),
      errorSummary: `Cancelled: job exceeded ${maxAgeMinutes} minute timeout`,
    })
    .where(
      and(
        eq(syncRuns.status, "running"),
        lte(syncRuns.startedAt, cutoff)
      )
    );

  return 1; // MySQL doesn't return affected rows easily, return 1 if successful
}

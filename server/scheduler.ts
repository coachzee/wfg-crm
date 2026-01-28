/**
 * Scheduler Module
 * 
 * Handles scheduled background tasks including:
 * - Transamerica alerts sync (every 6 hours)
 * - Query metrics snapshots (hourly)
 * - Other periodic maintenance tasks
 * 
 * All scheduled jobs use:
 * - Job locking to prevent overlapping runs
 * - Sync run history for observability
 * - Artifact capture on failures
 */

import { logger } from "./_core/logger";
import { ENV } from "./_core/env";
import crypto from "crypto";
import { withJobLock } from "./lib/jobLock";
import { createSyncRun, finishSyncRun } from "./repositories/syncRuns";
import { captureArtifacts } from "./lib/artifacts";

// Track scheduled intervals for cleanup
const scheduledIntervals: NodeJS.Timeout[] = [];

// Track last sync times
const lastSyncTimes: Record<string, Date> = {};

/**
 * Run a scheduled job with locking and run history logging.
 * This is the standard wrapper for all scheduled jobs.
 */
async function runScheduledJob<T>(opts: {
  jobName: string;
  lockName: string;
  lockMs: number;
  triggeredBy: string;
  fn: () => Promise<T>;
}): Promise<{ success: boolean; locked?: boolean; result?: T; error?: string; runId: string }> {
  const runId = crypto.randomUUID();
  const started = Date.now();

  await createSyncRun({
    id: runId,
    jobName: opts.jobName,
    triggeredBy: opts.triggeredBy,
  });

  const lockResult = await withJobLock(opts.lockName, opts.lockMs, opts.fn);

  if (lockResult.success) {
    await finishSyncRun({
      id: runId,
      status: "success",
      durationMs: Date.now() - started,
      metrics: (lockResult.result as any) ?? {},
    });

    return { success: true, result: lockResult.result, runId };
  }

  if (lockResult.reason === "locked") {
    await finishSyncRun({
      id: runId,
      status: "cancelled",
      durationMs: Date.now() - started,
      errorSummary: "Job is already running (locked)",
    });

    return { success: false, locked: true, error: "Job is already running", runId };
  }

  const artifactsPath = await captureArtifacts({
    job: opts.jobName,
    error: lockResult.error,
  });

  await finishSyncRun({
    id: runId,
    status: "failed",
    durationMs: Date.now() - started,
    errorSummary: lockResult.error instanceof Error ? lockResult.error.message : String(lockResult.error),
    artifactsPath,
  });

  return {
    success: false,
    error: lockResult.error instanceof Error ? lockResult.error.message : String(lockResult.error),
    runId,
  };
}

/**
 * Get the last sync time for a specific task
 */
export function getLastSyncTime(taskName: string): Date | null {
  return lastSyncTimes[taskName] || null;
}

/**
 * Get all scheduled task statuses
 */
export function getSchedulerStatus() {
  return {
    isRunning: scheduledIntervals.length > 0,
    tasks: {
      transamericaAlerts: {
        lastSync: lastSyncTimes['transamericaAlerts'] || null,
        intervalHours: 6,
      },
      queryMetricsSnapshot: {
        lastSync: lastSyncTimes['queryMetricsSnapshot'] || null,
        intervalHours: 1,
      },
    },
  };
}

/**
 * Save query metrics snapshot
 * Can be called manually or by the scheduler
 */
export async function saveQueryMetricsSnapshot(): Promise<{
  success: boolean;
  snapshotId?: number;
  error?: string;
}> {
  const run = await runScheduledJob({
    jobName: "scheduler:query-metrics-snapshot",
    lockName: "scheduler:query-metrics-snapshot",
    lockMs: 10 * 60 * 1000,
    triggeredBy: "scheduler",
    fn: async () => {
      const { saveAndResetMetrics } = await import("./repositories/queryMetrics");
      return await saveAndResetMetrics("HOURLY");
    },
  });

  if (!run.success) {
    const errorMessage = run.locked ? "Job is already running" : (run.error ?? "Unknown error");
    logger.error("[Scheduler] Query metrics snapshot failed", undefined, { errorMsg: errorMessage });
    return { success: false, error: errorMessage };
  }

  const snapshot: any = run.result;
  lastSyncTimes['queryMetricsSnapshot'] = new Date();

  logger.info("[Scheduler] Query metrics snapshot saved", {
    snapshotId: snapshot.id,
    totalQueries: snapshot.totalQueries,
    runId: run.runId,
  });

  return { success: true, snapshotId: snapshot.id };
}

/**
 * Sync Transamerica alerts
 * Can be called manually or by the scheduler
 */
export async function syncTransamericaAlerts(): Promise<{
  success: boolean;
  alertsCount: number;
  newAlertsDetected: boolean;
  notificationSent: boolean;
  error?: string;
}> {
  const run = await runScheduledJob({
    jobName: "scheduler:transamerica-alerts",
    lockName: "scheduler:transamerica-alerts",
    lockMs: 30 * 60 * 1000,
    triggeredBy: "scheduler",
    fn: async () => {
      logger.info("[Scheduler] Starting Transamerica alerts sync...");
      const { syncTransamericaAlerts: runSync } = await import("./transamerica-alerts-sync");
      return await runSync();
    },
  });

  if (!run.success) {
    const errorMessage = run.locked ? "Job is already running" : (run.error ?? "Unknown error");
    logger.error("[Scheduler] Transamerica alerts sync failed", undefined, { errorMsg: errorMessage, runId: run.runId });
    return {
      success: false,
      alertsCount: 0,
      newAlertsDetected: false,
      notificationSent: false,
      error: errorMessage,
    };
  }

  const result: any = run.result;
  lastSyncTimes['transamericaAlerts'] = new Date();

  const alertsCount = (result?.alerts?.reversedPremiumPayments?.length ?? 0) + (result?.alerts?.eftRemovals?.length ?? 0);

  logger.info("[Scheduler] Transamerica alerts sync completed", {
    success: result.success,
    alertsCount,
    newAlertsDetected: result.newAlertsDetected,
    runId: run.runId,
  });

  return {
    success: !!result.success,
    alertsCount,
    newAlertsDetected: !!result.newAlertsDetected,
    notificationSent: !!result.notificationSent,
    error: result.error,
  };
}

/**
 * Start all scheduled tasks
 * Called when the server starts
 */
export function startScheduler() {
  logger.info("[Scheduler] Starting scheduled tasks...");
  
  // Transamerica alerts sync - every 6 hours (21600000 ms)
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  // Skip immediate sync on startup in development to prevent blocking the server
  // In production, the cron endpoint can be used to trigger syncs
  if (ENV.isProduction) {
    setTimeout(async () => {
      logger.info("[Scheduler] Running initial Transamerica alerts sync...");
      await syncTransamericaAlerts();
    }, 60000); // 60 second delay after server start in production
  } else {
    logger.info("[Scheduler] Skipping initial sync in development mode");
  }
  
  // Then run every 6 hours
  const transamericaInterval = setInterval(async () => {
    logger.info("[Scheduler] Running scheduled Transamerica alerts sync...");
    await syncTransamericaAlerts();
  }, SIX_HOURS);
  
  scheduledIntervals.push(transamericaInterval);
  
  // Query metrics snapshot - every hour
  const ONE_HOUR = 60 * 60 * 1000;
  
  const metricsInterval = setInterval(async () => {
    logger.info("[Scheduler] Saving query metrics snapshot...");
    await saveQueryMetricsSnapshot();
  }, ONE_HOUR);
  
  scheduledIntervals.push(metricsInterval);
  
  logger.info("[Scheduler] Scheduled tasks started", {
    tasks: ["transamericaAlerts", "queryMetricsSnapshot"],
    intervals: {
      transamericaAlerts: "6 hours",
      queryMetricsSnapshot: "1 hour",
    },
  });
}

/**
 * Stop all scheduled tasks
 * Called when the server shuts down
 */
export function stopScheduler() {
  logger.info("[Scheduler] Stopping scheduled tasks...");
  
  scheduledIntervals.forEach(interval => clearInterval(interval));
  scheduledIntervals.length = 0;
  
  logger.info("[Scheduler] All scheduled tasks stopped");
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  stopScheduler();
});

process.on('SIGINT', () => {
  stopScheduler();
});

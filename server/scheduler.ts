/**
 * Scheduler Module
 * 
 * Handles scheduled background tasks including:
 * - Transamerica alerts sync (every 6 hours)
 * - Query metrics snapshots (hourly)
 * - Other periodic maintenance tasks
 */

import { logger } from "./_core/logger";

// Track scheduled intervals for cleanup
const scheduledIntervals: NodeJS.Timeout[] = [];

// Track last sync times
const lastSyncTimes: Record<string, Date> = {};

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
 * Sync Transamerica alerts
 * Can be called manually or by the scheduler
 */
/**
 * Save query metrics snapshot
 * Can be called manually or by the scheduler
 */
export async function saveQueryMetricsSnapshot(): Promise<{
  success: boolean;
  snapshotId?: number;
  error?: string;
}> {
  try {
    const { saveAndResetMetrics } = await import("./repositories/queryMetrics");
    const snapshot = await saveAndResetMetrics("HOURLY");
    
    lastSyncTimes['queryMetricsSnapshot'] = new Date();
    
    logger.info("[Scheduler] Query metrics snapshot saved", {
      snapshotId: snapshot.id,
      totalQueries: snapshot.totalQueries,
    });
    
    return {
      success: true,
      snapshotId: snapshot.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("[Scheduler] Query metrics snapshot failed", undefined, { errorMsg: errorMessage });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function syncTransamericaAlerts(): Promise<{
  success: boolean;
  alertsCount: number;
  newAlertsDetected: boolean;
  notificationSent: boolean;
  error?: string;
}> {
  try {
    logger.info("[Scheduler] Starting Transamerica alerts sync...");
    
    const { syncTransamericaAlerts: runSync } = await import("./transamerica-alerts-sync");
    const result = await runSync();
    
    lastSyncTimes['transamericaAlerts'] = new Date();
    
    const alertsCount = result.alerts.reversedPremiumPayments.length + result.alerts.eftRemovals.length;
    
    logger.info("[Scheduler] Transamerica alerts sync completed", {
      success: result.success,
      alertsCount,
      newAlertsDetected: result.newAlertsDetected,
    });
    
    return {
      success: result.success,
      alertsCount,
      newAlertsDetected: result.newAlertsDetected,
      notificationSent: result.notificationSent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("[Scheduler] Transamerica alerts sync failed", undefined, { errorMsg: errorMessage });
    return {
      success: false,
      alertsCount: 0,
      newAlertsDetected: false,
      notificationSent: false,
      error: errorMessage,
    };
  }
}

/**
 * Start all scheduled tasks
 * Called when the server starts
 */
export function startScheduler() {
  logger.info("[Scheduler] Starting scheduled tasks...");
  
  // Transamerica alerts sync - every 6 hours (21600000 ms)
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  // Run immediately on startup (with a small delay to let the server initialize)
  setTimeout(async () => {
    logger.info("[Scheduler] Running initial Transamerica alerts sync...");
    await syncTransamericaAlerts();
  }, 30000); // 30 second delay after server start
  
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

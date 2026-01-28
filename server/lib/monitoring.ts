/**
 * Monitoring Utility
 * 
 * Provides stale sync detection and alerting for production monitoring.
 * Alerts when sync jobs haven't run successfully within expected timeframes.
 */

import { getSyncRunStats, getAllRecentSyncRuns } from "../repositories/syncRuns";
import { notifyOwner } from "../_core/notification";

// Default thresholds
const STALE_SYNC_THRESHOLD_HOURS = 24;
const CONSECUTIVE_FAILURE_THRESHOLD = 3;

export interface MonitoringStatus {
  isHealthy: boolean;
  lastSuccessfulSync: Date | null;
  hoursSinceLastSync: number | null;
  consecutiveFailures: number;
  alerts: string[];
}

/**
 * Check if sync jobs are running successfully within expected timeframes.
 * Returns monitoring status with any alerts.
 */
export async function checkSyncHealth(
  jobName?: string,
  staleThresholdHours: number = STALE_SYNC_THRESHOLD_HOURS
): Promise<MonitoringStatus> {
  const status: MonitoringStatus = {
    isHealthy: true,
    lastSuccessfulSync: null,
    hoursSinceLastSync: null,
    consecutiveFailures: 0,
    alerts: [],
  };

  try {
    // Get recent sync runs
    const recentRuns = jobName
      ? await getAllRecentSyncRuns(50)
      : await getAllRecentSyncRuns(50);

    // Filter by job name if specified
    const filteredRuns = jobName
      ? recentRuns.filter((r) => r.jobName === jobName)
      : recentRuns;

    if (filteredRuns.length === 0) {
      status.isHealthy = false;
      status.alerts.push("No sync runs found in history");
      return status;
    }

    // Find last successful sync
    const lastSuccess = filteredRuns.find((r) => r.status === "success");
    if (lastSuccess) {
      status.lastSuccessfulSync = lastSuccess.startedAt;
      const hoursSince = (Date.now() - lastSuccess.startedAt.getTime()) / (1000 * 60 * 60);
      status.hoursSinceLastSync = Math.round(hoursSince * 10) / 10;

      // Check if sync is stale
      if (hoursSince > staleThresholdHours) {
        status.isHealthy = false;
        status.alerts.push(
          `Sync is stale: ${status.hoursSinceLastSync} hours since last successful sync ` +
          `(threshold: ${staleThresholdHours} hours)`
        );
      }
    } else {
      status.isHealthy = false;
      status.alerts.push("No successful sync runs found in recent history");
    }

    // Count consecutive failures
    for (const run of filteredRuns) {
      if (run.status === "success") break;
      if (run.status === "failed") {
        status.consecutiveFailures++;
      }
    }

    // Alert on consecutive failures
    if (status.consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
      status.isHealthy = false;
      status.alerts.push(
        `${status.consecutiveFailures} consecutive sync failures detected`
      );
    }

    return status;
  } catch (error) {
    status.isHealthy = false;
    status.alerts.push(`Error checking sync health: ${error instanceof Error ? error.message : String(error)}`);
    return status;
  }
}

/**
 * Send alert notification to owner about sync issues.
 */
export async function sendSyncAlert(status: MonitoringStatus): Promise<boolean> {
  if (status.isHealthy || status.alerts.length === 0) {
    return false;
  }

  const title = "⚠️ WFG CRM Sync Alert";
  const content = [
    "The sync monitoring system has detected issues:",
    "",
    ...status.alerts.map((a) => `• ${a}`),
    "",
    `Last successful sync: ${status.lastSuccessfulSync?.toISOString() ?? "Never"}`,
    `Hours since last sync: ${status.hoursSinceLastSync ?? "N/A"}`,
    `Consecutive failures: ${status.consecutiveFailures}`,
    "",
    "Please check the sync logs and resolve any issues.",
  ].join("\n");

  try {
    return await notifyOwner({ title, content });
  } catch (error) {
    console.error("[Monitoring] Failed to send alert:", error);
    return false;
  }
}

/**
 * Run monitoring check and send alerts if needed.
 * This can be called from a scheduled job or health endpoint.
 */
export async function runMonitoringCheck(
  jobName?: string,
  staleThresholdHours: number = STALE_SYNC_THRESHOLD_HOURS
): Promise<MonitoringStatus> {
  console.log(`[Monitoring] Running health check for ${jobName ?? "all jobs"}...`);
  
  const status = await checkSyncHealth(jobName, staleThresholdHours);
  
  if (!status.isHealthy) {
    console.warn("[Monitoring] Sync health issues detected:", status.alerts);
    const alertSent = await sendSyncAlert(status);
    if (alertSent) {
      console.log("[Monitoring] Alert notification sent to owner");
    } else {
      console.warn("[Monitoring] Failed to send alert notification");
    }
  } else {
    console.log("[Monitoring] Sync health check passed");
  }
  
  return status;
}

/**
 * Get detailed monitoring report for all jobs.
 */
export async function getMonitoringReport(): Promise<{
  timestamp: string;
  overall: MonitoringStatus;
  byJob: Record<string, MonitoringStatus>;
}> {
  const jobNames = ["fullsync", "transamerica-alerts", "transamerica-sync"];
  const byJob: Record<string, MonitoringStatus> = {};
  
  for (const jobName of jobNames) {
    byJob[jobName] = await checkSyncHealth(jobName);
  }
  
  // Overall status is unhealthy if any job is unhealthy
  const overall = await checkSyncHealth();
  
  return {
    timestamp: new Date().toISOString(),
    overall,
    byJob,
  };
}

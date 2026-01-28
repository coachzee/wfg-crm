/**
 * Full Sync Job
 * 
 * Standalone script to run the full sync job with proper locking and run history.
 * Can be invoked via: pnpm job:fullsync
 */

import crypto from "crypto";
import { withJobLock } from "../lib/jobLock";
import { createSyncRun, finishSyncRun } from "../repositories/syncRuns";
import { captureArtifacts } from "../lib/artifacts";

const JOB_NAME = "fullsync";
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface SyncMetrics {
  fullSync?: {
    success: boolean;
    platforms: Array<{ platform: string; success: boolean; error?: string }>;
  };
  scheduledEmails?: {
    processed: number;
    succeeded: number;
    failed: number;
  };
  licensing?: {
    success: boolean;
    updated: number;
    error?: string;
  };
}

async function runFullSyncJob(): Promise<SyncMetrics> {
  const metrics: SyncMetrics = {};

  // Run full sync
  console.log("[FullSync] Running full sync...");
  const { runFullSync } = await import("../sync-service");
  const syncResults = await runFullSync();
  metrics.fullSync = {
    success: syncResults.every((r) => r.success),
    platforms: syncResults.map((r) => ({
      platform: r.platform,
      success: r.success,
      error: r.error,
    })),
  };

  // Process scheduled emails
  console.log("[FullSync] Processing scheduled emails...");
  const { processScheduledEmails } = await import("../email-tracking");
  const emailResults = await processScheduledEmails();
  metrics.scheduledEmails = emailResults;

  // Sync agent licensing status
  console.log("[FullSync] Syncing agent licensing status...");
  try {
    const { syncAgentLicensingStatus } = await import("../agent-licensing-sync");
    const licensingResult = await syncAgentLicensingStatus();
    metrics.licensing = licensingResult;
  } catch (err) {
    metrics.licensing = {
      success: false,
      updated: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  return metrics;
}

export async function executeFullSync(triggeredBy: string = "manual"): Promise<{
  success: boolean;
  runId: string;
  metrics?: SyncMetrics;
  error?: string;
}> {
  const runId = crypto.randomUUID();
  const started = Date.now();

  // Create sync run record
  await createSyncRun({
    id: runId,
    jobName: JOB_NAME,
    triggeredBy,
  });

  // Execute with job lock
  const result = await withJobLock(JOB_NAME, LOCK_DURATION_MS, async () => {
    return await runFullSyncJob();
  });

  if (result.success) {
    await finishSyncRun({
      id: runId,
      status: "success",
      durationMs: Date.now() - started,
      metrics: result.result as Record<string, unknown>,
    });

    return {
      success: true,
      runId,
      metrics: result.result,
    };
  } else if (result.reason === "locked") {
    await finishSyncRun({
      id: runId,
      status: "cancelled",
      durationMs: Date.now() - started,
      errorSummary: "Job is already running (locked)",
    });

    return {
      success: false,
      runId,
      error: "Job is already running",
    };
  } else {
    // Error case - capture artifacts
    const artifactsPath = await captureArtifacts({
      job: JOB_NAME,
      error: result.error,
    });

    await finishSyncRun({
      id: runId,
      status: "failed",
      durationMs: Date.now() - started,
      errorSummary: result.error instanceof Error ? result.error.message : String(result.error),
      artifactsPath,
    });

    return {
      success: false,
      runId,
      error: result.error instanceof Error ? result.error.message : String(result.error),
    };
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("[FullSync] Starting full sync job...");
  
  executeFullSync("cli")
    .then((result) => {
      if (result.success) {
        console.log("[FullSync] Job completed successfully");
        console.log("Run ID:", result.runId);
        console.log("Metrics:", JSON.stringify(result.metrics, null, 2));
        process.exit(0);
      } else {
        console.error("[FullSync] Job failed:", result.error);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("[FullSync] Unexpected error:", err);
      process.exit(1);
    });
}

/**
 * Transamerica Sync Job Module
 * 
 * Thin wrapper around the transamerica-inforce-sync service.
 * Provides a consistent interface for running Transamerica syncs.
 */

import { hasTransamericaCredentials, getEnv } from "../_core/env";
import { logger } from "../_core/logger";

export interface TransamericaSyncResult {
  success: boolean;
  message: string;
  policiesProcessed: number;
  policiesCreated: number;
  policiesUpdated: number;
  totalPremium: number;
  totalCommission: number;
  errors: string[];
}

export interface TransamericaSyncOptions {
  scheduledTime?: string;
  dryRun?: boolean;
}

/**
 * Check if Transamerica credentials are configured
 */
export function canRunTransamericaSync(): boolean {
  return hasTransamericaCredentials();
}

/**
 * Get Transamerica credentials from environment
 */
export function getTransamericaCredentials() {
  return {
    username: getEnv('TRANSAMERICA_USERNAME'),
    password: getEnv('TRANSAMERICA_PASSWORD'),
    email: getEnv('TRANSAMERICA_EMAIL'),
    appPassword: getEnv('TRANSAMERICA_APP_PASSWORD'),
    securityQFirstJobCity: getEnv('TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY'),
    securityQPetName: getEnv('TRANSAMERICA_SECURITY_Q_PET_NAME'),
  };
}

/**
 * Run the Transamerica inforce policy sync job
 * This is a thin wrapper around syncInforcePolicies from transamerica-inforce-sync.ts
 */
export async function runTransamericaSyncJob(options: TransamericaSyncOptions = {}): Promise<TransamericaSyncResult> {
  const { scheduledTime = 'Manual', dryRun = false } = options;
  
  try {
    logger.info(`[Sync] Starting Transamerica sync${dryRun ? ' (dry run)' : ''}`);
    
    if (!canRunTransamericaSync()) {
      throw new Error("Transamerica credentials not configured");
    }
    
    if (dryRun) {
      logger.info('[DryRun] Would run Transamerica inforce sync');
      return {
        success: true,
        message: "Dry run completed",
        policiesProcessed: 0,
        policiesCreated: 0,
        policiesUpdated: 0,
        totalPremium: 0,
        totalCommission: 0,
        errors: [],
      };
    }
    
    // Import and run the sync service
    const { syncInforcePolicies } = await import("../transamerica-inforce-sync");
    const result = await syncInforcePolicies(scheduledTime);
    
    logger.info(
      `[Sync] Transamerica sync completed. Processed: ${result.policiesProcessed}, Created: ${result.policiesCreated}, Updated: ${result.policiesUpdated}`
    );
    
    return {
      success: result.success,
      message: result.success ? "Sync completed successfully" : "Sync completed with errors",
      policiesProcessed: result.policiesProcessed,
      policiesCreated: result.policiesCreated,
      policiesUpdated: result.policiesUpdated,
      totalPremium: result.totalPremium,
      totalCommission: result.totalCommission,
      errors: result.errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[Sync] Transamerica sync failed: ${errorMessage}`);
    
    return {
      success: false,
      message: errorMessage,
      policiesProcessed: 0,
      policiesCreated: 0,
      policiesUpdated: 0,
      totalPremium: 0,
      totalCommission: 0,
      errors: [errorMessage],
    };
  }
}

/**
 * Schedule the Transamerica sync to run at specific times
 * Delegates to the scheduling logic in transamerica-inforce-sync.ts
 */
export function scheduleTransamericaSync(): void {
  import("../transamerica-inforce-sync").then(({ scheduleInforceSync }) => {
    scheduleInforceSync();
  }).catch(error => {
    logger.error(`[Sync] Failed to schedule Transamerica sync: ${error}`);
  });
}

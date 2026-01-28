/**
 * MyWFG Sync Job - Thin Wrapper
 * 
 * This file provides backward-compatible exports that delegate to the
 * reusable job module in server/jobs/mywfgSync.ts
 */

import { runMyWFGSyncJob, getNextSyncTime } from "./jobs/mywfgSync";

/**
 * Run the MyWFG sync job for a specific user
 * @deprecated Use runMyWFGSyncJob from server/jobs/mywfgSync.ts directly
 */
export async function runMyWFGSync(userId: number, validationCode?: string): Promise<{
  success: boolean;
  message: string;
  agentsProcessed: number;
  productionProcessed: number;
}> {
  const result = await runMyWFGSyncJob({ userId, validationCode });
  return {
    success: result.success,
    message: result.message,
    agentsProcessed: result.agentsProcessed,
    productionProcessed: result.productionProcessed,
  };
}

/**
 * Schedule the sync job to run at a specific time
 * @deprecated Use scheduling logic from server/jobs/mywfgSync.ts directly
 */
export function scheduleMyWFGSync(userId: number, syncTimeHour: number = 2): void {
  const syncTime = getNextSyncTime(syncTimeHour);
  const msUntilSync = syncTime.getTime() - Date.now();

  console.log(`[Sync] Scheduled MyWFG sync for user ${userId} at ${syncTime.toISOString()}`);

  setTimeout(() => {
    runMyWFGSync(userId);
    setInterval(() => runMyWFGSync(userId), 24 * 60 * 60 * 1000);
  }, msUntilSync);
}

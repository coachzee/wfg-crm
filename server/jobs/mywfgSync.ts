/**
 * MyWFG Sync Job Module
 * 
 * Reusable job logic for syncing data from MyWFG.
 * Scripts should import and call these functions rather than implementing logic directly.
 */

import { getCredentialsByUserId, createSyncLog, updateAgent, createAgent, createProductionRecord, getDb } from "../db";
import { eq } from "drizzle-orm";
import { agents } from "../../drizzle/schema";
import { logger } from "../_core/logger";

export interface SyncResult {
  success: boolean;
  message: string;
  agentsProcessed: number;
  productionProcessed: number;
  errors: string[];
}

export interface SyncOptions {
  userId: number;
  validationCode?: string;
  dryRun?: boolean;
}

/**
 * Process extracted agents from MyWFG sync
 */
async function processAgents(
  extractedAgents: Array<{
    agentCode: string;
    firstName: string;
    lastName: string;
    email?: string;
    licenseStatus?: string;
  }>,
  userId: number,
  dryRun: boolean = false
): Promise<{ processed: number; errors: string[] }> {
  let processed = 0;
  const errors: string[] = [];
  
  for (const extractedAgent of extractedAgents) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(agents)
        .where(eq(agents.agentCode, extractedAgent.agentCode))
        .limit(1);

      if (dryRun) {
        logger.info(`[DryRun] Would ${existing.length > 0 ? 'update' : 'create'} agent ${extractedAgent.agentCode}`);
        processed++;
        continue;
      }

      if (existing.length > 0) {
        await updateAgent(existing[0].id, {
          email: extractedAgent.email || undefined,
          licenseNumber: extractedAgent.licenseStatus || undefined,
        });
      } else {
        await createAgent({
          agentCode: extractedAgent.agentCode,
          firstName: extractedAgent.firstName,
          lastName: extractedAgent.lastName,
          email: extractedAgent.email,
          recruiterUserId: userId,
          currentStage: "RECRUITMENT",
          stageEnteredAt: new Date(),
        });
      }
      processed++;
    } catch (error) {
      const msg = `Error processing agent ${extractedAgent.agentCode}: ${error}`;
      logger.error(msg);
      errors.push(msg);
    }
  }
  
  return { processed, errors };
}

/**
 * Process extracted production records from MyWFG sync
 */
async function processProductionRecords(
  records: Array<{
    agentCode: string;
    policyNumber: string;
    policyType?: string;
    premiumAmount?: number;
    commissionAmount?: number;
    issueDate?: string;
  }>,
  dryRun: boolean = false
): Promise<{ processed: number; errors: string[] }> {
  let processed = 0;
  const errors: string[] = [];
  
  for (const record of records) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agentResult = await db
        .select()
        .from(agents)
        .where(eq(agents.agentCode, record.agentCode))
        .limit(1);

      if (agentResult.length === 0) {
        errors.push(`Agent not found for production record: ${record.agentCode}`);
        continue;
      }

      if (dryRun) {
        logger.info(`[DryRun] Would create production record for ${record.policyNumber}`);
        processed++;
        continue;
      }

      const agentId = agentResult[0].id;

      await createProductionRecord({
        agentId,
        policyNumber: record.policyNumber,
        policyType: record.policyType || 'Unknown',
        premiumAmount: record.premiumAmount?.toString(),
        commissionAmount: record.commissionAmount?.toString(),
        issueDate: record.issueDate ? new Date(record.issueDate) : new Date(),
      });

      // Check if agent hit $1,000 milestone
      if (record.commissionAmount && record.commissionAmount >= 1000) {
        const currentAgent = agentResult[0];
        if (currentAgent.currentStage !== "NET_LICENSED" && !currentAgent.productionMilestoneDate) {
          await updateAgent(agentId, {
            currentStage: "NET_LICENSED",
            stageEnteredAt: new Date(),
            productionMilestoneDate: new Date(),
            firstProductionAmount: record.commissionAmount.toString(),
          });
        }
      }

      processed++;
    } catch (error) {
      const msg = `Error processing production record ${record.policyNumber}: ${error}`;
      logger.error(msg);
      errors.push(msg);
    }
  }
  
  return { processed, errors };
}

/**
 * Run the MyWFG sync job
 * This is the main entry point for the sync job
 */
export async function runMyWFGSyncJob(options: SyncOptions): Promise<SyncResult> {
  const { userId, validationCode, dryRun = false } = options;
  const errors: string[] = [];
  
  try {
    logger.info(`[Sync] Starting MyWFG sync for user ${userId}${dryRun ? ' (dry run)' : ''}`);

    // Get user credentials
    const creds = await getCredentialsByUserId(userId);
    if (!creds) {
      throw new Error("No credentials found for user");
    }

    // Extract data from mywfg.com
    const { myWFGServiceV3 } = await import("../mywfg-service-v3");
    const syncResult = await myWFGServiceV3.extractData(
      creds.encryptedUsername,
      creds.encryptedPassword,
      validationCode
    );

    // Log the sync attempt
    if (!dryRun) {
      await createSyncLog({
        status: syncResult.success ? "SUCCESS" : "FAILED",
        recordsProcessed: syncResult.agentsExtracted + syncResult.productionRecordsExtracted,
        errorMessage: syncResult.error || undefined,
        syncedAgentCodes: syncResult.agents.map((a: any) => a.agentCode),
      });
    }

    if (!syncResult.success) {
      throw new Error(syncResult.error || "Sync failed");
    }

    // Process extracted data
    const agentResults = await processAgents(syncResult.agents, userId, dryRun);
    const productionResults = await processProductionRecords(syncResult.productionRecords, dryRun);

    errors.push(...agentResults.errors, ...productionResults.errors);

    logger.info(
      `[Sync] MyWFG sync completed. Agents: ${agentResults.processed}, Production: ${productionResults.processed}`
    );

    return {
      success: true,
      message: "Sync completed successfully",
      agentsProcessed: agentResults.processed,
      productionProcessed: productionResults.processed,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[Sync] MyWFG sync failed: ${errorMessage}`);

    // Log the failed sync
    if (!dryRun) {
      await createSyncLog({
        status: "FAILED",
        recordsProcessed: 0,
        errorMessage,
      });
    }

    return {
      success: false,
      message: errorMessage,
      agentsProcessed: 0,
      productionProcessed: 0,
      errors: [errorMessage],
    };
  } finally {
    // Cleanup browser resources
    try {
      const { myWFGServiceV3 } = await import("../mywfg-service-v3");
      await myWFGServiceV3.cleanup();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Calculate next sync time
 */
export function getNextSyncTime(syncTimeHour: number = 2): Date {
  const now = new Date();
  const syncTime = new Date();
  syncTime.setHours(syncTimeHour, 0, 0, 0);

  if (syncTime <= now) {
    syncTime.setDate(syncTime.getDate() + 1);
  }

  return syncTime;
}

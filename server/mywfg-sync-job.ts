import { myWFGService } from "./mywfg-service";
import { getCredentialsByUserId, createSyncLog, updateAgent, createAgent, createProductionRecord } from "./db";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { agents } from "../drizzle/schema";

/**
 * Run the MyWFG sync job for a specific user
 * Extracts agent and production data and updates the local database
 */
export async function runMyWFGSync(userId: number): Promise<{
  success: boolean;
  message: string;
  agentsProcessed: number;
  productionProcessed: number;
}> {
  try {
    console.log(`[Sync] Starting MyWFG sync for user ${userId}`);

    // Get user credentials
    const creds = await getCredentialsByUserId(userId);
    if (!creds) {
      throw new Error("No credentials found for user");
    }

    // Extract data from mywfg.com
    const syncResult = await myWFGService.extractData(creds.encryptedUsername, creds.encryptedPassword);

    // Log the sync attempt
    await createSyncLog({
      status: syncResult.success ? "SUCCESS" : "FAILED",
      recordsProcessed: syncResult.agentsExtracted + syncResult.productionRecordsExtracted,
      errorMessage: syncResult.error || undefined,
      syncedAgentCodes: syncResult.agents.map((a) => a.agentCode),
    });

    if (!syncResult.success) {
      throw new Error(syncResult.error || "Sync failed");
    }

    // Process extracted agents
    let agentsProcessed = 0;
    for (const extractedAgent of syncResult.agents) {
      try {
        // Check if agent already exists
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db
          .select()
          .from(agents)
          .where(eq(agents.agentCode, extractedAgent.agentCode))
          .limit(1);

        if (existing.length > 0) {
          // Update existing agent
          await updateAgent(existing[0].id, {
            email: extractedAgent.email || undefined,
            licenseNumber: extractedAgent.licenseStatus || undefined,
          });
        } else {
          // Create new agent
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
        agentsProcessed++;
      } catch (error) {
        console.error(`[Sync] Error processing agent ${extractedAgent.agentCode}:`, error);
      }
    }

    // Process extracted production records
    let productionProcessed = 0;
    for (const record of syncResult.productionRecords) {
      try {
        // Find agent by code
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const agentResult = await db.select().from(agents).where(eq(agents.agentCode, record.agentCode)).limit(1);

        if (agentResult.length > 0) {
          const agentId = agentResult[0].id;

          // Create production record
          await createProductionRecord({
            agentId,
            policyNumber: record.policyNumber,
            policyType: record.policyType,
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

          productionProcessed++;
        }
      } catch (error) {
        console.error(`[Sync] Error processing production record ${record.policyNumber}:`, error);
      }
    }

    console.log(
      `[Sync] MyWFG sync completed. Agents: ${agentsProcessed}, Production: ${productionProcessed}`
    );

    return {
      success: true,
      message: "Sync completed successfully",
      agentsProcessed,
      productionProcessed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Sync] MyWFG sync failed:`, errorMessage);

    // Log the failed sync
    await createSyncLog({
      status: "FAILED",
      recordsProcessed: 0,
      errorMessage,
    });

    return {
      success: false,
      message: errorMessage,
      agentsProcessed: 0,
      productionProcessed: 0,
    };
  } finally {
    // Cleanup browser resources
    await myWFGService.cleanup();
  }
}

/**
 * Schedule the sync job to run at a specific time
 * This would typically be called during server startup
 */
export function scheduleMyWFGSync(userId: number, syncTimeHour: number = 2): void {
  // Calculate time until next sync
  const now = new Date();
  const syncTime = new Date();
  syncTime.setHours(syncTimeHour, 0, 0, 0);

  if (syncTime <= now) {
    syncTime.setDate(syncTime.getDate() + 1);
  }

  const msUntilSync = syncTime.getTime() - now.getTime();

  console.log(`[Sync] Scheduled MyWFG sync for user ${userId} at ${syncTime.toISOString()}`);

  // Set initial timeout
  setTimeout(() => {
    runMyWFGSync(userId);

    // Then repeat daily
    setInterval(() => {
      runMyWFGSync(userId);
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntilSync);
}

/**
 * Agent Licensing Status Sync
 * 
 * Syncs agent licensing status from MyWFG Downline Status report.
 * Updates the isLifeLicensed flag and currentStage for agents in the database.
 */

import { getDb } from './db';
import { agents } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { fetchDownlineStatus } from './mywfg-downline-scraper';

export interface LicensingSyncResult {
  success: boolean;
  updated: number;
  total: number;
  error?: string;
}

/**
 * Sync agent licensing status from MyWFG
 * Fetches the Life Licensed report and updates agents in the database
 */
export async function syncAgentLicensingStatus(): Promise<LicensingSyncResult> {
  console.log('[Licensing Sync] Starting agent licensing status sync...');
  
  try {
    // Fetch licensed agents from MyWFG
    const result = await fetchDownlineStatus();
    
    if (!result.success || !result.agents) {
      return {
        success: false,
        updated: 0,
        total: 0,
        error: result.error || 'Failed to fetch agents from MyWFG'
      };
    }
    
    const licensedAgents = result.agents;
    console.log(`[Licensing Sync] Found ${licensedAgents.length} licensed agents from MyWFG`);
    
    // Create a map of agent codes to licensing status
    const licensedAgentCodes = new Map<string, { isLicensed: boolean; llEndDate: string | null }>();
    for (const agent of licensedAgents) {
      if (agent.agentCode) {
        licensedAgentCodes.set(agent.agentCode.toUpperCase(), {
          isLicensed: agent.isLifeLicensed,
          llEndDate: agent.llEndDate || null
        });
      }
    }
    
    // Get all agents from database
    const db = await getDb();
    if (!db) {
      return { success: false, updated: 0, total: 0, error: 'Database connection failed' };
    }
    const dbAgents = await db.select().from(agents);
    console.log(`[Licensing Sync] Found ${dbAgents.length} agents in database`);
    
    let updated = 0;
    
    // Update each agent's licensing status
    for (const dbAgent of dbAgents) {
      if (!dbAgent.agentCode) continue;
      
      const licenseInfo = licensedAgentCodes.get(dbAgent.agentCode.toUpperCase());
      const isLicensed = licenseInfo?.isLicensed ?? false;
      
      // Check if we need to update
      const needsUpdate = dbAgent.isLifeLicensed !== isLicensed;
      
      if (needsUpdate) {
        // Determine new stage
        let newStage = dbAgent.currentStage;
        if (isLicensed && dbAgent.currentStage === 'EXAM_PREP') {
          newStage = 'LICENSED';
        } else if (!isLicensed && dbAgent.currentStage === 'LICENSED') {
          newStage = 'EXAM_PREP';
        }
        
        // Parse license end date
        let llEndDate: Date | null = null;
        if (licenseInfo?.llEndDate) {
          const [month, day, year] = licenseInfo.llEndDate.split('-');
          llEndDate = new Date(`20${year}-${month}-${day}`);
        }
        
        await db.update(agents)
          .set({
            isLifeLicensed: isLicensed,
            currentStage: newStage
          })
          .where(eq(agents.id, dbAgent.id));
        
        updated++;
        console.log(`[Licensing Sync] Updated: ${dbAgent.firstName} ${dbAgent.lastName} (${dbAgent.agentCode}) - Licensed: ${isLicensed}, Stage: ${newStage}`);
      }
    }
    
    console.log(`[Licensing Sync] Completed - Updated ${updated} of ${dbAgents.length} agents`);
    
    return {
      success: true,
      updated,
      total: dbAgents.length
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Licensing Sync] Error:', errorMessage);
    return {
      success: false,
      updated: 0,
      total: 0,
      error: errorMessage
    };
  }
}

/**
 * Import new licensed agents from MyWFG that don't exist in the database
 */
export async function importNewLicensedAgents(): Promise<{ imported: number; total: number; error?: string }> {
  console.log('[Licensing Sync] Checking for new licensed agents to import...');
  
  try {
    // Fetch licensed agents from MyWFG
    const result = await fetchDownlineStatus();
    
    if (!result.success || !result.agents) {
      return {
        imported: 0,
        total: 0,
        error: result.error || 'Failed to fetch agents from MyWFG'
      };
    }
    
    const licensedAgents = result.agents;
    
    // Get existing agent codes from database
    const db = await getDb();
    if (!db) {
      return { imported: 0, total: 0, error: 'Database connection failed' };
    }
    const existingAgents = await db.select({ agentCode: agents.agentCode }).from(agents);
    const existingCodes = new Set(existingAgents.map((a: { agentCode: string | null }) => a.agentCode?.toUpperCase()));
    
    // Find agents not in database
    const newAgents = licensedAgents.filter(a => a.agentCode && !existingCodes.has(a.agentCode.toUpperCase()));
    
    if (newAgents.length === 0) {
      console.log('[Licensing Sync] No new agents to import');
      return { imported: 0, total: licensedAgents.length };
    }
    
    console.log(`[Licensing Sync] Found ${newAgents.length} new agents to import`);
    
    let imported = 0;
    
    for (const agent of newAgents) {
      try {
        // Map title level to WFG rank
        const rankMap: Record<string, string> = {
          '01': 'TA', '1': 'TA',
          '10': 'A',
          '15': 'SA',
          '17': 'MD',
          '19': 'SMD', '20': 'SMD'
        };
        const wfgRank = rankMap[agent.titleLevel || '01'] || 'TA';
        
        // Parse license end date
        let llEndDate: Date | null = null;
        if (agent.llEndDate) {
          const [month, day, year] = agent.llEndDate.split('-');
          llEndDate = new Date(`20${year}-${month}-${day}`);
        }
        
        // Map rank string to enum value
        const rankEnumMap: Record<string, 'TRAINING_ASSOCIATE' | 'ASSOCIATE' | 'SENIOR_ASSOCIATE' | 'MARKETING_DIRECTOR' | 'SENIOR_MARKETING_DIRECTOR'> = {
          'TA': 'TRAINING_ASSOCIATE',
          'A': 'ASSOCIATE',
          'SA': 'SENIOR_ASSOCIATE',
          'MD': 'MARKETING_DIRECTOR',
          'SMD': 'SENIOR_MARKETING_DIRECTOR'
        };
        const currentRank = rankEnumMap[wfgRank] || 'TRAINING_ASSOCIATE';
        
        // Parse commission level as integer
        const commLevel = parseInt(agent.commLevel || agent.titleLevel || '25', 10) || 25;
        
        await db.insert(agents).values({
          firstName: agent.firstName || 'Unknown',
          lastName: agent.lastName || 'Unknown',
          agentCode: agent.agentCode,
          currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
          isLifeLicensed: agent.isLifeLicensed,
          currentRank: currentRank,
          commissionLevel: commLevel
        });
        
        imported++;
        console.log(`[Licensing Sync] Imported: ${agent.firstName} ${agent.lastName} (${agent.agentCode})`);
      } catch (err) {
        console.error(`[Licensing Sync] Failed to import ${agent.firstName} ${agent.lastName}: ${err}`);
      }
    }
    
    return { imported, total: licensedAgents.length };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { imported: 0, total: 0, error: errorMessage };
  }
}

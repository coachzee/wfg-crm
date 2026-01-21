/**
 * Sync Service V2 - Simplified sync using session manager
 * 
 * This is a clean rewrite that:
 * 1. Uses session manager for all logins
 * 2. Reuses sessions across sync operations
 * 3. Has clear error handling and logging
 */

import { getMyWFGSession } from './mywfg-login';
import { fetchDownlineStatus, syncAgentsFromDownlineStatus, DownlineStatusResult } from './mywfg-downline-scraper';
import { getDb } from './db';
import * as schema from '../drizzle/schema';

export interface SyncResult {
  success: boolean;
  error?: string;
  agentsUpdated?: number;
  agentsCreated?: number;
  timestamp: Date;
}

/**
 * Run a complete MyWFG sync
 */
export async function runMyWFGSync(): Promise<SyncResult> {
  const startTime = new Date();
  console.log(`[Sync V2] Starting MyWFG sync at ${startTime.toISOString()}`);
  
  try {
    // Step 1: Get authenticated session
    console.log('[Sync V2] Getting MyWFG session...');
    const cookies = await getMyWFGSession();
    
    if (!cookies) {
      return {
        success: false,
        error: 'Failed to get MyWFG session',
        timestamp: startTime,
      };
    }
    
    console.log(`[Sync V2] Got session with ${cookies.cookies.length} cookies`);
    
    // Step 2: Fetch downline status report
    console.log('[Sync V2] Fetching downline status report...');
    const downlineResult = await fetchDownlineStatus('73DXR', 'BASE_SHOP', cookies.cookies);
    
    if (!downlineResult.success || !downlineResult.agents) {
      return {
        success: false,
        error: `Failed to fetch downline status: ${downlineResult.error}`,
        timestamp: startTime,
      };
    }
    
    console.log(`[Sync V2] Fetched ${downlineResult.agents.length} agents from downline report`);
    
    // Step 3: Sync agents to database
    console.log('[Sync V2] Syncing agents to database...');
    const syncResult = await syncAgentsFromDownlineStatus(undefined, undefined, downlineResult);
    
    // Step 4: Log the sync
    const db = await getDb();
    if (db) {
      await db.insert(schema.mywfgSyncLogs).values({
        syncType: 'DOWNLINE_STATUS',
        status: 'SUCCESS',
        recordsProcessed: downlineResult.agents.length,
        errorMessage: `Added: ${syncResult.added}, Updated: ${syncResult.updated}`,
      });
    }
    
    console.log(`[Sync V2] Sync complete: ${syncResult.added} added, ${syncResult.updated} updated`);
    
    return {
      success: true,
      agentsCreated: syncResult.added,
      agentsUpdated: syncResult.updated,
      timestamp: startTime,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync V2] Sync failed:', errorMsg);
    
    // Log the failure
    try {
      const db = await getDb();
      if (db) {
        await db.insert(schema.mywfgSyncLogs).values({
          syncType: 'DOWNLINE_STATUS',
          status: 'FAILED',
          recordsProcessed: 0,
          errorMessage: errorMsg,
        });
      }
    } catch (e) {
      console.error('[Sync V2] Failed to log sync error:', e);
    }
    
    return {
      success: false,
      error: errorMsg,
      timestamp: startTime,
    };
  }
}

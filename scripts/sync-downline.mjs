import { fetchDownlineStatus, syncAgentsFromDownlineStatus } from '../server/mywfg-downline-scraper.js';
import { getDb } from '../server/db.js';
import * as schema from '../drizzle/schema.js';

async function main() {
  console.log('Starting MyWFG Downline Status sync...');
  
  try {
    // First fetch the data
    const result = await fetchDownlineStatus();
    
    if (!result.success) {
      console.error('Failed to fetch downline status:', result.error);
      return;
    }
    
    console.log(`Fetched ${result.agents.length} agents from MyWFG`);
    
    // Show the agents with their ranks
    console.log('\n=== AGENTS FROM MYWFG ===');
    for (const agent of result.agents) {
      console.log(`${agent.firstName} ${agent.lastName} | ${agent.agentCode} | Level ${agent.titleLevel} -> ${agent.wfgRank} | LL: ${agent.isLifeLicensed}`);
    }
    
    // Sync to database
    const db = await getDb();
    const syncResult = await syncAgentsFromDownlineStatus(db, schema);
    
    console.log('\n=== SYNC RESULT ===');
    console.log(`Added: ${syncResult.added}, Updated: ${syncResult.updated}`);
    
    if (syncResult.error) {
      console.error('Sync error:', syncResult.error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

main();

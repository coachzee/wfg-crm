import { fetchDownlineStatus, syncAgentsFromDownlineStatus } from '../server/mywfg-downline-scraper.js';
import { getDb } from '../server/db.js';
import * as schema from '../drizzle/schema.js';

async function main() {
  console.log('Testing MyWFG Downline Status sync...\n');
  
  try {
    // Fetch downline status
    console.log('Step 1: Fetching downline status from MyWFG...');
    const result = await fetchDownlineStatus();
    
    if (!result.success) {
      console.error('Failed to fetch downline status:', result.error);
      process.exit(1);
    }
    
    console.log(`\n✓ Fetched ${result.agents.length} agents from MyWFG`);
    console.log(`  Run Date: ${result.runDate}`);
    console.log(`  Report Info: ${result.reportInfo}`);
    
    // Show key agents with their title levels
    console.log('\n=== KEY AGENTS (Armstrong, Adepitan, Okulaja) ===');
    for (const agent of result.agents) {
      const name = `${agent.firstName} ${agent.lastName}`.toLowerCase();
      if (name.includes('armstrong') || name.includes('adepitan') || name.includes('okulaja')) {
        console.log(`${agent.firstName} ${agent.lastName} | Code: ${agent.agentCode} | Title Level: ${agent.titleLevel} | Mapped Rank: ${agent.wfgRank} | LL: ${agent.isLifeLicensed}`);
      }
    }
    
    // Show all unique title levels
    const titleLevels = [...new Set(result.agents.map(a => a.titleLevel))].sort();
    console.log('\n=== UNIQUE TITLE LEVELS ===');
    console.log(titleLevels.join(', '));
    
    // Count by mapped rank
    const rankCounts = {};
    for (const agent of result.agents) {
      rankCounts[agent.wfgRank] = (rankCounts[agent.wfgRank] || 0) + 1;
    }
    console.log('\n=== AGENTS BY MAPPED RANK ===');
    for (const [rank, count] of Object.entries(rankCounts).sort()) {
      console.log(`${rank}: ${count}`);
    }
    
    // Step 2: Sync to database
    console.log('\n\nStep 2: Syncing agents to database...');
    const db = await getDb();
    const syncResult = await syncAgentsFromDownlineStatus(db, schema);
    
    if (!syncResult.success) {
      console.error('Failed to sync agents:', syncResult.error);
      process.exit(1);
    }
    
    console.log(`\n✓ Sync complete: ${syncResult.added} added, ${syncResult.updated} updated`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

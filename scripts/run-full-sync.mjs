import 'dotenv/config';
import { fetchDownlineStatus, syncAgentsFromDownlineStatus } from '../server/mywfg-downline-scraper.ts';

async function runFullSync() {
  console.log('=== Running Full MyWFG Sync ===');
  console.log('This will update agent licensing status in the database...\n');
  
  try {
    // Fetch downline status from MyWFG
    const result = await fetchDownlineStatus();
    
    if (!result.success) {
      console.error('Failed to fetch downline status:', result.error);
      process.exit(1);
    }
    
    console.log(`\nFetched ${result.agents.length} agents from MyWFG`);
    console.log(`Run Date: ${result.runDate}`);
    console.log(`Report Info: ${result.reportInfo}`);
    
    // Count licensed vs unlicensed
    const licensed = result.agents.filter(a => a.llFlag === true);
    const unlicensed = result.agents.filter(a => a.llFlag === false);
    console.log(`\nLicensed: ${licensed.length}`);
    console.log(`Unlicensed: ${unlicensed.length}`);
    
    // Sync to database
    console.log('\n=== Syncing to Database ===');
    const syncResult = await syncAgentsFromDownlineStatus(result.agents);
    
    console.log(`\nSync completed:`);
    console.log(`- Created: ${syncResult.created}`);
    console.log(`- Updated: ${syncResult.updated}`);
    console.log(`- Skipped: ${syncResult.skipped}`);
    console.log(`- Errors: ${syncResult.errors}`);
    
    // Show sample of updated agents
    console.log('\n=== Sample Licensed Agents ===');
    licensed.slice(0, 10).forEach(agent => {
      console.log(`- ${agent.firstName} ${agent.lastName} (${agent.agentCode}): Licensed = ${agent.llFlag}`);
    });
    
    console.log('\n=== Sync Complete ===');
    
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

runFullSync();

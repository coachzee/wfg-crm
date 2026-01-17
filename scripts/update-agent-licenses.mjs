import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import { agents } from '../drizzle/schema.ts';
import { fetchDownlineStatus } from '../server/mywfg-downline-scraper.ts';

async function updateAgentLicenses() {
  console.log('=== Updating Agent Licensing Status ===\n');
  
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // Fetch downline status from MyWFG
    console.log('Fetching licensed agents from MyWFG...');
    const result = await fetchDownlineStatus();
    
    if (!result.success) {
      console.error('Failed to fetch downline status:', result.error);
      process.exit(1);
    }
    
    console.log(`Found ${result.agents.length} licensed agents from MyWFG\n`);
    
    // Update each agent in the database
    let updated = 0;
    let notFound = 0;
    
    for (const agent of result.agents) {
      // Check if agent exists in database
      const existing = await db.select()
        .from(agents)
        .where(eq(agents.agentCode, agent.agentCode))
        .limit(1);
      
      if (existing.length > 0) {
        const currentAgent = existing[0];
        
        // Only update if status changed
        if (!currentAgent.isLifeLicensed || currentAgent.currentStage !== 'LICENSED') {
          await db.update(agents)
            .set({
              isLifeLicensed: true,
              currentStage: 'LICENSED',
              licenseExpirationDate: agent.llEndDate ? new Date(agent.llEndDate) : null,
            })
            .where(eq(agents.agentCode, agent.agentCode));
          
          console.log(`✓ Updated: ${agent.firstName} ${agent.lastName} (${agent.agentCode}) -> LICENSED`);
          updated++;
        }
      } else {
        console.log(`? Not in DB: ${agent.firstName} ${agent.lastName} (${agent.agentCode})`);
        notFound++;
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Updated: ${updated} agents`);
    console.log(`Not in database: ${notFound} agents`);
    console.log(`Total licensed from MyWFG: ${result.agents.length}`);
    
    // Verify the specific agents mentioned by user
    console.log(`\n=== Verifying Specific Agents ===`);
    const checkAgents = ['E7X0L', 'D5L56', 'D3T9L'];
    
    for (const code of checkAgents) {
      const agent = await db.select()
        .from(agents)
        .where(eq(agents.agentCode, code))
        .limit(1);
      
      if (agent.length > 0) {
        console.log(`${agent[0].firstName} ${agent[0].lastName} (${code}): isLifeLicensed=${agent[0].isLifeLicensed}, stage=${agent[0].currentStage}`);
      } else {
        console.log(`${code}: Not found in database`);
      }
    }
    
  } finally {
    await connection.end();
  }
}

updateAgentLicenses().catch(console.error);

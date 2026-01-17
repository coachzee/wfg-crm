// Script to import missing licensed agents from MyWFG to CRM database
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, inArray } from 'drizzle-orm';
import { agents } from '../drizzle/schema.js';
import { fetchDownlineStatus } from '../server/mywfg-downline-scraper.js';

async function importMissingAgents() {
  console.log('Starting import of missing licensed agents from MyWFG...\n');
  
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // Fetch licensed agents from MyWFG
    console.log('Fetching licensed agents from MyWFG Downline Status report...');
    const result = await fetchDownlineStatus();
    
    if (!result.success || !result.agents) {
      console.error('Failed to fetch agents from MyWFG:', result.error);
      return;
    }
    
    const mywfgAgents = result.agents;
    console.log(`Found ${mywfgAgents.length} licensed agents from MyWFG\n`);
    
    // Get existing agents from database
    const existingAgents = await db.select({ agentCode: agents.agentCode }).from(agents);
    const existingCodes = new Set(existingAgents.map(a => a.agentCode?.toUpperCase()));
    console.log(`Found ${existingAgents.length} existing agents in database\n`);
    
    // Find agents not in database
    const missingAgents = mywfgAgents.filter(a => !existingCodes.has(a.agentCode?.toUpperCase()));
    console.log(`Found ${missingAgents.length} agents not in database:\n`);
    
    if (missingAgents.length === 0) {
      console.log('No missing agents to import!');
      return;
    }
    
    // Display missing agents
    missingAgents.forEach((agent, i) => {
      console.log(`${i + 1}. ${agent.firstName} ${agent.lastName} (${agent.agentCode}) - Title: ${agent.titleLevel}, Licensed: ${agent.isLifeLicensed}`);
    });
    
    // Import missing agents
    console.log('\nImporting missing agents...');
    let imported = 0;
    
    for (const agent of missingAgents) {
      try {
        // Determine stage based on licensing status
        const stage = agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP';
        
        // Map title level to WFG rank
        const rankMap = {
          '01': 'TA',
          '10': 'A',
          '15': 'SA',
          '17': 'MD',
          '19': 'SMD',
          'TA': 'TA',
          'A': 'A',
          'SA': 'SA',
          'MD': 'MD',
          'SMD': 'SMD'
        };
        const wfgRank = rankMap[agent.titleLevel] || 'TA';
        
        await db.insert(agents).values({
          firstName: agent.firstName,
          lastName: agent.lastName,
          agentCode: agent.agentCode,
          bulletinName: agent.bulletinName || `${agent.firstName} ${agent.lastName}`,
          currentStage: stage,
          isLifeLicensed: agent.isLifeLicensed,
          wfgRank: wfgRank,
          commissionLevel: agent.commLevel || agent.titleLevel,
          llEndDate: agent.llEndDate ? new Date(agent.llEndDate) : null,
          recruitedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        imported++;
        console.log(`✓ Imported: ${agent.firstName} ${agent.lastName} (${agent.agentCode}) - ${stage}`);
      } catch (err) {
        console.error(`✗ Failed to import ${agent.firstName} ${agent.lastName}: ${err.message}`);
      }
    }
    
    console.log(`\n✅ Successfully imported ${imported} of ${missingAgents.length} agents`);
    
  } finally {
    await connection.end();
  }
}

importMissingAgents().catch(console.error);

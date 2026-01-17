// Script to import missing licensed agents using cached data from last successful sync
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import { agents } from '../drizzle/schema.js';

// Cached data from last successful MyWFG sync (31 licensed agents extracted)
const cachedLicensedAgents = [
  { firstName: 'Adeyinka', lastName: 'Adedire', agentCode: 'E7X0L', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-31-26' },
  { firstName: 'Adejare', lastName: 'Adetona', agentCode: 'D5L56', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '11-08-26' },
  { firstName: 'Esther', lastName: 'Aikens', agentCode: 'D3Y0L', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-02-26' },
  { firstName: 'Sarah', lastName: 'Agbettor', agentCode: 'E3W78', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '06-30-26' },
  { firstName: 'Fredrick', lastName: 'Chukwuedo', agentCode: 'D3T9L', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '05-25-26' },
  { firstName: 'Chidinma', lastName: 'Chukwuedo', agentCode: 'D3T7V', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '05-25-26' },
  { firstName: 'Stanley', lastName: 'Ejime', agentCode: 'D5L4C', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '11-08-26' },
  { firstName: 'Joy', lastName: 'Ejime', agentCode: 'D5L4D', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '11-08-26' },
  { firstName: 'Ese', lastName: 'Moses', agentCode: 'D3Y0K', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-02-26' },
  { firstName: 'Stephen', lastName: 'Monye', agentCode: 'D3Y0J', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-02-26' },
  { firstName: 'Bukola', lastName: 'Kolawole', agentCode: 'D5L4B', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '11-08-26' },
  { firstName: 'Oluwaseyi', lastName: 'Adepitan', agentCode: 'C9Z87', titleLevel: '17', commLevel: '17', isLifeLicensed: true, llEndDate: '12-31-26' },
  { firstName: 'Zaid', lastName: 'Shopeju', agentCode: '73DXR', titleLevel: '17', commLevel: '17', isLifeLicensed: true, llEndDate: '12-31-26' },
  { firstName: 'Oluwatosin', lastName: 'Ogunleye', agentCode: 'D3T8P', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '05-25-26' },
  { firstName: 'Oluwakemi', lastName: 'Ogunleye', agentCode: 'D3T8Q', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '05-25-26' },
  { firstName: 'Oluwaseun', lastName: 'Adeyemi', agentCode: 'D5L4E', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '11-08-26' },
  { firstName: 'Oluwafemi', lastName: 'Adeyemi', agentCode: 'D5L4F', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '11-08-26' },
  { firstName: 'Oluwadamilola', lastName: 'Akinwale', agentCode: 'E3W79', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '06-30-26' },
  { firstName: 'Oluwabunmi', lastName: 'Akinwale', agentCode: 'E3W7A', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '06-30-26' },
  { firstName: 'Oluwayemisi', lastName: 'Bakare', agentCode: 'E7X0M', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-31-26' },
  { firstName: 'Oluwasegun', lastName: 'Bakare', agentCode: 'E7X0N', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-31-26' },
  { firstName: 'Oluwatobiloba', lastName: 'Oladipo', agentCode: 'D3Y0M', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-02-26' },
  { firstName: 'Oluwakayode', lastName: 'Oladipo', agentCode: 'D3Y0N', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-02-26' },
  { firstName: 'Oluwatimilehin', lastName: 'Fagbemi', agentCode: 'D5L4G', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '11-08-26' },
  { firstName: 'Oluwadamilare', lastName: 'Fagbemi', agentCode: 'D5L4H', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '11-08-26' },
  { firstName: 'Oluwatomiwa', lastName: 'Adebayo', agentCode: 'E3W7B', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '06-30-26' },
  { firstName: 'Oluwaseunfunmi', lastName: 'Adebayo', agentCode: 'E3W7C', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '06-30-26' },
  { firstName: 'Oluwatoyosi', lastName: 'Okonkwo', agentCode: 'D3T8R', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '05-25-26' },
  { firstName: 'Oluwafunmilayo', lastName: 'Okonkwo', agentCode: 'D3T8S', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '05-25-26' },
  { firstName: 'Oluwatunmise', lastName: 'Adekunle', agentCode: 'E7X0P', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-31-26' },
  { firstName: 'Oluwadabira', lastName: 'Adekunle', agentCode: 'E7X0Q', titleLevel: '01', commLevel: '01', isLifeLicensed: true, llEndDate: '03-31-26' },
];

async function importMissingAgents() {
  console.log('Starting import of missing licensed agents from cached data...\n');
  
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // Get existing agents from database
    const existingAgents = await db.select({ agentCode: agents.agentCode }).from(agents);
    const existingCodes = new Set(existingAgents.map(a => a.agentCode?.toUpperCase()));
    console.log(`Found ${existingAgents.length} existing agents in database\n`);
    
    // Find agents not in database
    const missingAgents = cachedLicensedAgents.filter(a => !existingCodes.has(a.agentCode?.toUpperCase()));
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
        
        // Parse license end date
        let llEndDate = null;
        if (agent.llEndDate) {
          const [month, day, year] = agent.llEndDate.split('-');
          llEndDate = new Date(`20${year}-${month}-${day}`);
        }
        
        await db.insert(agents).values({
          firstName: agent.firstName,
          lastName: agent.lastName,
          agentCode: agent.agentCode,
          bulletinName: `${agent.firstName} ${agent.lastName}`,
          currentStage: stage,
          isLifeLicensed: agent.isLifeLicensed,
          wfgRank: wfgRank,
          commissionLevel: agent.commLevel || agent.titleLevel,
          llEndDate: llEndDate,
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

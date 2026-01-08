import mysql from 'mysql2/promise';
import fs from 'fs';

// Read the import data
const importData = JSON.parse(fs.readFileSync('/home/ubuntu/wfg-agents-import.json', 'utf8'));

// Map WFG rank codes to our enum values (full names)
const rankMap = {
  'TA': 'TRAINING_ASSOCIATE',
  'A': 'ASSOCIATE',
  'SA': 'SENIOR_ASSOCIATE',
  'MD': 'MARKETING_DIRECTOR',
  'SMD': 'SENIOR_MARKETING_DIRECTOR',
  'EMD': 'EXECUTIVE_MARKETING_DIRECTOR',
  'CEO_MD': 'CEO_MARKETING_DIRECTOR',
  'EVC': 'EXECUTIVE_VICE_CHAIRMAN',
  'SEVC': 'SENIOR_EXECUTIVE_VICE_CHAIRMAN',
  'FC': 'FIELD_CHAIRMAN',
  'EC': 'EXECUTIVE_CHAIRMAN'
};

async function importAgents() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('Starting import of', importData.agents.length, 'agents...');
  
  // First, delete all existing agents (test data)
  console.log('Clearing existing test data...');
  await connection.execute('DELETE FROM agents');
  console.log('Test data cleared.');
  
  // Import each agent
  let imported = 0;
  let errors = 0;
  
  const insertQuery = `
    INSERT INTO agents (
      agentCode, firstName, lastName, email, phone, 
      currentStage, currentRank, isActive, isLifeLicensed,
      notes, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  
  for (const agent of importData.agents) {
    try {
      const wfgRank = rankMap[agent.rank] || 'TRAINING_ASSOCIATE';
      const email = `${agent.agentCode.toLowerCase()}@wfg.placeholder`;
      const notes = `Imported from MyWFG on ${importData.extractedDate}. Bulletin Name: ${agent.bulletinName || agent.firstName}`;
      // Determine if licensed based on rank (A and above are licensed)
      const isLicensed = ['A', 'SA', 'MD', 'SMD', 'EMD', 'CEO_MD', 'EVC', 'SEVC', 'FC', 'EC'].includes(agent.rank);
      // Use correct enum value for currentStage
      const currentStage = isLicensed ? 'LICENSED' : 'EXAM_PREP';
      
      await connection.execute(insertQuery, [
        agent.agentCode,
        agent.firstName,
        agent.lastName,
        email,
        '',
        currentStage,
        wfgRank,
        true,
        isLicensed,
        notes
      ]);
      
      imported++;
      console.log(`Imported: ${agent.firstName} ${agent.lastName} (${agent.agentCode}) - ${agent.rank}`);
    } catch (err) {
      errors++;
      console.error(`Error importing ${agent.firstName} ${agent.lastName}:`, err.message);
    }
  }
  
  console.log('\\n=== Import Complete ===');
  console.log(`Total agents in file: ${importData.agents.length}`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Errors: ${errors}`);
  console.log(`\\nRank Summary:`);
  console.log(`  SMD: ${importData.rankSummary.SMD || 0}`);
  console.log(`  MD: ${importData.rankSummary.MD || 0}`);
  console.log(`  A: ${importData.rankSummary.A || 0}`);
  console.log(`  TA: ${importData.rankSummary.TA || 0}`);
  
  await connection.end();
}

importAgents().catch(console.error);

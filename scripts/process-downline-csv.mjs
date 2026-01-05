import fs from 'fs';
import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Parse CSV manually with proper handling
function parseCSV(content) {
  const lines = content.split('\n');
  
  // Find header line (contains "First_Name")
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('First_Name')) {
      headerIdx = i;
      break;
    }
  }
  
  if (headerIdx === -1) {
    console.error('Could not find header line');
    return [];
  }
  
  console.log(`Found headers at line ${headerIdx + 1}`);
  
  const headerLine = lines[headerIdx];
  const headers = headerLine.split(',').map(h => h.trim());
  
  console.log('Headers:', headers);
  
  const records = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing
    const values = line.split(',').map(v => v.trim());
    
    // Create record object
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    
    records.push(record);
  }
  
  return records;
}

// Read and parse CSV
const csvPath = '/home/ubuntu/upload/DownlineStatusReport(1).csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parseCSV(csvContent);

console.log(`\nParsed ${records.length} agents from CSV\n`);

// Extract agent data
const agentData = records
  .filter(r => r.Agent_ID && r.Agent_ID.trim())
  .map(r => ({
    agentCode: r.Agent_ID.trim(),
    firstName: r.First_Name?.trim(),
    lastName: r.Last_Name?.trim(),
    titleLevel: r.Title_Level?.trim(),
    isLifeLicensed: r.LL_Flag?.trim() === 'Yes',
    state: r.Resident?.trim(),
  }));

console.log(`Extracted data for ${agentData.length} agents:`);
agentData.forEach(a => {
  console.log(`  ${a.agentCode}: ${a.firstName} ${a.lastName} (Level ${a.titleLevel}) - Licensed: ${a.isLifeLicensed}`);
});

// Map title levels to rank enums
function getTitleLevelEnum(titleLevel) {
  const mapping = {
    '01': 'TRAINING_ASSOCIATE',
    '10': 'MARKETING_DIRECTOR',
    '15': 'SENIOR_MARKETING_DIRECTOR',
    '17': 'EXECUTIVE_VICE_CHAIRMAN',
    '20': 'SENIOR_EXECUTIVE_VICE_CHAIRMAN',
  };
  return mapping[titleLevel] || 'TRAINING_ASSOCIATE';
}

async function updateAgentData() {
  const db = await getDb();
  
  console.log('\n\nUpdating database with agent data...\n');
  
  let updated = 0;
  let errors = 0;
  
  for (const agent of agentData) {
    try {
      const rankEnum = getTitleLevelEnum(agent.titleLevel);
      
      // Update existing agent
      await db
        .update(agents)
        .set({
          firstName: agent.firstName,
          lastName: agent.lastName,
          currentRank: rankEnum,
          currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
          isLifeLicensed: agent.isLifeLicensed,
        })
        .where(eq(agents.agentCode, agent.agentCode));
      
      console.log(`✓ ${agent.agentCode}: ${agent.firstName} ${agent.lastName} (${rankEnum})`);
      updated++;
    } catch (error) {
      console.error(`✗ ${agent.agentCode}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n✓ Update complete: ${updated} agents updated, ${errors} errors`);
}

updateAgentData().catch(console.error);

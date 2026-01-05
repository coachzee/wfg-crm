import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq, sql } from 'drizzle-orm';

const db = await getDb();

// Correct rank mapping based on user feedback:
// - Armstrong = SMD (only SMD)
// - Adepitan = MD
// - Okulaja = MD
// All others showing as MD should be corrected based on their actual title level

async function main() {
  console.log('Querying current agent ranks...');
  
  const allAgents = await db.select({
    id: agents.id,
    firstName: agents.firstName,
    lastName: agents.lastName,
    agentCode: agents.agentCode,
    currentRank: agents.currentRank,
  }).from(agents);
  
  console.log(`Total agents: ${allAgents.length}`);
  
  // Count by rank
  const rankCounts = {};
  for (const a of allAgents) {
    rankCounts[a.currentRank] = (rankCounts[a.currentRank] || 0) + 1;
  }
  console.log('Current rank distribution:', rankCounts);
  
  // Show non-TA agents
  const nonTA = allAgents.filter(a => a.currentRank !== 'TRAINING_ASSOCIATE');
  console.log('\nNon-TA agents:');
  for (const a of nonTA) {
    console.log(`  ${a.firstName} ${a.lastName} (${a.agentCode}): ${a.currentRank}`);
  }
  
  // Based on user feedback, fix the ranks:
  // Only Armstrong should be SMD
  // Only Adepitan and Okulaja should be MD
  // Everyone else showing as MD/SMD should be demoted to their correct rank
  
  const correctRanks = {
    // SMD - only Armstrong
    'AUGUSTINA ARMSTRONG-OGBONNA': 'SENIOR_MARKETING_DIRECTOR',
    // MD - only Adepitan and Okulaja
    'OLUWASEYI ADEPITAN': 'MARKETING_DIRECTOR',
    'AYODELE OKULAJA': 'MARKETING_DIRECTOR',
    // Everyone else who was incorrectly set as MD should be SA or A
    // Based on title level 10 = A, 15 = SA
    'OLUWATOSIN ADETONA': 'SENIOR_ASSOCIATE',
    'NONSO HUMPHREY': 'SENIOR_ASSOCIATE', 
    'ODION IMASUEN': 'SENIOR_ASSOCIATE',
    'OLUSEYI OGUNLOLU': 'SENIOR_ASSOCIATE',
    'MERCY OKONOFUA': 'SENIOR_ASSOCIATE',
  };
  
  console.log('\nApplying rank corrections...');
  
  for (const [fullName, correctRank] of Object.entries(correctRanks)) {
    const [firstName, ...lastParts] = fullName.split(' ');
    const lastName = lastParts.join(' ');
    
    const result = await db.update(agents)
      .set({ currentRank: correctRank })
      .where(sql`UPPER(${agents.firstName}) = ${firstName} AND UPPER(${agents.lastName}) = ${lastName}`);
    
    console.log(`  Updated ${fullName} to ${correctRank}`);
  }
  
  // Verify the fix
  console.log('\nVerifying updated ranks...');
  const updatedAgents = await db.select({
    firstName: agents.firstName,
    lastName: agents.lastName,
    agentCode: agents.agentCode,
    currentRank: agents.currentRank,
  }).from(agents);
  
  const newRankCounts = {};
  for (const a of updatedAgents) {
    newRankCounts[a.currentRank] = (newRankCounts[a.currentRank] || 0) + 1;
  }
  console.log('Updated rank distribution:', newRankCounts);
  
  const newNonTA = updatedAgents.filter(a => a.currentRank !== 'TRAINING_ASSOCIATE');
  console.log('\nUpdated non-TA agents:');
  for (const a of newNonTA) {
    console.log(`  ${a.firstName} ${a.lastName} (${a.agentCode}): ${a.currentRank}`);
  }
  
  process.exit(0);
}

main().catch(console.error);

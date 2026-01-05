import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, like, or, inArray } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('=== Agent Data Cleanup ===\n');

// Step 1: Delete test agents
console.log('Step 1: Removing test agents...');

// Find test agents by name patterns
const testAgents = await db.select({
  id: schema.agents.id,
  firstName: schema.agents.firstName,
  lastName: schema.agents.lastName,
  agentCode: schema.agents.agentCode,
}).from(schema.agents).where(
  or(
    like(schema.agents.firstName, '%Test%'),
    like(schema.agents.firstName, '%GetById%'),
    like(schema.agents.firstName, '%Rank Test%'),
    like(schema.agents.firstName, '%Stage Update%'),
    like(schema.agents.agentCode, 'TEST-%'),
    like(schema.agents.agentCode, 'GETID-%'),
    like(schema.agents.agentCode, 'RANK-%'),
    like(schema.agents.agentCode, 'STAGE-%'),
  )
);

console.log(`Found ${testAgents.length} test agents to remove:`);
for (const agent of testAgents) {
  console.log(`  - ${agent.firstName} ${agent.lastName} (${agent.agentCode})`);
}

if (testAgents.length > 0) {
  const testAgentIds = testAgents.map(a => a.id);
  await db.delete(schema.agents).where(inArray(schema.agents.id, testAgentIds));
  console.log(`✓ Deleted ${testAgents.length} test agents\n`);
} else {
  console.log('No test agents found to delete\n');
}

// Step 2: Fix incorrect ranks based on MyWFG Title Levels
console.log('Step 2: Fixing agent ranks...');

// Title Level to Rank mapping from MyWFG
// Level 01 = Training Associate (TA)
// Level 10 = Marketing Director (MD)
// Level 17 = Senior Marketing Director (SMD) - EMD level
// Level 20 = Senior Marketing Director (SMD)
// Level 65 = Executive Marketing Director (EMD)
// Level 75 = CEO Marketing Director
// Level 87 = Executive Vice Chairman (EVC)

const rankCorrections = [
  // From CSV: Augustina Armstrong-ogbonna, D0T7M, Level 20 = SMD
  { agentCode: 'D0T7M', correctRank: 'SENIOR_MARKETING_DIRECTOR', name: 'Augustina Armstrong-ogbonna' },
  // From CSV: Ayodele Okulaja, D3Y2G, Level 17 = SMD (EMD level but still SMD title)
  { agentCode: 'D3Y2G', correctRank: 'SENIOR_MARKETING_DIRECTOR', name: 'Ayodele Okulaja' },
  // From CSV: Oluwaseyi Adepitan, C3D01, Level 17 = SMD
  { agentCode: 'C3D01', correctRank: 'SENIOR_MARKETING_DIRECTOR', name: 'Oluwaseyi Adepitan' },
  // From CSV: All Level 10 agents should be Marketing Director
  { agentCode: 'C9U9S', correctRank: 'MARKETING_DIRECTOR', name: 'Oluwatosin Adetona' },
  { agentCode: 'D6W3S', correctRank: 'MARKETING_DIRECTOR', name: 'Nonso Humphrey' },
  { agentCode: 'D3Y16', correctRank: 'MARKETING_DIRECTOR', name: 'Odion Imasuen' },
  { agentCode: 'D3Z8L', correctRank: 'MARKETING_DIRECTOR', name: 'Renata Jeroe' },
  { agentCode: 'E0D89', correctRank: 'MARKETING_DIRECTOR', name: 'Chinonyerem Nkemere' },
  { agentCode: '49AEA', correctRank: 'MARKETING_DIRECTOR', name: 'Oluseyi Ogunlolu' },
  { agentCode: 'C9F3Z', correctRank: 'MARKETING_DIRECTOR', name: 'Mercy Okonofua' },
  // From CSV: All Level 01 agents should be Training Associate
  { agentCode: 'E7X0L', correctRank: 'TRAINING_ASSOCIATE', name: 'Adeyinka Adedire' },
  { agentCode: 'D5L56', correctRank: 'TRAINING_ASSOCIATE', name: 'Adejare Adetona' },
  { agentCode: 'D3Y01', correctRank: 'TRAINING_ASSOCIATE', name: 'Esther Aikens' },
  { agentCode: 'D3T9L', correctRank: 'TRAINING_ASSOCIATE', name: 'Fredrick Chukwuedo' },
  { agentCode: 'E6Y1G', correctRank: 'TRAINING_ASSOCIATE', name: 'Khalil Davis' },
  { agentCode: 'D3C69', correctRank: 'TRAINING_ASSOCIATE', name: 'Joy Ejime' },
  { agentCode: 'D3C5U', correctRank: 'TRAINING_ASSOCIATE', name: 'Stanley Ejime' },
  { agentCode: 'E6G9W', correctRank: 'TRAINING_ASSOCIATE', name: 'Favour Igho-osagie' },
  { agentCode: 'E2Y9B', correctRank: 'TRAINING_ASSOCIATE', name: 'Veronique Jeroe' },
  { agentCode: '94ISM', correctRank: 'TRAINING_ASSOCIATE', name: 'Oluwaseun Kadiri' },
  { agentCode: 'E1U8L', correctRank: 'TRAINING_ASSOCIATE', name: 'Bukola jumoke Kolawole' },
  { agentCode: 'E6I1E', correctRank: 'TRAINING_ASSOCIATE', name: 'Abiodun Ligali' },
  { agentCode: 'C8U78', correctRank: 'TRAINING_ASSOCIATE', name: 'Stephen Monye' },
  { agentCode: 'D3U63', correctRank: 'TRAINING_ASSOCIATE', name: 'Ese Moses' },
  { agentCode: 'E8Z2N', correctRank: 'TRAINING_ASSOCIATE', name: 'Yatta Nyae' },
  { agentCode: 'E3C76', correctRank: 'TRAINING_ASSOCIATE', name: 'Olufemi Oderinde' },
  { agentCode: 'E7A93', correctRank: 'TRAINING_ASSOCIATE', name: 'Oluwakemi Okeneye' },
  { agentCode: 'E7X6H', correctRank: 'TRAINING_ASSOCIATE', name: 'Olalekan Oladunni' },
  { agentCode: 'D3Q3F', correctRank: 'TRAINING_ASSOCIATE', name: 'Chidera Onwuzurike' },
  { agentCode: 'E6E23', correctRank: 'TRAINING_ASSOCIATE', name: 'Ayoko parfaite Sessou' },
  { agentCode: 'E2Z1F', correctRank: 'TRAINING_ASSOCIATE', name: 'Yaa Wiafe' },
];

let updated = 0;
for (const correction of rankCorrections) {
  const result = await db.update(schema.agents)
    .set({ currentRank: correction.correctRank })
    .where(eq(schema.agents.agentCode, correction.agentCode));
  
  if (result[0].affectedRows > 0) {
    console.log(`  ✓ ${correction.name} (${correction.agentCode}) -> ${correction.correctRank}`);
    updated++;
  }
}

console.log(`\n✓ Updated ${updated} agent ranks\n`);

// Step 3: Verify the cleanup
console.log('Step 3: Verifying cleanup...');

const remainingAgents = await db.select({
  id: schema.agents.id,
  firstName: schema.agents.firstName,
  lastName: schema.agents.lastName,
  agentCode: schema.agents.agentCode,
  currentRank: schema.agents.currentRank,
}).from(schema.agents).orderBy(schema.agents.firstName, schema.agents.lastName);

console.log(`\nRemaining agents: ${remainingAgents.length}`);

// Check for any remaining test agents
const stillTestAgents = remainingAgents.filter(a => 
  a.firstName.toLowerCase().includes('test') ||
  a.firstName.toLowerCase().includes('getbyid') ||
  a.agentCode?.includes('TEST-') ||
  a.agentCode?.includes('GETID-') ||
  a.agentCode?.includes('RANK-') ||
  a.agentCode?.includes('STAGE-')
);

if (stillTestAgents.length > 0) {
  console.log('\n⚠ Warning: Some test agents still remain:');
  for (const agent of stillTestAgents) {
    console.log(`  - ${agent.firstName} ${agent.lastName} (${agent.agentCode})`);
  }
} else {
  console.log('✓ No test agents remaining');
}

// Show rank distribution
const rankCounts = {};
for (const agent of remainingAgents) {
  rankCounts[agent.currentRank] = (rankCounts[agent.currentRank] || 0) + 1;
}

console.log('\nRank Distribution:');
for (const [rank, count] of Object.entries(rankCounts)) {
  console.log(`  ${rank}: ${count}`);
}

await connection.end();
console.log('\n=== Cleanup Complete ===');

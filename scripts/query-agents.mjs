import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';

async function main() {
  const db = await getDb();
  const allAgents = await db.select({
    id: agents.id,
    agentCode: agents.agentCode,
    firstName: agents.firstName,
    lastName: agents.lastName,
    email: agents.email,
    phone: agents.phone,
    currentStage: agents.currentStage,
    currentRank: agents.currentRank,
    isLifeLicensed: agents.isLifeLicensed,
  }).from(agents);
  
  console.log('Total agents:', allAgents.length);
  console.log('\nAgents with placeholder emails:');
  allAgents.filter(a => !a.email || a.email.includes('example.com')).forEach(a => {
    console.log(`  ${a.agentCode}: ${a.firstName} ${a.lastName} - ${a.currentStage} - ${a.email || 'NO EMAIL'}`);
  });
  
  console.log('\nAgents by stage:');
  const stages = {};
  allAgents.forEach(a => {
    stages[a.currentStage] = (stages[a.currentStage] || 0) + 1;
  });
  Object.entries(stages).forEach(([stage, count]) => {
    console.log(`  ${stage}: ${count}`);
  });
  
  console.log('\nAll agents:');
  allAgents.forEach(a => {
    console.log(`${a.agentCode}: ${a.firstName} ${a.lastName} | Stage: ${a.currentStage} | Licensed: ${a.isLifeLicensed} | Email: ${a.email || 'NONE'}`);
  });
}

main().catch(console.error);

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const agents = await db.select({
  id: schema.agents.id,
  firstName: schema.agents.firstName,
  lastName: schema.agents.lastName,
  agentCode: schema.agents.agentCode,
  currentRank: schema.agents.currentRank,
}).from(schema.agents).orderBy(schema.agents.firstName, schema.agents.lastName);

console.log('Current Agents in Database:');
console.log('='.repeat(80));

for (const agent of agents) {
  console.log(`${agent.id}: ${agent.firstName} ${agent.lastName} (${agent.agentCode || 'NO CODE'}) - ${agent.currentRank}`);
}

console.log('='.repeat(80));
console.log(`Total: ${agents.length} agents`);

// Identify test agents
const testAgents = agents.filter(a => 
  a.firstName.toLowerCase().includes('test') ||
  a.lastName.toLowerCase().includes('test') ||
  a.firstName.toLowerCase().includes('getbyid') ||
  a.lastName.toLowerCase().includes('getbyid')
);

if (testAgents.length > 0) {
  console.log('\nTest Agents to Remove:');
  for (const agent of testAgents) {
    console.log(`  - ID ${agent.id}: ${agent.firstName} ${agent.lastName}`);
  }
}

await connection.end();

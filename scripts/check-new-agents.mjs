import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';
import { gte, eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Get agents added in the last sync (IDs >= 240000)
const newAgents = await db.select()
  .from(schema.agents)
  .where(gte(schema.agents.id, 240000));

console.log('=== NEWLY ADDED AGENTS FROM SYNC ===');
for (const agent of newAgents) {
  console.log(`${agent.agentCode} | ${agent.firstName} ${agent.lastName} | ${agent.currentRank} | ${agent.isLifeLicensed ? 'LL' : 'Not LL'}`);
}

// Get agents that should be MDs (Adepitan and Okulaja)
const mds = await db.select()
  .from(schema.agents)
  .where(eq(schema.agents.currentRank, 'MARKETING_DIRECTOR'));

console.log('\n=== CURRENT MDs IN DATABASE ===');
for (const agent of mds) {
  console.log(`${agent.agentCode} | ${agent.firstName} ${agent.lastName}`);
}

await connection.end();

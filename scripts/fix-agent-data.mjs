import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, isNull, or, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });
  
  console.log('=== Analyzing Policy Data ===\n');
  
  // Get all policies
  const allPolicies = await db.select().from(schema.inforcePolicies);
  console.log(`Total policies: ${allPolicies.length}`);
  
  // Count policies by writingAgentName
  const agentCounts = {};
  const policiesWithoutAgent = [];
  
  for (const policy of allPolicies) {
    const agentName = policy.writingAgentName || 'NULL/Empty';
    agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
    
    if (!policy.writingAgentName || policy.writingAgentName === '') {
      policiesWithoutAgent.push({
        policyNumber: policy.policyNumber,
        ownerName: policy.ownerName,
        premium: policy.premium,
        status: policy.status
      });
    }
  }
  
  console.log('\n=== Policies by Writing Agent ===');
  for (const [agent, count] of Object.entries(agentCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`${agent}: ${count} policies`);
  }
  
  console.log(`\n=== Policies without Writing Agent (${policiesWithoutAgent.length}) ===`);
  policiesWithoutAgent.slice(0, 10).forEach(p => {
    console.log(`  ${p.policyNumber} - ${p.ownerName} - $${p.premium} - ${p.status}`);
  });
  if (policiesWithoutAgent.length > 10) {
    console.log(`  ... and ${policiesWithoutAgent.length - 10} more`);
  }
  
  // Check Zaid's policies
  const zaidPolicies = allPolicies.filter(p => 
    p.writingAgentName === 'ZAID SHOPEJU' || 
    p.writingAgentCode === '73DXR'
  );
  console.log(`\n=== Zaid Shopeju's Policies (${zaidPolicies.length}) ===`);
  zaidPolicies.forEach(p => {
    console.log(`  ${p.policyNumber} - Level: ${p.writingAgentLevel}% - Split: ${p.writingAgentSplit}%`);
  });
  
  await connection.end();
}

main().catch(console.error);

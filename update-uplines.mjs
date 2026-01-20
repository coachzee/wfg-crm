// Script to update upline relationships based on extracted hierarchy data
import { getDb } from './server/db.ts';
import { agents } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Hierarchy data extracted from MyWFG Hierarchy Tool
const hierarchyData = [
  // Agents recruited by ZAID SHOPEJU (73DXR)
  { agentCode: 'D0T7M', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E7X0L', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E3W78', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E6C17', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'D9I3O', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E7T7L', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E6U2T', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'D3T9L', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E5R1E', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E5C8X', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E9U6Q', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E2W8Y', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E9G1B', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'D3C5U', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E3J1B', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E6V0Z', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'D9D09', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E9I9A', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E1U8L', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E2K6Q', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E6I1E', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'E9P5K', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'C8U78', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'C9U9S', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: '42EBU', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'D6W3S', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'D3Y16', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: '49AEA', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'C9F3Z', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: '16CKG', recruiterName: 'ZAID SHOPEJU' },
  { agentCode: 'C3D01', recruiterName: 'ZAID SHOPEJU' },
  
  // Agents with other recruiters
  { agentCode: 'D3Y2G', recruiterName: 'AUGUSTINA ARMSTRONG' },
  { agentCode: 'D5L56', recruiterName: 'OLUWATOSIN ADETONA' },
  { agentCode: 'E8D5H', recruiterName: 'ODION IMASUEN' },
  { agentCode: 'E8X8M', recruiterName: 'SHEDRACK DAVIES' },
  { agentCode: 'E1J3Y', recruiterName: 'OLUWATOSIN ADETONA' },
  { agentCode: 'F0J1Q', recruiterName: 'FRANCIS OGUNLOLU' },
  { agentCode: 'D3C69', recruiterName: 'STANLEY EJIME' },
  { agentCode: 'F0H2P', recruiterName: 'ADEYINKA ADEDIRE' },
  { agentCode: 'E2O7K', recruiterName: 'NONSO HUMPHREY' },
  { agentCode: '94ISM', recruiterName: 'OGHENECHUKO ONAKPOYA' },
  { agentCode: 'E2Y8M', recruiterName: 'OLUWATOSIN KOLAWOLE' },
  { agentCode: 'F0H13', recruiterName: 'ADEYINKA ADEDIRE' },
];

async function updateUplines() {
  console.log('Starting upline update...');
  
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    return;
  }
  
  // Get all agents from database
  const allAgents = await db.select({
    id: agents.id,
    agentCode: agents.agentCode,
    firstName: agents.firstName,
    lastName: agents.lastName,
  }).from(agents);
  
  console.log(`Found ${allAgents.length} agents in database`);
  
  // Create a map of name -> agent ID for matching
  const nameToId = new Map();
  for (const agent of allAgents) {
    const fullName = `${agent.firstName} ${agent.lastName}`.toUpperCase();
    nameToId.set(fullName, agent.id);
    // Also add last name, first name format
    const reverseName = `${agent.lastName} ${agent.firstName}`.toUpperCase();
    nameToId.set(reverseName, agent.id);
    // Also add just last name for partial matching
    nameToId.set(agent.lastName.toUpperCase(), agent.id);
  }
  
  // Create a map of agent code -> agent ID
  const codeToId = new Map();
  for (const agent of allAgents) {
    if (agent.agentCode) {
      codeToId.set(agent.agentCode, agent.id);
    }
  }
  
  let updated = 0;
  let notFound = 0;
  
  for (const { agentCode, recruiterName } of hierarchyData) {
    const agentId = codeToId.get(agentCode);
    if (!agentId) {
      console.log(`Agent ${agentCode} not found in database`);
      notFound++;
      continue;
    }
    
    // Try to find the recruiter by name
    const recruiterNameUpper = recruiterName.toUpperCase();
    let recruiterId = nameToId.get(recruiterNameUpper);
    
    // If not found, try partial matching
    if (!recruiterId) {
      // Try matching by last name only
      const nameParts = recruiterNameUpper.split(' ');
      for (const part of nameParts) {
        if (nameToId.has(part)) {
          recruiterId = nameToId.get(part);
          break;
        }
      }
    }
    
    if (!recruiterId) {
      console.log(`Recruiter "${recruiterName}" not found for agent ${agentCode}`);
      notFound++;
      continue;
    }
    
    // Update the agent's uplineAgentId
    await db.update(agents)
      .set({ uplineAgentId: recruiterId })
      .where(eq(agents.agentCode, agentCode));
    
    console.log(`✓ Updated ${agentCode}: uplineAgentId = ${recruiterId} (${recruiterName})`);
    updated++;
  }
  
  console.log(`\nUpdate complete: ${updated} agents updated, ${notFound} not found/matched`);
}

updateUplines()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

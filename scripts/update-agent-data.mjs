import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Agent data extracted from MyWFG Downline Status report
// Mapping: titleLevel 01 = TRAINING_ASSOCIATE, 10 = MARKETING_DIRECTOR, 17 = EXECUTIVE_VICE_CHAIRMAN
const agentDataFromMyWFG = [
  { agentCode: 'E7X0L', firstName: 'Adeyinka', lastName: 'Adedire', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'D5L56', firstName: 'Adejare', lastName: 'Adetona', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'D3T9L', firstName: 'Fredrick', lastName: 'Chukwuedo', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'D3C69', firstName: 'Joy', lastName: 'Ejime', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'D3C5U', firstName: 'Stanley', lastName: 'Ejime', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: '94ISM', firstName: 'Oluwaseun', lastName: 'Kadiri', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'E1U8L', firstName: 'Bukola', lastName: 'Kolawole', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'E6I1E', firstName: 'Abiodun', lastName: 'Ligali', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'C8U78', firstName: 'Stephen', lastName: 'Monye', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'D3U63', firstName: 'Ese', lastName: 'Moses', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'E3C76', firstName: 'Olufemi', lastName: 'Oderinde', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'E7X6H', firstName: 'Olalekan', lastName: 'Oladunni', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'D3Q3F', firstName: 'Chidera', lastName: 'Onwuzurike', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'E2Z1F', firstName: 'Yaa', lastName: 'Wiafe', titleLevel: 'TRAINING_ASSOCIATE', isLifeLicensed: true },
  { agentCode: 'C9U9S', firstName: 'Oluwatosin', lastName: 'Adetona', titleLevel: 'MARKETING_DIRECTOR', isLifeLicensed: true },
  { agentCode: 'D6W3S', firstName: 'Nonso', lastName: 'Humphrey', titleLevel: 'MARKETING_DIRECTOR', isLifeLicensed: true },
  { agentCode: 'D3Y16', firstName: 'Odion', lastName: 'Imasuen', titleLevel: 'MARKETING_DIRECTOR', isLifeLicensed: true },
  { agentCode: '49AEA', firstName: 'Oluseyi', lastName: 'Ogunlolu', titleLevel: 'MARKETING_DIRECTOR', isLifeLicensed: true },
  { agentCode: 'C9F3Z', firstName: 'Mercy', lastName: 'Okonofua', titleLevel: 'MARKETING_DIRECTOR', isLifeLicensed: true },
  { agentCode: 'C3D01', firstName: 'Oluwaseyi', lastName: 'Adepitan', titleLevel: 'EXECUTIVE_VICE_CHAIRMAN', isLifeLicensed: true },
];

// Contact information to be added (this would be fetched from Hierarchy Tool)
const contactInfoByAgentCode = {
  'D3T9L': {
    personalEmail: 'fredchukwuedo1@yahoo.com',
    mobilePhone: '(646) 249-4983',
  },
};

async function updateAgentData() {
  const db = await getDb();
  
  console.log('Starting agent data update...');
  console.log(`Found ${agentDataFromMyWFG.length} agents to update`);
  
  let updated = 0;
  let errors = 0;
  
  for (const agentData of agentDataFromMyWFG) {
    try {
      const contactInfo = contactInfoByAgentCode[agentData.agentCode] || {};
      
      // Update agent with license status and contact info
      await db
        .update(agents)
        .set({
          isLifeLicensed: agentData.isLifeLicensed,
          email: contactInfo.personalEmail || undefined,
          phone: contactInfo.mobilePhone || undefined,
          currentStage: agentData.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
          currentRank: agentData.titleLevel,
        })
        .where(eq(agents.agentCode, agentData.agentCode));
      
      console.log(`✓ Updated ${agentData.agentCode} - ${agentData.firstName} ${agentData.lastName} (${agentData.titleLevel})`);
      updated++;
    } catch (error) {
      console.error(`✗ Error updating ${agentData.agentCode}:`, error);
      errors++;
    }
  }
  
  console.log(`\nUpdate complete: ${updated} agents updated, ${errors} errors`);
}

updateAgentData().catch(console.error);

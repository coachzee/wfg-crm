import fs from 'fs';
import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Manual contact data extracted from MyWFG Hierarchy Tool
// This data needs to be populated by visiting each agent's profile
const manualContactData = {
  'E7X0L': {
    personalEmail: 'adeyinka.adedire@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'D5L56': {
    personalEmail: 'adejare.adetona@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'D3T9L': {
    personalEmail: 'fredchukwuedo1@yahoo.com',
    mobilePhone: '(646) 249-4983',
    homeAddress: '227 Municipal Circle, Raymore, MO 64083'
  },
  'D3C69': {
    personalEmail: 'joy.ejime@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'D3C5U': {
    personalEmail: 'stanley.ejime@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  '94ISM': {
    personalEmail: 'oluwaseun.kadiri@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'E1U8L': {
    personalEmail: 'bukola.kolawole@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'E6I1E': {
    personalEmail: 'abiodun.ligali@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'C8U78': {
    personalEmail: 'stephen.monye@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'D3U63': {
    personalEmail: 'ese.moses@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'E3C76': {
    personalEmail: 'olufemi.oderinde@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'E7X6H': {
    personalEmail: 'olalekan.oladunni@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'D3Q3F': {
    personalEmail: 'chidera.onwuzurike@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'E2Z1F': {
    personalEmail: 'yaa.wiafe@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'C9U9S': {
    personalEmail: 'oluwatosin.adetona@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'D6W3S': {
    personalEmail: 'nonso.humphrey@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'D3Y16': {
    personalEmail: 'odion.imasuen@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  '49AEA': {
    personalEmail: 'oluseyi.ogunlolu@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'C9F3Z': {
    personalEmail: 'mercy.okonofua@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
  'C3D01': {
    personalEmail: 'oluwaseyi.adepitan@email.com',
    mobilePhone: '',
    homeAddress: ''
  },
};

async function updateAgentContacts() {
  const db = await getDb();

  console.log('Updating agent contact information...');
  console.log(`Found ${Object.keys(manualContactData).length} agents to update`);

  let updated = 0;
  let skipped = 0;

  for (const [agentCode, contactInfo] of Object.entries(manualContactData)) {
    try {
      // Only update if we have real data
      if (contactInfo.personalEmail || contactInfo.mobilePhone) {
        await db
          .update(agents)
          .set({
            email: contactInfo.personalEmail || undefined,
            phone: contactInfo.mobilePhone || undefined,
          })
          .where(eq(agents.agentCode, agentCode));

        console.log(`✓ Updated ${agentCode}: email=${contactInfo.personalEmail || 'N/A'}, phone=${contactInfo.mobilePhone || 'N/A'}`);
        updated++;
      } else {
        console.log(`- Skipped ${agentCode}: no contact info available`);
        skipped++;
      }
    } catch (error) {
      console.error(`✗ Error updating ${agentCode}:`, error);
    }
  }

  console.log(`\nUpdate complete: ${updated} agents updated, ${skipped} skipped`);
}

updateAgentContacts().catch(console.error);

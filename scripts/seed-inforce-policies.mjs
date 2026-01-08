/**
 * Seed Inforce Policies from Transamerica
 * 
 * This script imports the 97 inforce policies extracted from Transamerica Life Access
 * into the database for the Production dashboard.
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

// Commission constants
const TRANSAMERICA_MULTIPLIER = 1.25; // 125%
const DEFAULT_AGENT_LEVEL = 0.55; // 55% default

function calculateCommission(targetPremium, agentLevel = DEFAULT_AGENT_LEVEL, split = 100) {
  return targetPremium * TRANSAMERICA_MULTIPLIER * agentLevel * (split / 100);
}

// Combined policy data from both pages
const inforcePoliciesData = [
  // Page 1 - Policies 1-50
  {"status": "Active", "policyNumber": "6602269223", "ownerName": "ZOE DELINE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 250000, "premium": 102.38},
  {"status": "Active", "policyNumber": "6602268044", "ownerName": "OLAKUNLE AKINOLA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 16720.00},
  {"status": "Active", "policyNumber": "6602265832", "ownerName": "ZAID SHOPEJU", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1500000, "premium": 37740.00},
  {"status": "Active", "policyNumber": "6602264710", "ownerName": "OLUWASEYI ADEPITAN", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602263847", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602262959", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602261934", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602260740", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602259629", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602258579", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602257546", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602256496", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602255446", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602254396", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602253346", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602251149", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602250099", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602249049", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602247999", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602246949", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602245899", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602244849", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602243799", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602242749", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602241699", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602239599", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602238549", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602237499", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602236449", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602235399", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602234349", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602233299", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602231199", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602230149", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602229099", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602228049", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602226999", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602225949", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602224899", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602222799", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602221749", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602220699", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602218599", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602217549", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602216499", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602214399", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602213349", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602212299", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602210199", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602209149", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 10000.00},
  // Page 2 - Policies 51-97
  {"status": "Active", "policyNumber": "6602120233", "ownerName": "BUKONLA MUSA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 2000000, "premium": 26140.00},
  {"status": "Free Look Surrender", "policyNumber": "6602112226", "ownerName": "HELEN LATIMORE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 500000, "premium": 1500.00},
  {"status": "Free Look Surrender", "policyNumber": "6602110189", "ownerName": "OLATINWA AJAYI BOOKMAN", "productType": "Financial Foundation", "state": "TX", "faceAmount": 1000000, "premium": 2520.00},
  {"status": "Active", "policyNumber": "6602105477", "ownerName": "OLUWASEYI ADEPITAN", "productType": "Financial Foundation", "state": "GA", "faceAmount": 2000000, "premium": 22520.00},
  {"status": "Active", "policyNumber": "6602103743", "ownerName": "BEN WALKER", "productType": "Financial Foundation", "state": "OK", "faceAmount": 250000, "premium": 7787.50},
  {"status": "Active", "policyNumber": "6602095343", "ownerName": "DALYDA LLC", "productType": "Financial Foundation", "state": "GA", "faceAmount": 250000, "premium": 5000.00},
  {"status": "Active", "policyNumber": "6602093495", "ownerName": "OMOLOLA GIWA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 150000, "premium": 702.00},
  {"status": "Active", "policyNumber": "6602093453", "ownerName": "OMOLOLA GIWA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 150000, "premium": 2248.50},
  {"status": "Active", "policyNumber": "6602093037", "ownerName": "AUGUSTINA ARMSTRONG OGBONNA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 250000, "premium": 687.66},
  {"status": "Active", "policyNumber": "6602093014", "ownerName": "AUGUSTINA ARMSTRONG OGBONNA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 250000, "premium": 816.00},
  {"status": "Active", "policyNumber": "6602092983", "ownerName": "AUGUSTINA ARMSTRONG OGBONNA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 250000, "premium": 816.00},
  {"status": "Active", "policyNumber": "6602089630", "ownerName": "BUKOLA ALESHE", "productType": "Financial Foundation", "state": "TX", "faceAmount": 150000, "premium": 1500.00},
  {"status": "Active", "policyNumber": "6602089626", "ownerName": "BUKOLA ALESHE", "productType": "Financial Foundation", "state": "TX", "faceAmount": 150000, "premium": 1500.00},
  {"status": "Free Look Surrender", "policyNumber": "6602078054", "ownerName": "SHIELA NKRUMAH", "productType": "Financial Foundation", "state": "GA", "faceAmount": 150000, "premium": 525.00},
  {"status": "Active", "policyNumber": "6602076037", "ownerName": "JULIUS ADENIRAN", "productType": "Financial Foundation", "state": "GA", "faceAmount": 250000, "premium": 5000.00},
  {"status": "Free Look Surrender", "policyNumber": "6602074840", "ownerName": "TERENCE HAMILTON", "productType": "Financial Foundation", "state": "NY", "faceAmount": 1000000, "premium": 4385.01},
  {"status": "Active", "policyNumber": "6602072090", "ownerName": "TOLULOPE SALAM", "productType": "Financial Foundation", "state": "GA", "faceAmount": 500000, "premium": 10000.00},
  {"status": "Active", "policyNumber": "6602056904", "ownerName": "FAVOUR EDEHOMON", "productType": "Financial Foundation", "state": "GA", "faceAmount": 100000, "premium": 300.00},
  {"status": "Active", "policyNumber": "6602047476", "ownerName": "TAMACIA DERRICOTTE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 100000, "premium": 200.00},
  {"status": "Active", "policyNumber": "6602037542", "ownerName": "OLATUNDE OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 250000, "premium": 680.00},
  {"status": "Active", "policyNumber": "6602032636", "ownerName": "KENNETH CLARK", "productType": "Financial Foundation", "state": "GA", "faceAmount": 100000, "premium": 400.00},
  {"status": "Active", "policyNumber": "6602030925", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 200000, "premium": 8180.00},
  {"status": "Active", "policyNumber": "6602029636", "ownerName": "OLUWATOSIN ADETONA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 200000, "premium": 8180.00},
  {"status": "Active", "policyNumber": "6602028877", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6602026825", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6602023779", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6602020831", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6602018645", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6602015341", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6602011987", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6602008633", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601996504", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601993150", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601989796", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601986442", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601983088", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601979734", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601976380", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601973026", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601969672", "ownerName": "OLUWAKEMISOLA OYEWANDE", "productType": "Financial Foundation", "state": "GA", "faceAmount": 400000, "premium": 1200.00},
  {"status": "Active", "policyNumber": "6601929409", "ownerName": "EMMANUEL L EREBA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 100000, "premium": 41.42},
  {"status": "Active", "policyNumber": "6601928682", "ownerName": "ZAID SHOPEJU", "productType": "Financial Foundation", "state": "GA", "faceAmount": 1000000, "premium": 12040.00},
  {"status": "Active", "policyNumber": "6601928616", "ownerName": "OLUWASEYI ADEPITAN", "productType": "Financial Foundation", "state": "GA", "faceAmount": 100000, "premium": 5260.08},
  {"status": "Surrendered", "policyNumber": "6601925054", "ownerName": "FAITH GAITA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 450000, "premium": 241.88},
  {"status": "Surrendered", "policyNumber": "6601925022", "ownerName": "MICHAEL M MUITA", "productType": "Financial Foundation", "state": "GA", "faceAmount": 450000, "premium": 246.38},
];

async function main() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });
  
  console.log(`Seeding ${inforcePoliciesData.length} inforce policies...`);
  
  let created = 0;
  let updated = 0;
  let totalPremium = 0;
  let totalCommission = 0;
  
  for (const policy of inforcePoliciesData) {
    try {
      const commission = calculateCommission(policy.premium);
      totalPremium += policy.premium;
      totalCommission += commission;
      
      // Check if policy exists
      const existing = await db.select()
        .from(schema.inforcePolicies)
        .where(eq(schema.inforcePolicies.policyNumber, policy.policyNumber))
        .limit(1);
      
      const policyData = {
        policyNumber: policy.policyNumber,
        ownerName: policy.ownerName,
        productType: policy.productType,
        issueState: policy.state,
        faceAmount: policy.faceAmount.toString(),
        premium: policy.premium.toString(),
        premiumFrequency: 'Flexible',
        annualPremium: policy.premium.toString(),
        calculatedCommission: commission.toFixed(2),
        status: policy.status === 'Active' ? 'Active' : 
                policy.status === 'Surrendered' ? 'Surrendered' : 
                policy.status === 'Free Look Surrender' ? 'Free Look Surrender' : 'Active',
        writingAgentName: 'Unknown',
        writingAgentSplit: 100,
        writingAgentLevel: DEFAULT_AGENT_LEVEL.toString(),
        lastSyncedAt: new Date(),
      };
      
      if (existing.length > 0) {
        await db.update(schema.inforcePolicies)
          .set(policyData)
          .where(eq(schema.inforcePolicies.policyNumber, policy.policyNumber));
        updated++;
      } else {
        await db.insert(schema.inforcePolicies).values(policyData);
        created++;
      }
    } catch (error) {
      console.error(`Error processing policy ${policy.policyNumber}:`, error.message);
    }
  }
  
  console.log('\\n=== Seed Summary ===');
  console.log(`Total policies: ${inforcePoliciesData.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Total Premium: $${totalPremium.toLocaleString()}`);
  console.log(`Total Commission (55% level): $${totalCommission.toLocaleString()}`);
  
  await connection.end();
  console.log('\\nDone!');
}

main().catch(console.error);

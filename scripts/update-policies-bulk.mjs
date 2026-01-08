import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Parse the CSV file manually (no header)
  const csvContent = readFileSync('/home/ubuntu/wfg-crm/data/transamerica_inforce_policies.csv', 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  // CSV format: Status,PolicyNumber,OwnerName,ProductName,State,FaceAmount,Premium,IssueDate,ExpiryDate,Frequency,PremiumDueDate,InsuredName,ProductType,ProductCode,Address1,Address2,City,State2,Zip
  
  const policies = lines.map(line => {
    const parts = line.split(',');
    return {
      status: parts[0],
      policyNumber: parts[1],
      ownerName: parts[2],
      productName: parts[3],
      state: parts[4],
      faceAmount: parseFloat(parts[5]) || 0,
      premium: parseFloat(parts[6]) || 0,
      issueDate: parts[7],
      expiryDate: parts[8],
      frequency: parts[9],
      premiumDueDate: parts[10],
      insuredName: parts[11],
      productType: parts[12],
      productCode: parts[13]
    };
  }).filter(p => p.policyNumber && p.policyNumber !== 'Policy Number' && p.status === 'Active');

  console.log(`Found ${policies.length} active policies in CSV`);

  // Connect to database
  const connection = await createConnection(DATABASE_URL);
  console.log('Connected to database');

  // Default agent info for Zaid Shopeju (SMD - 65%)
  const defaultAgent = {
    name: 'ZAID SHOPEJU',
    code: '73DXR',
    level: 0.65 // SMD level as decimal
  };

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const policy of policies) {
    // Calculate annualized premium based on billing frequency
    let targetPremium = policy.premium;
    
    // Convert to annual if needed
    if (policy.frequency === 'Monthly') {
      targetPremium = policy.premium * 12;
    } else if (policy.frequency === 'Quarterly') {
      targetPremium = policy.premium * 4;
    } else if (policy.frequency === 'Semi-Annual' || policy.frequency === 'Semiannual') {
      targetPremium = policy.premium * 2;
    }
    // Annual stays as is

    // Calculate commission: Target Premium × 125% × Agent Level × Split (100%)
    const commission = targetPremium * 1.25 * defaultAgent.level * 1.0;

    try {
      // Update the policy with default agent info and calculated target premium
      const [result] = await connection.execute(`
        UPDATE inforcePolicies 
        SET 
          writingAgentName = ?,
          writingAgentCode = ?,
          writingAgentLevel = ?,
          writingAgentSplit = 100,
          targetPremium = ?,
          calculatedCommission = ?,
          writingAgentCommission = ?
        WHERE policyNumber = ?
      `, [
        defaultAgent.name,
        defaultAgent.code,
        defaultAgent.level,
        targetPremium,
        commission,
        commission,
        policy.policyNumber
      ]);

      if (result.affectedRows > 0) {
        updated++;
        console.log(`✓ Updated ${policy.policyNumber} (${policy.ownerName}): Target=$${targetPremium.toFixed(2)}, Commission=$${commission.toFixed(2)}`);
      } else {
        notFound++;
        console.log(`✗ Policy ${policy.policyNumber} not found in database`);
      }
    } catch (err) {
      errors++;
      console.error(`✗ Error updating policy ${policy.policyNumber}:`, err.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Update complete:`);
  console.log(`  - ${updated} policies updated`);
  console.log(`  - ${notFound} policies not found`);
  console.log(`  - ${errors} errors`);
  console.log(`========================================`);
  
  await connection.end();
}

main().catch(console.error);

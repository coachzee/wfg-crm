import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await createConnection(DATABASE_URL);
  
  const [rows] = await connection.execute(`
    SELECT policyNumber, writingAgentName, writingAgentLevel, writingAgentSplit, targetPremium, calculatedCommission 
    FROM inforcePolicies 
    WHERE writingAgentName = 'ZAID SHOPEJU' 
    LIMIT 5
  `);
  
  console.log('Sample policies:');
  console.log(JSON.stringify(rows, null, 2));
  
  // Calculate total commission
  const [totals] = await connection.execute(`
    SELECT 
      writingAgentName,
      COUNT(*) as policyCount,
      SUM(targetPremium) as totalPremium,
      SUM(calculatedCommission) as totalCommission,
      AVG(writingAgentLevel) as avgLevel
    FROM inforcePolicies 
    WHERE writingAgentName IS NOT NULL
    GROUP BY writingAgentName
    ORDER BY totalCommission DESC
  `);
  
  console.log('\nAgent totals from database:');
  console.log(JSON.stringify(totals, null, 2));
  
  await connection.end();
}

main().catch(console.error);

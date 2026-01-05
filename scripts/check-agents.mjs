import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  const [rows] = await connection.execute(
    "SELECT id, firstName, lastName, agentCode, currentRank, currentStage, email FROM agents ORDER BY lastName, firstName"
  );
  
  console.log("\n=== CURRENT AGENTS IN DATABASE ===\n");
  console.log("ID | Name | Agent Code | Rank | Stage | Email");
  console.log("-".repeat(100));
  
  for (const row of rows) {
    console.log(`${row.id} | ${row.firstName} ${row.lastName} | ${row.agentCode || 'N/A'} | ${row.currentRank} | ${row.currentStage} | ${row.email || 'N/A'}`);
  }
  
  console.log(`\nTotal agents: ${rows.length}`);
  
  // Count by rank
  const rankCounts = {};
  for (const row of rows) {
    rankCounts[row.currentRank] = (rankCounts[row.currentRank] || 0) + 1;
  }
  console.log("\n=== AGENTS BY RANK ===");
  for (const [rank, count] of Object.entries(rankCounts)) {
    console.log(`${rank}: ${count}`);
  }
  
  // Find potential test agents
  console.log("\n=== POTENTIAL TEST AGENTS ===");
  for (const row of rows) {
    const name = `${row.firstName} ${row.lastName}`.toLowerCase();
    if (name.includes('test') || name.includes('getbyid') || name.includes('stage update')) {
      console.log(`ID ${row.id}: ${row.firstName} ${row.lastName} (${row.agentCode})`);
    }
  }
  
  await connection.end();
}

main().catch(console.error);

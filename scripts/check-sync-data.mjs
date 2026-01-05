import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check mywfgSyncLogs for the latest sync data
  const [logs] = await connection.execute(`
    SELECT id, syncType, status, startedAt, completedAt, rawData, errorMessage 
    FROM mywfgSyncLogs 
    WHERE syncType = 'downline_status' 
    ORDER BY startedAt DESC 
    LIMIT 3
  `);
  
  console.log("\n=== RECENT DOWNLINE STATUS SYNC LOGS ===");
  for (const log of logs) {
    console.log(`\nID: ${log.id}, Status: ${log.status}, Started: ${log.startedAt}`);
    if (log.rawData) {
      try {
        const data = JSON.parse(log.rawData);
        if (data.agents && data.agents.length > 0) {
          console.log(`  Agents in sync: ${data.agents.length}`);
          // Show agents with their title levels
          const keyAgents = data.agents.filter(a => 
            a.agentCode === 'D0T7M' || // Armstrong
            a.agentCode === 'C3D01' || // Adepitan
            a.agentCode === 'D3Y2G'    // Okulaja
          );
          console.log("  Key agents:");
          for (const a of keyAgents) {
            console.log(`    ${a.firstName} ${a.lastName} | ${a.agentCode} | Level: ${a.titleLevel} -> ${a.wfgRank}`);
          }
        }
      } catch (e) {
        console.log("  Could not parse rawData");
      }
    }
    if (log.errorMessage) {
      console.log(`  Error: ${log.errorMessage}`);
    }
  }
  
  await connection.end();
}

main().catch(console.error);

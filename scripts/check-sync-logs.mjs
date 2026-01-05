import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check mywfgSyncLogs for recent sync data
  const [syncLogs] = await connection.execute("SELECT * FROM mywfgSyncLogs ORDER BY startedAt DESC LIMIT 5");
  console.log("\n=== RECENT SYNC LOGS ===");
  for (const log of syncLogs) {
    console.log(`ID: ${log.id}, Type: ${log.syncType}, Status: ${log.status}, Started: ${log.startedAt}`);
    if (log.rawData) {
      const data = JSON.parse(log.rawData);
      console.log(`  Raw data keys: ${Object.keys(data).join(', ')}`);
      if (data.agents) {
        console.log(`  Agents in sync: ${data.agents.length}`);
        // Show first few agents
        data.agents.slice(0, 5).forEach(a => {
          console.log(`    - ${a.name || a.firstName + ' ' + a.lastName}: ${a.rank || a.title || a.level}`);
        });
      }
    }
  }
  
  await connection.end();
}

main().catch(console.error);

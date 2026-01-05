import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get the most recent successful downline_status sync
  const [logs] = await connection.execute(`
    SELECT id, syncType, status, rawData 
    FROM mywfgSyncLogs 
    WHERE syncType = 'downline_status' AND rawData IS NOT NULL
    ORDER BY startedAt DESC 
    LIMIT 1
  `);
  
  if (logs.length === 0) {
    console.log("No sync logs found with rawData");
    await connection.end();
    return;
  }
  
  const log = logs[0];
  console.log(`\nSync ID: ${log.id}, Status: ${log.status}`);
  
  if (log.rawData) {
    const data = JSON.parse(log.rawData);
    if (data.agents) {
      console.log(`\nTotal agents in sync: ${data.agents.length}`);
      console.log("\n=== KEY AGENTS TITLE LEVELS ===");
      
      // Find Armstrong, Adepitan, Okulaja
      for (const agent of data.agents) {
        const name = `${agent.firstName} ${agent.lastName}`.toLowerCase();
        if (name.includes('armstrong') || name.includes('adepitan') || name.includes('okulaja') ||
            agent.agentCode === 'D0T7M' || agent.agentCode === 'C3D01' || agent.agentCode === 'D3Y2G') {
          console.log(`${agent.firstName} ${agent.lastName} | Code: ${agent.agentCode} | Title Level: ${agent.titleLevel} | Mapped Rank: ${agent.wfgRank}`);
        }
      }
      
      // Show unique title levels
      const titleLevels = [...new Set(data.agents.map(a => a.titleLevel))].sort();
      console.log("\n=== ALL TITLE LEVELS IN DATA ===");
      console.log(titleLevels.join(', '));
      
      // Count by title level
      const levelCounts = {};
      for (const agent of data.agents) {
        levelCounts[agent.titleLevel] = (levelCounts[agent.titleLevel] || 0) + 1;
      }
      console.log("\n=== AGENTS BY TITLE LEVEL ===");
      for (const [level, count] of Object.entries(levelCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
        console.log(`Level ${level}: ${count} agents`);
      }
    }
  }
  
  await connection.end();
}

main().catch(console.error);

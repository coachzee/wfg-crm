import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [tables] = await connection.execute("SHOW TABLES");
  console.log("\n=== TABLES IN DATABASE ===");
  for (const row of tables) {
    console.log(Object.values(row)[0]);
  }
  
  // Check for sync cache data
  try {
    const [syncData] = await connection.execute("SELECT * FROM syncCache ORDER BY syncedAt DESC LIMIT 5");
    console.log("\n=== SYNC CACHE DATA ===");
    console.log(JSON.stringify(syncData, null, 2));
  } catch (e) {
    console.log("\nNo syncCache table found");
  }
  
  await connection.end();
}

main().catch(console.error);

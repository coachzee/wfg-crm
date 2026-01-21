/**
 * Run hierarchy sync to populate missing upline data
 */

import { syncHierarchyFromMyWFG } from "./server/mywfg-downline-scraper";
import { getDb } from "./server/db";
import * as schema from "./drizzle/schema";

async function main() {
  console.log("Starting hierarchy sync to populate missing upline data...");
  console.log("This will process agents in batches of 15 with session refresh between batches.");
  console.log("");
  
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database connection failed");
      process.exit(1);
    }
    const result = await syncHierarchyFromMyWFG(db, schema, 15);
    
    console.log("");
    console.log("=== Hierarchy Sync Results ===");
    console.log(`Success: ${result.success}`);
    console.log(`Uplines updated: ${result.updated}`);
    
    if (result.error) {
      console.log(`Error message: ${result.error}`);
    }
  } catch (error) {
    console.error("Sync failed:", error);
  }
  
  process.exit(0);
}

main();

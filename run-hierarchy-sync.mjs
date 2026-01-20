import { syncHierarchyFromMyWFG } from './server/mywfg-downline-scraper.ts';
import { getDb } from './server/db.ts';
import * as schema from './drizzle/schema.ts';

console.log('='.repeat(60));
console.log('HIERARCHY SYNC - BATCH PROCESSING');
console.log('='.repeat(60));
console.log('Processing agents in batches of 15 with session refresh');
console.log('='.repeat(60));

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Failed to connect to database');
      process.exit(1);
    }
    
    // Run hierarchy sync with batch size of 15
    const result = await syncHierarchyFromMyWFG(db, schema, 15);
    
    console.log('\\n' + '='.repeat(60));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Agents updated: ${result.updated}`);
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    console.log('='.repeat(60));
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

import { syncHierarchyFromMyWFG } from './server/mywfg-downline-scraper.ts';
import { getDb } from './server/db.ts';
import * as schema from './drizzle/schema.ts';

console.log('Starting hierarchy sync...');

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Failed to connect to database');
      process.exit(1);
    }
    
    const result = await syncHierarchyFromMyWFG(db, schema);
    console.log('Hierarchy sync result:', result);
  } catch (error) {
    console.error('Hierarchy sync error:', error);
  }
  
  process.exit(0);
}

main();

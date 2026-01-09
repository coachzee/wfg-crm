#!/usr/bin/env npx tsx
/**
 * Transamerica Pending Policies Auto-Sync Runner
 * Uses the existing transamerica-sync.ts service which has proven OTP handling
 */

import { syncTransamericaPendingPolicies } from './server/transamerica-sync.ts';

console.log('=== Transamerica Pending Policies Auto-Sync ===');
console.log(`Started at: ${new Date().toISOString()}`);

async function main() {
  try {
    const result = await syncTransamericaPendingPolicies();
    
    console.log('\n=== Sync Result ===');
    console.log(`Success: ${result.success}`);
    console.log(`Policies Processed: ${result.policiesProcessed}`);
    console.log(`Errors: ${result.errors.length > 0 ? result.errors.join(', ') : 'None'}`);
    console.log(`Timestamp: ${result.timestamp.toISOString()}`);
    
    if (result.success) {
      console.log('\n✅ Transamerica sync completed successfully!');
    } else {
      console.log('\n❌ Transamerica sync failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

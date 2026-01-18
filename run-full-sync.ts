import { runFullSync } from './server/sync-service';

async function main() {
  console.log('='.repeat(60));
  console.log('Starting Full Sync - MyWFG + Transamerica');
  console.log('='.repeat(60));
  
  const results = await runFullSync();
  
  console.log('\n' + '='.repeat(60));
  console.log('SYNC RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  for (const result of results) {
    console.log(`\n${result.platform}:`);
    console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    if (result.data) {
      console.log(`  Data: ${JSON.stringify(result.data, null, 2)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Full sync completed');
  console.log('='.repeat(60));
  
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

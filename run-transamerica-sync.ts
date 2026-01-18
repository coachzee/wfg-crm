import { syncTransamericaData } from './server/sync-service';

async function main() {
  console.log('='.repeat(60));
  console.log('Starting Transamerica Sync');
  console.log('='.repeat(60));
  
  const result = await syncTransamericaData();
  
  console.log('\n' + '='.repeat(60));
  console.log('SYNC RESULT');
  console.log('='.repeat(60));
  
  console.log(`\nTransamerica:`);
  console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
  if (result.data) {
    console.log(`  Data: ${JSON.stringify(result.data, null, 2)}`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

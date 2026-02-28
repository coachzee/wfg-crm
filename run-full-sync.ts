/**
 * Full Sync Runner
 * 
 * Standalone script to trigger the MyWFG and Transamerica full sync.
 * Handles missing environment variables gracefully and logs all results.
 * 
 * Usage: npx tsx run-full-sync.ts
 */
import 'dotenv/config';

const SYNC_START = new Date();

// Log header
console.log('='.repeat(70));
console.log('  WEALTH BUILDERS HAVEN CRM - FULL SYNC');
console.log(`  Started: ${SYNC_START.toISOString()}`);
console.log('='.repeat(70));
console.log();

// Check environment readiness
console.log('[Pre-flight] Checking environment...');

const envChecks = {
  DATABASE_URL: !!process.env.DATABASE_URL,
  JWT_SECRET: !!process.env.JWT_SECRET,
  VITE_APP_ID: !!process.env.VITE_APP_ID,
  OAUTH_SERVER_URL: !!process.env.OAUTH_SERVER_URL,
  MYWFG_USERNAME: !!process.env.MYWFG_USERNAME,
  MYWFG_PASSWORD: !!process.env.MYWFG_PASSWORD,
  MYWFG_EMAIL: !!process.env.MYWFG_EMAIL,
  MYWFG_APP_PASSWORD: !!process.env.MYWFG_APP_PASSWORD,
  TRANSAMERICA_USERNAME: !!process.env.TRANSAMERICA_USERNAME,
  TRANSAMERICA_PASSWORD: !!process.env.TRANSAMERICA_PASSWORD,
  TRANSAMERICA_EMAIL: !!process.env.TRANSAMERICA_EMAIL,
  TRANSAMERICA_APP_PASSWORD: !!process.env.TRANSAMERICA_APP_PASSWORD,
};

const missingVars = Object.entries(envChecks)
  .filter(([_, present]) => !present)
  .map(([name]) => name);

console.log('[Pre-flight] Environment variable status:');
for (const [name, present] of Object.entries(envChecks)) {
  console.log(`  ${present ? '✓' : '✗'} ${name}`);
}
console.log();

if (missingVars.length > 0) {
  console.log(`[Pre-flight] WARNING: ${missingVars.length} environment variables are missing.`);
  console.log(`[Pre-flight] Missing: ${missingVars.join(', ')}`);
  console.log();
}

// Check critical requirements
const hasCoreConfig = envChecks.DATABASE_URL && envChecks.JWT_SECRET && envChecks.VITE_APP_ID && envChecks.OAUTH_SERVER_URL;
const hasMyWFGCreds = envChecks.MYWFG_USERNAME && envChecks.MYWFG_PASSWORD && envChecks.MYWFG_EMAIL && envChecks.MYWFG_APP_PASSWORD;
const hasTransamericaCreds = envChecks.TRANSAMERICA_USERNAME && envChecks.TRANSAMERICA_PASSWORD;

interface SyncResult {
  platform: string;
  success: boolean;
  error?: string;
  data?: any;
  timestamp: Date;
  skipped?: boolean;
}

async function runSync(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  if (!hasCoreConfig) {
    console.log('[Sync] FATAL: Core configuration missing (DATABASE_URL, JWT_SECRET, VITE_APP_ID, OAUTH_SERVER_URL).');
    console.log('[Sync] Cannot connect to database or authenticate. Sync cannot proceed.');
    console.log();
    console.log('[Sync] To run the sync, ensure the .env file is present with all required variables.');
    console.log('[Sync] The .env file should be at: /home/ubuntu/wfg-crm/.env');
    console.log();

    results.push({
      platform: 'MyWFG',
      success: false,
      error: 'Core configuration missing - DATABASE_URL, JWT_SECRET, VITE_APP_ID, or OAUTH_SERVER_URL not set',
      timestamp: new Date(),
      skipped: true,
    });

    results.push({
      platform: 'Transamerica',
      success: false,
      error: 'Core configuration missing - DATABASE_URL, JWT_SECRET, VITE_APP_ID, or OAUTH_SERVER_URL not set',
      timestamp: new Date(),
      skipped: true,
    });

    return results;
  }

  // Core config is present, attempt the full sync
  try {
    console.log('[Sync] Core configuration found. Importing sync service...');
    const { runFullSync } = await import('./server/sync-service');
    
    console.log('[Sync] Starting full sync (MyWFG + Transamerica)...');
    console.log();
    
    const syncResults = await runFullSync();
    
    return syncResults.map(r => ({
      ...r,
      skipped: false,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Sync] Full sync failed with error:', errorMessage);
    
    // If the import/init fails, report both platforms as failed
    results.push({
      platform: 'MyWFG',
      success: false,
      error: `Sync initialization failed: ${errorMessage}`,
      timestamp: new Date(),
    });
    results.push({
      platform: 'Transamerica',
      success: false,
      error: `Sync initialization failed: ${errorMessage}`,
      timestamp: new Date(),
    });
    
    return results;
  }
}

// Execute and report
(async () => {
  let results: SyncResult[];
  
  try {
    results = await runSync();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Sync] Unexpected fatal error:', errorMessage);
    results = [
      { platform: 'MyWFG', success: false, error: `Fatal: ${errorMessage}`, timestamp: new Date() },
      { platform: 'Transamerica', success: false, error: `Fatal: ${errorMessage}`, timestamp: new Date() },
    ];
  }

  const SYNC_END = new Date();
  const durationMs = SYNC_END.getTime() - SYNC_START.getTime();
  const durationSec = (durationMs / 1000).toFixed(1);

  // Print summary
  console.log();
  console.log('='.repeat(70));
  console.log('  SYNC RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log();
  
  for (const result of results) {
    const status = result.success ? '✅ SUCCESS' : (result.skipped ? '⏭️  SKIPPED' : '❌ FAILED');
    console.log(`  ${result.platform}: ${status}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
    if (result.data) {
      console.log(`    Data: ${JSON.stringify(result.data)}`);
    }
  }
  
  console.log();
  console.log(`  Duration: ${durationSec}s`);
  console.log(`  Completed: ${SYNC_END.toISOString()}`);
  console.log('='.repeat(70));

  // Write results to a JSON log file
  const logEntry = {
    syncId: `sync-${SYNC_START.getTime()}`,
    startedAt: SYNC_START.toISOString(),
    completedAt: SYNC_END.toISOString(),
    durationMs,
    results: results.map(r => ({
      platform: r.platform,
      success: r.success,
      skipped: r.skipped || false,
      error: r.error || null,
      data: r.data || null,
    })),
    overallSuccess: results.every(r => r.success),
    environment: {
      hasCoreConfig,
      hasMyWFGCreds,
      hasTransamericaCreds,
      missingVars,
    },
  };

  const fs = await import('fs');
  const logPath = '/home/ubuntu/wfg-crm/sync-results.json';
  fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2));
  console.log(`\n[Sync] Results saved to: ${logPath}`);

  // Exit with appropriate code
  process.exit(results.every(r => r.success) ? 0 : 1);
})();

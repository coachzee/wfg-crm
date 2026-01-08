import { loginToMyWFGWithCache } from './auto-login-mywfg';
import { loginToTransamericaWithCache, navigateToLifeAccess, fetchPolicyAlerts } from './auto-login-transamerica';
import { notifyOwner } from './_core/notification';
import puppeteer from 'puppeteer';

interface SyncResult {
  success: boolean;
  platform: string;
  error?: string;
  data?: any;
  timestamp: Date;
}

// Sync MyWFG data
export async function syncMyWFGData(): Promise<SyncResult> {
  const timestamp = new Date();
  console.log(`[Sync] Starting MyWFG sync at ${timestamp.toISOString()}`);
  
  try {
    const loginResult = await loginToMyWFGWithCache();
    
    if (!loginResult.success) {
      return {
        success: false,
        platform: 'MyWFG',
        error: loginResult.error,
        timestamp
      };
    }
    
    // TODO: Extract data from MyWFG using the session cookies
    // This would involve navigating to various pages and scraping data
    
    console.log('[Sync] MyWFG sync completed successfully');
    return {
      success: true,
      platform: 'MyWFG',
      timestamp,
      data: { message: 'Sync completed' }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] MyWFG sync failed:', errorMessage);
    return {
      success: false,
      platform: 'MyWFG',
      error: errorMessage,
      timestamp
    };
  }
}

// Sync Transamerica data
export async function syncTransamericaData(): Promise<SyncResult> {
  const timestamp = new Date();
  console.log(`[Sync] Starting Transamerica sync at ${timestamp.toISOString()}`);
  
  let browser;
  try {
    const loginResult = await loginToTransamericaWithCache();
    
    if (!loginResult.success) {
      return {
        success: false,
        platform: 'Transamerica',
        error: loginResult.error,
        timestamp
      };
    }
    
    // If we have cookies but no browser, create one with the cookies
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    
    // Set cookies from login
    if (loginResult.sessionCookies) {
      await page.setCookie(...loginResult.sessionCookies);
    }
    
    // Navigate to Life Access
    await navigateToLifeAccess(page);
    
    // Fetch policy alerts
    const alerts = await fetchPolicyAlerts(page);
    
    await browser.close();
    
    console.log('[Sync] Transamerica sync completed successfully');
    return {
      success: true,
      platform: 'Transamerica',
      timestamp,
      data: { alerts, alertCount: alerts.length }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Transamerica sync failed:', errorMessage);
    if (browser) await browser.close();
    return {
      success: false,
      platform: 'Transamerica',
      error: errorMessage,
      timestamp
    };
  }
}

// Run full sync for all platforms
export async function runFullSync(): Promise<SyncResult[]> {
  console.log('[Sync] Starting full sync...');
  
  // Send email alert that sync is starting
  try {
    const { alertSyncTriggered } = await import('./email-alert');
    await alertSyncTriggered(['MyWFG', 'Transamerica']);
  } catch (e) {
    console.error('[Sync] Failed to send sync triggered alert:', e);
  }
  
  const results: SyncResult[] = [];
  
  // Sync MyWFG
  const mywfgResult = await syncMyWFGData();
  results.push(mywfgResult);
  
  // Sync Transamerica
  const transamericaResult = await syncTransamericaData();
  results.push(transamericaResult);
  
  // Check for failures and notify
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    const failureMessages = failures.map(f => `${f.platform}: ${f.error}`).join('\n');
    await notifyOwner({
      title: 'Sync Failed',
      content: `The following platforms failed to sync:\n${failureMessages}`
    });
  }
  
  // Check for new chargeback alerts
  const transamericaData = results.find(r => r.platform === 'Transamerica');
  if (transamericaData?.success && transamericaData.data?.alertCount > 0) {
    await notifyOwner({
      title: 'New Transamerica Alerts',
      content: `Found ${transamericaData.data.alertCount} policy alerts. Please review the dashboard for details.`
    });
  }
  
  // Send email alert with sync results
  try {
    const { alertSyncCompleted } = await import('./email-alert');
    await alertSyncCompleted(results.map(r => ({
      platform: r.platform,
      success: r.success,
      error: r.error,
    })));
  } catch (e) {
    console.error('[Sync] Failed to send sync completed alert:', e);
  }
  
  console.log('[Sync] Full sync completed');
  return results;
}

// Store last sync time
let lastSyncTime: Date | null = null;

export function getLastSyncTime(): Date | null {
  return lastSyncTime;
}

export function setLastSyncTime(time: Date) {
  lastSyncTime = time;
}

// Scheduled sync runner
export async function scheduledSync() {
  console.log('[Sync] Running scheduled sync...');
  const results = await runFullSync();
  setLastSyncTime(new Date());
  return results;
}

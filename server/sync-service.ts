import { loginToMyWFGWithCache } from './auto-login-mywfg';
import { loginToTransamericaWithCache, navigateToLifeAccess, fetchPolicyAlerts } from './auto-login-transamerica';
import { notifyOwner } from './_core/notification';
import puppeteer from 'puppeteer';
import { fetchDownlineStatus, syncAgentsFromDownlineStatus, fetchDownlineStatusWithAddresses } from './mywfg-downline-scraper';
import { getDb } from './db';
import * as schema from '../drizzle/schema';

interface SyncResult {
  success: boolean;
  platform: string;
  error?: string;
  data?: any;
  timestamp: Date;
}

// Sync MyWFG data - fetches downline status and updates agent ranks
export async function syncMyWFGData(): Promise<SyncResult> {
  const timestamp = new Date();
  console.log(`[Sync] Starting MyWFG sync at ${timestamp.toISOString()}`);
  
  try {
    // First try to login to establish session
    const loginResult = await loginToMyWFGWithCache();
    
    if (!loginResult.success) {
      console.log('[Sync] Login cache failed, will try direct fetch...');
    }
    
    // Fetch downline status data from MyWFG
    console.log('[Sync] Fetching downline status from MyWFG...');
    const downlineResult = await fetchDownlineStatus();
    
    if (!downlineResult.success) {
      return {
        success: false,
        platform: 'MyWFG',
        error: downlineResult.error || 'Failed to fetch downline status',
        timestamp
      };
    }
    
    console.log(`[Sync] Fetched ${downlineResult.agents.length} agents from MyWFG`);
    
    // Sync agents to database (this updates ranks based on title levels)
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        platform: 'MyWFG',
        error: 'Database not available',
        timestamp
      };
    }
    
    const syncResult = await syncAgentsFromDownlineStatus(db, schema);
    
    if (!syncResult.success) {
      return {
        success: false,
        platform: 'MyWFG',
        error: syncResult.error || 'Failed to sync agents to database',
        timestamp
      };
    }
    
    console.log(`[Sync] MyWFG sync completed - Added: ${syncResult.added}, Updated: ${syncResult.updated}`);
    return {
      success: true,
      platform: 'MyWFG',
      timestamp,
      data: { 
        message: 'Sync completed',
        agentsAdded: syncResult.added,
        agentsUpdated: syncResult.updated,
        totalAgents: downlineResult.agents.length
      }
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
  
  // Send policy anniversary reminders (7 days before)
  try {
    const { getPoliciesWithAnniversaryInDays } = await import('./db');
    const { alertPolicyAnniversary } = await import('./email-alert');
    
    const policiesIn7Days = await getPoliciesWithAnniversaryInDays(7);
    
    if (policiesIn7Days.length > 0) {
      console.log(`[Sync] Found ${policiesIn7Days.length} policies with anniversaries in 7 days`);
      await alertPolicyAnniversary(policiesIn7Days);
      console.log(`[Sync] Sent anniversary reminder email for ${policiesIn7Days.length} policies`);
    } else {
      console.log('[Sync] No policy anniversaries in 7 days');
    }
  } catch (e) {
    console.error('[Sync] Failed to send anniversary reminders:', e);
  }
  
  // Send client anniversary greeting emails (on the anniversary date)
  try {
    const { 
      getPoliciesWithAnniversaryToday, 
      getClientEmailByName, 
      getAgentContactInfo,
      hasAnniversaryGreetingBeenSent,
      recordAnniversaryGreetingSent
    } = await import('./db');
    const { sendClientAnniversaryGreeting } = await import('./email-alert');
    
    const todayAnniversaries = await getPoliciesWithAnniversaryToday();
    const currentYear = new Date().getFullYear();
    
    if (todayAnniversaries.length > 0) {
      console.log(`[Sync] Found ${todayAnniversaries.length} policies with anniversaries TODAY`);
      
      let sentCount = 0;
      let skippedCount = 0;
      let noEmailCount = 0;
      
      for (const policy of todayAnniversaries) {
        // Check if we already sent this greeting this year
        const alreadySent = await hasAnniversaryGreetingBeenSent(policy.policyNumber, currentYear);
        if (alreadySent) {
          skippedCount++;
          continue;
        }
        
        // Parse owner name to get first and last name
        const nameParts = policy.ownerName.split(' ');
        const firstName = nameParts[0] || 'Valued';
        const lastName = nameParts.slice(1).join(' ') || 'Client';
        
        // Look up client email
        const clientEmail = await getClientEmailByName(firstName, lastName);
        
        if (!clientEmail) {
          noEmailCount++;
          console.log(`[Sync] No email found for client: ${policy.ownerName}`);
          continue;
        }
        
        // Get agent contact info
        let agentInfo = { name: 'Your Financial Professional', email: null as string | null, phone: null as string | null };
        if (policy.writingAgentCode) {
          const agentData = await getAgentContactInfo(policy.writingAgentCode);
          if (agentData) {
            agentInfo = agentData;
          }
        }
        
        // Send the greeting email
        const success = await sendClientAnniversaryGreeting({
          email: clientEmail,
          firstName,
          lastName,
          policyNumber: policy.policyNumber,
          policyAge: policy.policyAge,
          faceAmount: policy.faceAmount,
          productType: policy.productType,
          agentName: agentInfo.name,
          agentPhone: agentInfo.phone || undefined,
          agentEmail: agentInfo.email || undefined,
        });
        
        if (success) {
          sentCount++;
          // Record that we sent this greeting
          await recordAnniversaryGreetingSent(policy.policyNumber, currentYear, clientEmail);
        }
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`[Sync] Client anniversary greetings: ${sentCount} sent, ${skippedCount} already sent, ${noEmailCount} no email`);
    } else {
      console.log('[Sync] No policy anniversaries today');
    }
  } catch (e) {
    console.error('[Sync] Failed to send client anniversary greetings:', e);
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

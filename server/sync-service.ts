import { loginToMyWFGWithCache } from './auto-login-mywfg';
import { loginToTransamericaWithCache, navigateToLifeAccess, fetchPolicyAlerts } from './auto-login-transamerica';
import { notifyOwner } from './_core/notification';
import puppeteer from 'puppeteer';
import { launchBrowser } from './lib/browser';
import { fetchDownlineStatus, syncAgentsFromDownlineStatus, fetchDownlineStatusWithAddresses, syncHierarchyFromMyWFG } from './mywfg-downline-scraper';
import { runUnifiedMyWFGSync } from './mywfg-unified-sync';
import { syncExamPrepFromEmail } from './xcel-exam-scraper';
import { getDb } from './db';
import * as schema from '../drizzle/schema';

interface SyncResult {
  success: boolean;
  platform: string;
  error?: string;
  data?: any;
  timestamp: Date;
}

// Sync MyWFG data - uses unified sync with robust OTP handling
export async function syncMyWFGData(): Promise<SyncResult> {
  const timestamp = new Date();
  console.log(`[Sync] Starting MyWFG sync at ${timestamp.toISOString()}`);
  
  try {
    // Use the new unified sync which handles login, OTP, and data fetch in one session
    const result = await runUnifiedMyWFGSync();
    
    if (!result.success) {
      return {
        success: false,
        platform: 'MyWFG',
        error: result.error || 'Failed to sync MyWFG data',
        timestamp
      };
    }
    
    console.log(`[Sync] MyWFG sync completed - Found: ${result.agentsFound}, Updated: ${result.agentsUpdated}`);
    
    // Sync hierarchy (upline relationships) - process in batches of 15
    console.log('[Sync] Starting hierarchy sync...');
    let hierarchyUpdated = 0;
    try {
      const db = await getDb();
      if (db) {
        const hierarchyResult = await syncHierarchyFromMyWFG(db, schema, 15);
        if (hierarchyResult.success) {
          hierarchyUpdated = hierarchyResult.updated;
          console.log(`[Sync] Hierarchy sync completed - Updated: ${hierarchyUpdated} upline relationships`);
        } else {
          console.log(`[Sync] Hierarchy sync failed: ${hierarchyResult.error}`);
        }
      }
    } catch (hierarchyError) {
      console.error('[Sync] Hierarchy sync error:', hierarchyError);
    }
    
    return {
      success: true,
      platform: 'MyWFG',
      timestamp,
      data: { 
        message: 'Sync completed',
        agentsUpdated: result.agentsUpdated,
        hierarchyUpdated,
        totalAgents: result.agentsFound
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
    browser = await launchBrowser({
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

// Sync Exam Prep data from XCEL Solutions emails
export async function syncExamPrepData(): Promise<SyncResult> {
  const timestamp = new Date();
  console.log(`[Sync] Starting Exam Prep sync at ${timestamp.toISOString()}`);
  
  try {
    const result = await syncExamPrepFromEmail();
    
    if (!result.success) {
      return {
        success: false,
        platform: 'XCEL Exam Prep',
        error: result.error || 'Failed to sync exam prep data',
        timestamp
      };
    }
    
    console.log(`[Sync] Exam Prep sync completed - Found: ${result.recordsFound}, Matched: ${result.recordsMatched}, Created: ${result.recordsCreated}, Updated: ${result.recordsUpdated}`);
    
    // Notify about unmatched agents if any
    if (result.unmatchedAgents.length > 0) {
      console.log(`[Sync] Unmatched agents: ${result.unmatchedAgents.join(', ')}`);
    }
    
    return {
      success: true,
      platform: 'XCEL Exam Prep',
      timestamp,
      data: {
        recordsFound: result.recordsFound,
        recordsMatched: result.recordsMatched,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        unmatchedAgents: result.unmatchedAgents
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Exam Prep sync failed:', errorMessage);
    return {
      success: false,
      platform: 'XCEL Exam Prep',
      error: errorMessage,
      timestamp
    };
  }
}

// Scheduled sync runner
export async function scheduledSync() {
  console.log('[Sync] Running scheduled sync...');
  const results = await runFullSync();
  setLastSyncTime(new Date());
  return results;
}

// Scheduled exam prep sync runner (8am EST daily)
export async function scheduledExamPrepSync() {
  console.log('[Sync] Running scheduled exam prep sync (8am EST)...');
  const result = await syncExamPrepData();
  
  // Send notification about sync results
  if (result.success && result.data) {
    const { recordsFound, recordsMatched, unmatchedAgents } = result.data;
    if (recordsFound > 0) {
      await notifyOwner({
        title: 'Exam Prep Sync Complete',
        content: `Found ${recordsFound} exam prep records, matched ${recordsMatched} to agents.${unmatchedAgents.length > 0 ? `\n\nUnmatched agents: ${unmatchedAgents.join(', ')}` : ''}`
      });
    }
  } else if (!result.success) {
    await notifyOwner({
      title: 'Exam Prep Sync Failed',
      content: `Failed to sync exam prep data: ${result.error}`
    });
  }
  
  return result;
}

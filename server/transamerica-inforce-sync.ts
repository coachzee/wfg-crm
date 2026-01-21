/**
 * Transamerica Inforce Policy Sync Service
 * 
 * This service syncs inforce (active/issued) policies from Transamerica Life Access
 * to populate the Production dashboard with real commission data.
 * 
 * Commission Formula: Target Premium × 125% × Agent Level × Split
 * 
 * Scheduled to run at 3:30 PM EST and 6:30 PM EST daily.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { getDb } from './db';
import { inforcePolicies, syncLogs, agents } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { startOTPSession, waitForOTPWithSession, getTransamericaCredentials } from './gmail-otp-v2';

// Environment variables
const TA_USERNAME = process.env.TRANSAMERICA_USERNAME || 'larex3030';
const TA_PASSWORD = process.env.TRANSAMERICA_PASSWORD || 'Jesulob@1241';
const SECURITY_Q_FIRST_JOB = process.env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY || 'lagos';
const SECURITY_Q_PET = process.env.TRANSAMERICA_SECURITY_Q_PET_NAME || 'bingo';

// Commission constants
const TRANSAMERICA_MULTIPLIER = 1.25; // 125%
const DEFAULT_AGENT_LEVEL = 0.65; // 65% default for SMD level agents (per official WFG compensation grid)

interface InforcePolicyData {
  policyNumber: string;
  ownerName: string;
  productType: string;
  issueState: string;
  faceAmount: number;
  premium: number;
  premiumFrequency: string;
  premiumDueDate: string;
  expiryDate: string;
  status: string;
}

interface PolicyDetailData {
  writingAgentName: string;
  writingAgentCode: string;
  writingAgentSplit: number;
  overwritingAgents: Array<{
    name: string;
    code: string;
    split: number | null;
    role: string;
  }>;
}

interface SyncResult {
  success: boolean;
  policiesProcessed: number;
  policiesCreated: number;
  policiesUpdated: number;
  totalPremium: number;
  totalCommission: number;
  errors: string[];
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse currency string to number
 */
function parseCurrency(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(/[$,]/g, '')) || 0;
}

/**
 * Calculate commission based on WFG formula
 */
function calculateCommission(
  targetPremium: number,
  agentLevel: number = DEFAULT_AGENT_LEVEL,
  split: number = 100
): number {
  return targetPremium * TRANSAMERICA_MULTIPLIER * agentLevel * (split / 100);
}

/**
 * Login to Transamerica secure portal (V2 - session-based OTP)
 */
async function loginToTransamerica(page: Page): Promise<boolean> {
  console.log('[TA Inforce] Navigating to Transamerica login...');
  
  try {
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await delay(2000);
    
    // START OTP SESSION BEFORE TRIGGERING LOGIN
    console.log('[TA Inforce] Starting OTP session before login...');
    const otpSessionId = startOTPSession('transamerica');
    const gmailCreds = getTransamericaCredentials();
    
    // Fill login form using specific selectors
    console.log('[TA Inforce] Filling login credentials...');
    await page.evaluate((username: string, password: string) => {
      const userInput = document.querySelector('input[name="USER"]') as HTMLInputElement;
      const passInput = document.querySelector('input[name="PASSWORD"]') as HTMLInputElement;
      if (userInput) userInput.value = username;
      if (passInput) passInput.value = password;
    }, TA_USERNAME, TA_PASSWORD);
    
    // Click login button - this triggers the OTP email
    console.log('[TA Inforce] Clicking login button (this triggers OTP)...');
    await page.click('button[type="submit"]');
    await delay(5000);
    
    // Check for OTP page
    const pageContent = await page.content();
    if (pageContent.includes('Extra Security Step')) {
      console.log('[TA Inforce] OTP verification required...');
      
      // Select email option and click send
      await page.click('input[value="email"]');
      await page.click('button[type="submit"]');
      
      // Wait for OTP using the session we started BEFORE login
      console.log('[TA Inforce] Waiting for OTP (session-based, 180s timeout)...');
      const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3);
      
      if (!otpResult.success || !otpResult.otp) {
        console.error('[TA Inforce] Failed to retrieve OTP:', otpResult.error);
        return false;
      }
      
      const otp = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
      console.log(`[TA Inforce] OTP received: ${otp}, entering code...`);
      await page.type('input[type="text"]', otp);
      await page.click('button[type="submit"]');
      await delay(5000);
    }
    
    // Check for security question
    const securityContent = await page.content();
    if (securityContent.includes('Unrecognized Device') || securityContent.includes('security question')) {
      console.log('[TA Inforce] Security question detected...');
      
      let answer = '';
      if (securityContent.toLowerCase().includes('first job')) {
        answer = SECURITY_Q_FIRST_JOB;
      } else if (securityContent.toLowerCase().includes('pet')) {
        answer = SECURITY_Q_PET;
      }
      
      if (answer) {
        await page.type('input[type="text"]', answer);
        
        // Check "Remember this device"
        const checkboxes = await page.$$('input[type="checkbox"]');
        for (const checkbox of checkboxes) {
          await checkbox.click();
        }
        
        await page.click('button[type="submit"]');
        await delay(5000);
      }
    }
    
    console.log('[TA Inforce] Login completed');
    return true;
  } catch (error) {
    console.error('[TA Inforce] Login failed:', error);
    return false;
  }
}

/**
 * Navigate to Life Access and get inforce policies list
 */
async function navigateToLifeAccess(page: Page): Promise<boolean> {
  console.log('[TA Inforce] Navigating to Life Access...');
  
  try {
    await delay(3000);
    
    // Click Launch for Transamerica Life Access
    const launchButtons = await page.$$('button');
    for (const btn of launchButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Launch')) {
        await btn.click();
        break;
      }
    }
    
    await delay(5000);
    
    // Navigate directly to inforce list
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyList?type=inforce', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await delay(3000);
    console.log('[TA Inforce] Navigated to Inforce policies list');
    return true;
  } catch (error) {
    console.error('[TA Inforce] Navigation failed:', error);
    return false;
  }
}

/**
 * Extract all policies from the list (handles pagination)
 */
async function extractPolicyList(page: Page): Promise<InforcePolicyData[]> {
  console.log('[TA Inforce] Extracting policy list...');
  
  const allPolicies: InforcePolicyData[] = [];
  let hasMorePages = true;
  let currentPage = 1;
  
  while (hasMorePages) {
    console.log(`[TA Inforce] Processing page ${currentPage}...`);
    await delay(2000);
    
    // Extract policies from current page
    const pagePolicies = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      const policies: InforcePolicyData[] = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 8) {
          const statusCell = cells[0]?.textContent?.trim() || '';
          const policyNumber = cells[1]?.textContent?.trim() || '';
          const ownerName = cells[2]?.textContent?.trim() || '';
          const productType = cells[3]?.textContent?.trim() || '';
          const state = cells[4]?.textContent?.trim() || '';
          const faceAmount = cells[5]?.textContent?.trim() || '';
          const premium = cells[6]?.textContent?.trim() || '';
          const premiumDue = cells[7]?.textContent?.trim() || '';
          const expiry = cells[8]?.textContent?.trim() || '';
          
          // Only process if we have a valid policy number
          if (policyNumber && /^\d+$/.test(policyNumber)) {
            policies.push({
              policyNumber,
              ownerName,
              productType,
              issueState: state,
              faceAmount: parseFloat(faceAmount.replace(/[$,]/g, '')) || 0,
              premium: parseFloat(premium.replace(/[$,]/g, '')) || 0,
              premiumFrequency: premiumDue.includes('/') ? 'Annual' : 'Flexible',
              premiumDueDate: premiumDue,
              expiryDate: expiry,
              status: statusCell.includes('Active') ? 'Active' : 
                      statusCell.includes('Surrender') ? 'Surrendered' :
                      statusCell.includes('Free Look') ? 'Free Look Surrender' : 'Active'
            });
          }
        }
      });
      
      return policies;
    });
    
    allPolicies.push(...pagePolicies);
    console.log(`[TA Inforce] Found ${pagePolicies.length} policies on page ${currentPage}`);
    
    // Check for next page
    const nextButton = await page.$('button[id="btnNextPage"]:not([disabled])');
    if (nextButton && currentPage < 10) {
      await nextButton.click();
      await delay(2000);
      currentPage++;
    } else {
      hasMorePages = false;
    }
  }
  
  console.log(`[TA Inforce] Total policies extracted: ${allPolicies.length}`);
  return allPolicies;
}

/**
 * Extract writing agent details from policy detail page
 */
async function extractPolicyDetails(page: Page, policyNumber: string): Promise<PolicyDetailData | null> {
  try {
    await page.goto(`https://lifeaccess.transamerica.com/app/lifeaccess#/display/Inforce/${policyNumber}/Inforce`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await delay(2000);
    
    const details = await page.evaluate(() => {
      const content = document.body.innerText;
      const producers: Array<{name: string; code: string; split: number | null; role: string}> = [];
      
      // Parse producer information
      const producerSection = content.split('Producers')[1]?.split('Financial')[0] || '';
      const lines = producerSection.split('\n').filter(l => l.trim());
      
      let currentProducer: any = {};
      for (const line of lines) {
        if (line.includes('Name')) {
          if (currentProducer.name) producers.push(currentProducer);
          currentProducer = { name: '', code: '', split: null, role: '' };
        }
        if (line.match(/^[A-Z\s\-]+$/) && !line.includes('Name') && !line.includes('Role')) {
          currentProducer.name = line.trim();
        }
        if (line.includes('Producer Number')) {
          const match = line.match(/([A-Z0-9]+)$/);
          if (match) currentProducer.code = match[1];
        }
        if (line.includes('Role')) {
          currentProducer.role = line.replace('Role', '').trim();
        }
        if (line.includes('Split')) {
          const match = line.match(/(\d+)%/);
          if (match) currentProducer.split = parseInt(match[1]);
        }
      }
      if (currentProducer.name) producers.push(currentProducer);
      
      // Find writing agent
      const writingAgent = producers.find(p => p.role?.toLowerCase().includes('writing')) || producers[0];
      const overwritingAgents = producers.filter(p => !p.role?.toLowerCase().includes('writing'));
      
      return {
        writingAgentName: writingAgent?.name || 'Unknown',
        writingAgentCode: writingAgent?.code || '',
        writingAgentSplit: writingAgent?.split || 100,
        overwritingAgents
      };
    });
    
    return details;
  } catch (error) {
    console.error(`[TA Inforce] Error extracting details for ${policyNumber}:`, error);
    return null;
  }
}

/**
 * Main sync function - syncs all inforce policies from Transamerica
 */
export async function syncInforcePolicies(scheduledTime?: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    policiesProcessed: 0,
    policiesCreated: 0,
    policiesUpdated: 0,
    totalPremium: 0,
    totalCommission: 0,
    errors: []
  };
  
  const db = await getDb();
  if (!db) {
    result.errors.push('Database connection failed');
    return result;
  }
  
  // Create sync log entry
  const [syncLog] = await db.insert(syncLogs).values({
    syncType: 'TRANSAMERICA_INFORCE',
    scheduledTime: scheduledTime || 'Manual',
    status: 'RUNNING',
    startedAt: new Date(),
  }).$returningId();
  
  let browser: Browser | null = null;
  
  try {
    console.log('[TA Inforce] Starting inforce policies sync...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login
    const loginSuccess = await loginToTransamerica(page);
    if (!loginSuccess) {
      throw new Error('Failed to login to Transamerica');
    }
    
    // Navigate to Life Access
    const navSuccess = await navigateToLifeAccess(page);
    if (!navSuccess) {
      throw new Error('Failed to navigate to Life Access');
    }
    
    // Extract policy list
    const policies = await extractPolicyList(page);
    result.policiesProcessed = policies.length;
    
    // Get all agents for matching
    const allAgents = await db.select().from(agents);
    const agentMap = new Map(allAgents.map((a: typeof allAgents[0]) => [
      `${a.firstName} ${a.lastName}`.toUpperCase(),
      a
    ]));
    
    // Process each policy
    for (const policy of policies) {
      try {
        // Calculate annual premium (assume monthly if "Flexible")
        let annualPremium = policy.premium;
        if (policy.premiumFrequency === 'Flexible') {
          // Flexible usually means annual target premium is the listed amount
          annualPremium = policy.premium;
        }
        
        // Calculate commission with default values
        const commission = calculateCommission(annualPremium, DEFAULT_AGENT_LEVEL, 100);
        
        result.totalPremium += annualPremium;
        result.totalCommission += commission;
        
        // Check if policy exists
        const existing = await db.select()
          .from(inforcePolicies)
          .where(eq(inforcePolicies.policyNumber, policy.policyNumber))
          .limit(1);
        
        // Try to match agent by owner name (for self-policies)
        const matchedAgent = agentMap.get(policy.ownerName.toUpperCase());
        
        const policyData = {
          policyNumber: policy.policyNumber,
          ownerName: policy.ownerName,
          productType: policy.productType,
          issueState: policy.issueState,
          faceAmount: policy.faceAmount.toString(),
          premium: policy.premium.toString(),
          premiumFrequency: policy.premiumFrequency,
          annualPremium: annualPremium.toString(),
          calculatedCommission: commission.toString(),
          premiumDueDate: policy.premiumDueDate,
          expiryDate: policy.expiryDate,
          status: policy.status as any,
          writingAgentName: 'Unknown', // Will be updated with detail extraction
          writingAgentSplit: 100,
          writingAgentLevel: DEFAULT_AGENT_LEVEL.toString(),
          agentId: matchedAgent?.id || null,
          lastSyncedAt: new Date(),
        };
        
        if (existing.length > 0) {
          await db.update(inforcePolicies)
            .set(policyData)
            .where(eq(inforcePolicies.policyNumber, policy.policyNumber));
          result.policiesUpdated++;
        } else {
          await db.insert(inforcePolicies).values(policyData);
          result.policiesCreated++;
        }
      } catch (error: any) {
        result.errors.push(`Policy ${policy.policyNumber}: ${error.message}`);
      }
    }
    
    result.success = true;
    console.log(`[TA Inforce] Sync completed: ${result.policiesCreated} created, ${result.policiesUpdated} updated`);
    
  } catch (error: any) {
    console.error('[TA Inforce] Sync failed:', error);
    result.errors.push(error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    
    // Update sync log
    const endTime = new Date();
    const startTime = syncLog ? new Date() : new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    await db.update(syncLogs)
      .set({
        status: result.success ? 'SUCCESS' : 'FAILED',
        completedAt: endTime,
        durationSeconds: duration,
        agentsProcessed: result.policiesProcessed,
        agentsCreated: result.policiesCreated,
        agentsUpdated: result.policiesUpdated,
        errorsCount: result.errors.length,
        errorMessages: result.errors.length > 0 ? result.errors : null,
        summary: `Processed ${result.policiesProcessed} policies. Total Premium: $${result.totalPremium.toLocaleString()}. Total Commission: $${result.totalCommission.toLocaleString()}.`,
      })
      .where(eq(syncLogs.id, (syncLog as any).id));
  }
  
  return result;
}

/**
 * Schedule sync at specific times (3:30 PM and 6:30 PM EST)
 */
export function scheduleInforceSync(): void {
  const schedule = require('node-schedule');
  
  // 3:30 PM EST (20:30 UTC in winter, 19:30 UTC in summer)
  // Using America/New_York timezone
  const rule330 = new schedule.RecurrenceRule();
  rule330.hour = 15;
  rule330.minute = 30;
  rule330.tz = 'America/New_York';
  
  // 6:30 PM EST
  const rule630 = new schedule.RecurrenceRule();
  rule630.hour = 18;
  rule630.minute = 30;
  rule630.tz = 'America/New_York';
  
  schedule.scheduleJob(rule330, () => {
    console.log('[TA Inforce] Running scheduled sync at 3:30 PM EST');
    syncInforcePolicies('3:30 PM EST');
  });
  
  schedule.scheduleJob(rule630, () => {
    console.log('[TA Inforce] Running scheduled sync at 6:30 PM EST');
    syncInforcePolicies('6:30 PM EST');
  });
  
  console.log('[TA Inforce] Scheduled syncs at 3:30 PM and 6:30 PM EST');
}

export default {
  syncInforcePolicies,
  scheduleInforceSync,
};
